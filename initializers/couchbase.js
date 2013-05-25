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
                if(typeof self._configure == "function"){
                  self.configure(function(err){
                    callback(err);
                  });
                }else{
                  callback(null);
                }
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

  api.couchbase.structure.prototype.addChild = function(suffix, data, callback, overwrite){
    var self = this;
    if(typeof data === 'function'){ callback = data; data = null; }
    if(data == null){ data = {}; }
    var childKey = self.key + self.keySeperator() + suffix;
    self.childExists(suffix, function(err, exists){
      if(err != null){
        callback(err);
      }else if(exists === true && overwrite !== true){
        callback(new Error("child already exists"));
      }else{
        self.bucket.set(childKey, data, function(err){
          if(err != null){
            callback(err)
          }else{
            self.metadata.childKeys.push(suffix);
            self.touch(function(err){
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
            self.touch(function(err){
              callback(err);
            });
          }
        });
      }
    });
  }

  api.couchbase.structure.prototype.getChild = function(suffix, callback){
    var self = this;
    var childKey = self.key + self.keySeperator() + suffix;
    self.childExists(suffix, function(err, exists){
      if(err != null){
        callback(err);
      }else if(exists === false){
        callback(new Error("child does not exist"));
      }else{
        self.bucket.get(childKey, function(err, doc, metadata){
          if(err != null){
            callback(err);
          }else{
            callback(null, doc);
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

  api.couchbase.array = function(key, bucket){
      api.couchbase.structure.call(this, key, bucket);
  }

  api.couchbase.array.length = function(callback){
    var self = this;
    self.getCount(function(err, count){
      callback(err, count);
    });
  }

  api.couchbase.array.get = function(index, callback){
    var self = this;
    index = Math.abs(parseInt(index));
    self.length(function(err, length){
      if(err != null){
        callback(err);
      }else if(index > length){
        callback(new Error("index out of bounds"));
      }else{
        self.getChild(index, function(err, doc){
          callback(err, doc);
        });
      }
    });
  }

  api.couchbase.array.set = function(index, data, callback){
    var self = this;
    index = Math.abs(parseInt(index));
    self.length(function(err, length){
      if(err != null){
        callback(err);
      }else{
        self.addChild(index, function(err, doc){
          if(err != null){
            callback(err);
          }else{
            if(index > length){
              self.forceCounter(index, function(err){
                self.touch(function(err){
                  callback(err, doc);
                });
              });
            }else{
              self.touch(function(err){
                callback(err, doc);
              });
            }
          }
        });
      }
    });
  }

  api.couchbase.array.getAll = function(callback){
    var self = this;
    self.length(function(err, length){
      if(err != null){
        callback(err);
      }else if(length === 0){
        callback(null, []);
      }else{
        var i = 0;
        var response = [];
        var found = 0;
        while(i <= length){
          (function(i){
            self.get(i, function(err, data){
              found++;
              response[i] = data;
              if(found == length){
                callback(null, response);
              }
            });
          })(i)
          i++;
        }
      }
    });
  }

  ///////////
  // List //
  ///////////

  /*
  Assuming a list called "key":

  - key (the main document, holds metadata & timestamps)
  - key:_counter (counter for this document; used as the array index and length)
  - key:_readCounter (counter for reading)
  - key:0 element at position 0
  - key:n element at position n
  */

  api.couchbase.queue = function(key, bucket){
      api.couchbase.structure.call(this, key, bucket);
  }

  api.couchbase.queue._configure = function(callback){
    var self = this;
    self.addChild("_readCounter", 0, function(err){
      callback(err);
    });
  }

  api.couchbase.queue.length = function(callback){
    var self = this;
    self.getCount(function(err, count){
      if(err != null){
        callback(err)
      }else{
        self.getChild("_readCounter", function(err, readCount){
          var length = count - readCount;
          callback(err, length);
        });
      }
    });
  }

  api.couchbase.queue.pop = function(callback){
    var self = this;
    var readCounterKey = self.key + self.keySeperator() + "_readCounter";
    self.bucket.incr(readCounterKey, function(err, readCount){
      if(err != null){
        callback(err);
      }else{
        self.getChild(readCount, function(err, data){
          if(err != null){
            callback(err);
          }else{
            self.removeChild(readCount, function(err){
              callback(err, data)
            });
          }
        });
      }
    });
  }

  api.couchbase.queue.push = function(data, callback){
    var self = this;
    self.incr(function(err, count){
      if(err != null){
        callback(err);
      }else{
        self.addChild("count", data, function(err){
          callback(err);
        });
      }
    });
  }

  api.couchbase.queue.getAll = function(callback){
    var self = this;
    self.getCount(function(err, count){
      if(err != null){
        callback(err)
      }else{
        self.getChild("_readCounter", function(err, readCount){
          if(err != null){
            callback(err)
          }else{
            var length = count - readCount;
            var i = count;
            var completed = 0;
            var data = [];
            while(i <= readCount){
              (function(i){
                self.getChild(i, function(err, doc){
                  data[i] = doc;
                  completed++;
                  if(completed == length){
                    callback(err, data);
                  }
                });
              })(i)
              i++;
            }
          }
        });
      }
    });
  }

  ///////////
  // Hash //
  ///////////

  /*
  Assuming a hash called "key":

  - key (the main document, holds metadata & timestamps)
  - key:_counter (unused)
  - key:aaa element at key aaa
  - key:nnn element at position nnn
  */

  api.couchbase.hash = function(key, bucket){
      api.couchbase.structure.call(this, key, bucket);
  }

  api.couchbase.hash.keys = function(callback){
    self.load(function(err){
      if(err != null){
        callback(err);
      }else{
        var keys = [];
        var counterKey = self.key + self.keySeperator() + self.counterPrefix();
        self.metadata.childKey.forEach(function(childKey){
          if(childKey != counterKey){
            keys.push(childKey);
          }
          // keys.sort();
          callback(null, keys);
        });
      }
    });
  };

  api.couchbase.hash.length = function(callback){
    var self = this;
    self.keys(function(err, keys){
      var length;
      if(keys != null){ length = keys.length; }
      callback(err, length);
    });
  }

  api.couchbase.hash.get = function(key, callback){
    var self = this;
    self.childExists(key, function(err, exists){
      if(err != null){
        callback(err);
      }else if(exists === false){
        callback(new Error("key does not exist"))
      }else{
        self.getChild(function(err, data){
          callback(err, data, key);
        });
      }
    });
  }

  api.couchbase.hash.set = function(key, data, callback){
    var self = this;
    self.addChild(key, data, function(err){
      callback(err);
    }, true);
  }

  api.couchbase.hash.getAll = function(callback){
    var self = this;
    self.keys(function(err, keys){
      if(err != null){
        callback(err);
      }else{
        var count = 0;
        var data = {};
        keys.forEach(function(key){
          count++;
          data[key] = null;
          self.get(key, function(err, doc, key){
            if(key != null){
              data[key] = doc;
            }
            count--;
            if(count === 0){
              callback(null, data);
            }
          });
        });
      }
    });
  }

  next();
}