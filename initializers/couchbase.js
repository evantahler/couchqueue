var couchbase = require("couchbase")

exports.couchbase = function(api, next){
  api.couchbase = {
    _start: function(api, next){
      couchbase.connect(api.configData.couchbase, function(err, bucket){
        if(err){ 
          api.log(err, "error"); 
          console.log(error);
          process.exit();
        }else{
          api.couchbase.bucket = bucket;
          next();
        }
      });
    },

    _teardown: function(api, next){
      next();
    },
  };

  ////////////////////
  // Base Structure //
  ////////////////////

/*
Documents and Metata
Assuming a key called "key":

- key (the main document, holds metadata & timestamps)
- key:_counter (counter for this document)
*/

  api.couchbase.structure = function(key, bucket){
    var self = this;
    if(key == null){ throw new Error("key is required"); }
    self.key = key;
    if(bucket == null){ bucket = api.couchbase.bucket; } // ovveride
    self.bucket = bucket;  // couchbase bucket object
    self.type = "structure"
    self.metadata = self.generateDefaultState();
  }

  api.couchbase.structure.prototype.counterPrefix = function(){
    return "_counter";
  }

  api.couchbase.structure.prototype.keySeperator = function(){
    return ":";
  }

  api.couchbase.structure.prototype.create = function(callback){
    var self = this;
    self.exists(function(err, existing){
      if(err){
        callback(err);
      }else if(existing === true){
        callback(new Error("document already exists"));
      }else{
        self.save(function(err){
          if(err){
            callback(err);
          }else{
            self.bucket.set(self.key + self.keySeperator() + self.counterPrefix(), 0, function(err){
              if(err){
                callback(err);
              }else{
                callback(null);
              }
            });
          }
        });
      }
    });
  }

  api.couchbase.structure.prototype.save = function(callback){
    var self = this;
    self.bucket.set(self.key, self.metadata, function(err, meta){
      if(err != null){
        callback(err);
      }else{
        callback(null);
      }
    });
  }

  api.couchbase.structure.prototype.generateDefaultState = function(){
    var self = this;
    return {
      createdAt: new Date().getTime(), 
      updatedAt: new Date().getTime(),
      type: this.type,
      childKeys: [
        self.key + self.keySeperator() + self.counterPrefix(),
      ],
    }
  };

  api.couchbase.structure.prototype.touch = function(callback){
    var self = this;
    self.metadata.updatedAt = new Date().getTime();
    self.save(callback);
  }

  api.couchbase.structure.prototype.load = function(callback){
    var self = this;
    self.bucket.get(self.key, function(err, doc, meta){
      if(err != null){
        callback(err, null);
      }else{
        self.metadata = doc;
        callback(null, doc);
      }
    });
  }

  api.couchbase.structure.prototype.getCount = function(callback){
    var self = this;
    var counterKey = self.key + self.keySeperator() + self.counterPrefix();
    self.bucket.get(counterKey, function(err, value, meta){
      if(err != null){
        callback(err, null);
      }else{
        callback(null, parseInt(value));
      }
    });
  }

  api.couchbase.structure.prototype.incr = function(offset, callback){
    var self = this;
    if(offset == null){ offset = 1; }
    var counterKey = self.key + self.keySeperator() + self.counterPrefix();
    self.bucket.incr(counterKey, {offset: parseInt(offset)}, function(err, value, meta){
      if(err != null){
        callback(err, null);
      }else{
        self.touch(function(){
          callback(null, parseInt(value));
        });
      }
    });
  }

  api.couchbase.structure.prototype.forceCounter = function(value, callback){
    var self = this;
    value = parseInt(value)
    var counterKey = self.key + self.keySeperator() + self.counterPrefix();
    self.bucket.set(counterKey, value, function(err, meta){
      self.bucket.get(counterKey, function(err, value, meta){
        if(err != null){
          callback(err, null);
        }else{
          self.touch(function(){
            callback(null, parseInt(value));
          });
        }
      });
    });
  }

  api.couchbase.structure.prototype.exists = function(callback){
    var self = this;
    self.bucket.get(self.key, function(err, doc, meta){
      if(err != null && String(err) != "Error: No such key"){
        callback(err, null);
      }else if(doc != null){
        callback(null, true);
      }else{
        callback(null, false);
      }
    });
  }

  api.couchbase.structure.prototype.addChild = function(suffix, data, callback){
    var self = this;
    if(typeof data === 'function'){ callback = data; data = null; }
    if(data == null){ data = {}; }
    var childKey = self.key + self.keySeperator() + suffix;
    self.childExists(suffix, function(err, exists){
      if(err != null){
        callback(err);
      }else if(exists === true){
        callback(new Error("child already exists"));
      }else{
        self.bucket.set(childKey, data, function(err){
          if(err != null){
            callback(err)
          }else{
            self.metadata.childKeys.push(suffix);
            self.save(function(err){
              callback(err);
            });
          }
        });
      }
    });
  }

  api.couchbase.structure.prototype.removeChild = function(suffix, callback){
    var self = this;
    var childKey = self.key + self.keySeperator() + suffix;
    self.childExists(suffix, function(err, exists){
      if(err != null){
        callback(err);
      }else if(exists === false){
        callback(new Error("child does not exist"));
      }else{
        self.bucket.remove(childKey, function(err){
          if(err != null){
            callback(err)
          }else{
            self.metadata.childKeys.splice(self.metadata.childKeys.indexOf(suffix), 1);
            self.save(function(err){
              callback(err);
            });
          }
        });
      }
    });
  }

  api.couchbase.structure.prototype.childExists = function(suffix, callback){
    var self = this;
    var childKey = self.key + self.keySeperator() + suffix;
    self.bucket.get(childKey, function(err, doc, meta){
      if(err != null && String(err) != "Error: No such key"){
        callback(err, null);
      }else if(doc != null){
        callback(null, true);
      }else{
        callback(null, false);
      }
    });
  }

  api.couchbase.structure.prototype.destroy = function(callback){
    var self = this;
    var count = 0;
    if(self.metadata.childKeys.length === 0){
      self.bucket.remove(self.key, function(err){
        callback(err);
      });
    }else{
      self.metadata.childKeys.forEach(function(child){
        count++;
        self.bucket.remove(child, function(){
          count--;
          if(count === 0){
            self.bucket.remove(self.key, function(err){
              callback(err);
            });
          }
        });
      });
    }
  }

  ///////////
  // Array //
  ///////////

  /*
  Assuming an array called "key":

  - key (the main document, holds metadata & timestamps)
  - key:_counter (counter for this document; used as the array index and length)
  - key:0 element at position 0
  - key:n element at position n
  */

  api.couchbase.array.prototype = new api.couchbase.structure;

  api.couchbase.array.length = function(callback){

  }

  api.couchbase.array.get = function(index, callback){
    
  }

  api.couchbase.array.set = function(index, data, callback){
    
  }

  api.couchbase.array.pop = function(){
    
  }

  api.couchbase.array.push = function(data, callback){
    
  }

  api.couchbase.array.compact = function(callback){
    
  }

  next();
}