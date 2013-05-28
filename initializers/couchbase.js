var couchbase = require("couchbase");
var util = require("util");

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

  api.couchbase.structure = function(key, bucket, type){
    var self = this;
    if(key == null){ throw new Error("key is required"); }
    self.key = key;
    if(bucket == null){ bucket = api.couchbase.bucket; } // overide
    self.bucket = bucket;  // couchbase bucket object
    if(type == null){ type = "structure" }
    self.type = type;
    self.metadata = self.generateDefaultState();
  }

  api.couchbase.structure.prototype.counterPrefix = function(){
    return "_counter";
  }

  api.couchbase.structure.prototype.keySeperator = function(){
    return ":";
  }

  api.couchbase.structure.prototype.create = function(callback, ignoreDuplicateCreate){
    if(ignoreDuplicateCreate == null){ ignoreDuplicateCreate = false; }
    var self = this;
    self.exists(function(err, existing){
      if(err){
        if(typeof callback === "function"){ callback(err); }
      }else if(existing === true){
        if(ignoreDuplicateCreate === true){
          if(typeof callback === "function"){ callback(null); }
        }else{
          if(typeof callback === "function"){ callback(new Error("document already exists: " + self.key)); }
        }
      }else{
        self.save(function(err){
          if(err){
            if(typeof callback === "function"){ callback(err); }
          }else{
            self.bucket.set(self.key + self.keySeperator() + self.counterPrefix(), 0, function(err){
              if(err){
                if(typeof callback === "function"){ callback(err); }
              }else{
                if(typeof self._configure == "function"){
                  self._configure(function(err){
                    if(typeof callback === "function"){ callback(err); }
                  });
                }else{
                  if(typeof callback === "function"){ callback(null); }
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
        if(typeof callback === "function"){ callback(err); }
      }else{
        if(typeof callback === "function"){ callback(null); }
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
        self.counterPrefix(),
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
    if(typeof offset == "function"){ callback = offset; offset = null; }
    if(offset == null){ offset = 1; }
    var counterKey = self.key + self.keySeperator() + self.counterPrefix();
    self.bucket.incr(counterKey, {offset: parseInt(offset)}, function(err, value, meta){
      if(err != null){
        callback(err, null);
      }else{
        self.touch(function(){
          if(typeof callback === "function"){ callback(null, parseInt(value)); }
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
          if(typeof callback === "function"){ callback(err, null); }
        }else{
          self.touch(function(){
            if(typeof callback === "function"){ callback(null, parseInt(value)); }
          });
        }
      });
    });
  }

  api.couchbase.structure.prototype.exists = function(callback){
    var self = this;
    self.bucket.get(self.key, function(err, doc, meta){
      if(err != null && String(err) != "Error: No such key: " + self.key){
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
    suffix = String(suffix);
    if(typeof data === 'function'){ callback = data; data = null; }
    if(data == null){ data = {}; }
    var childKey = self.key + self.keySeperator() + suffix;
    self.childExists(suffix, function(err, exists){
      if(err != null){
        if(typeof callback === "function"){ callback(err); }
      }else if(exists === true && overwrite !== true){
        if(typeof callback === "function"){ callback(new Error("child already exists")); }
      }else{
        self.bucket.set(childKey, data, function(err){
          if(err != null){
            if(typeof callback === "function"){ callback(err); }
          }else{
            self.metadata.childKeys.push(suffix);
            self.touch(function(err){
              if(typeof callback === "function"){ callback(err); }
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
      if(err != null && String(err) != "Error: No such key: " + suffix){
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
    self.load(function(err){
      if(err != null){
        callback(err);
      }else if(self.metadata.childKeys.length === 0){
        self.bucket.remove(self.key, function(err){
          callback(err);
        });
      }else{
        var count = 0;
        self.metadata.childKeys.forEach(function(suffix){
          count++;
          var childKey = self.key + self.keySeperator() + suffix;
          self.bucket.remove(childKey, function(err){
            count--;
            if(count === 0){
              self.bucket.remove(self.key, function(err){
                callback(err);
              });
            }
          });
        });
      }
    });
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
      api.couchbase.structure.call(this, key, bucket, "array");
  }
  util.inherits(api.couchbase.array, api.couchbase.structure);

  api.couchbase.array.prototype.length = function(callback){
    var self = this;
    self.getCount(function(err, count){
      callback(err, count);
    });
  }

  api.couchbase.array.prototype.get = function(index, callback){
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

  api.couchbase.array.prototype.set = function(index, data, callback){
    var self = this;
    index = Math.abs(parseInt(index));
    self.length(function(err, length){
      if(err != null){
        callback(err);
      }else{
        self.addChild(index, data, function(err){
          if(err != null){
            callback(err);
          }else{
            if(index >= length){
              self.forceCounter(index + 1, function(err){
                self.touch(function(err){
                  if(typeof callback === "function"){ callback(err); }
                });
              });
            }else{
              self.touch(function(err){
                if(typeof callback === "function"){ callback(err); }
              });
            }
          }
        });
      }
    });
  }

  api.couchbase.array.prototype.getAll = function(callback){
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
        while(i < length){
          (function(i){
            self.get(i, function(err, data){
              found++;
              response[i] = data;
              if(found === length){
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
  // QUEUE //
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
      api.couchbase.structure.call(this, key, bucket, "queue");
  }
  util.inherits(api.couchbase.queue, api.couchbase.structure);

  api.couchbase.queue.prototype._configure = function(callback){
    var self = this;
    self.addChild("_readCounter", 0, function(err){
      callback(err);
    });
  }

  api.couchbase.queue.prototype.length = function(callback){
    var self = this;
    self.load(function(err){
      if(err != null){
        callback(err);
      }else{
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
    });
  }

  api.couchbase.queue.prototype.pop = function(callback){
    var self = this;
    var readCounterKey = self.key + self.keySeperator() + "_readCounter";
    self.bucket.incr(readCounterKey, function(err, readCount){
      if(err != null){
        callback(err);
      }else{
        self.getChild(readCount, function(err, data){
          if(err != null && String(err) === "Error: child does not exist" ){
            callback(null, null); // none left to pop
          }else if(err != null){
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

  api.couchbase.queue.prototype.push = function(data, callback){
    var self = this;
    self.incr(function(err, count){
      if(err != null){
        callback(err);
      }else{
        self.addChild(count, data, function(err){
          if(typeof callback === "function"){ callback(err); }
        });
      }
    });
  }

  api.couchbase.queue.prototype.getAll = function(callback){
    var self = this;
    self.load(function(err){
      if(err){
        callback(err);
      }else{
        self.getCount(function(err, count){
          if(err != null){
            callback(err)
          }else if(count === 0){
            callback(null, []);
          }else{
            self.getChild("_readCounter", function(err, readCount){
              if(err != null){
                callback(err)
              }else{
                var readCount = parseInt(readCount);
                var length = count - readCount;
                var i = readCount + 1;
                var completed = 0;
                var data = [];
                while(i <= count){
                  (function(i){
                    self.getChild(i, function(err, doc){
                      data[i - readCount - 1] = doc;
                      completed++;
                      if(completed === length){
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
      api.couchbase.structure.call(this, key, bucket, "hash");
  }
  util.inherits(api.couchbase.hash, api.couchbase.structure);

  api.couchbase.hash.prototype.keys = function(callback){
    var self = this;
    self.load(function(err){
      if(err != null){
        callback(err);
      }else{
        var keys = [];
        self.metadata.childKeys.forEach(function(childKey){
          if(childKey !== self.counterPrefix()){
            keys.push(childKey);
          }
        });
        // keys.sort();
        callback(null, keys);
      }
    });
  };

  api.couchbase.hash.prototype.length = function(callback){
    var self = this;
    self.keys(function(err, keys){
      var length;
      if(keys != null){ length = keys.length; }
      callback(err, length);
    });
  }

  api.couchbase.hash.prototype.get = function(key, callback){
    var self = this;
    self.childExists(key, function(err, exists){
      if(err != null){
        callback(err);
      }else if(exists === false){
        callback(null, null);
      }else{
        self.getChild(key, function(err, data){
          callback(err, data, key);
        });
      }
    });
  }

  api.couchbase.hash.prototype.set = function(key, data, callback){
    var self = this;
    self.childExists(key, function(err, exists){
      if(err != null){
        callback(err);
      }else if(exists === false){
        self.addChild(key, data, function(err){
          self.incr(1, function(err){
            if(typeof callback === "function"){ callback(err); }
          });
        }, true);
      }else{
        self.addChild(key, data, function(err){
          if(typeof callback === "function"){ callback(err); }
        }, true);
      }
    });
  }

  api.couchbase.hash.prototype.unset = function(key, callback){
    var self = this;
    self.removeChild(key, function(err){
      self.incr(-1, function(err){
        if(typeof callback === "function"){ callback(err); }
      });
    });
  }

  api.couchbase.hash.prototype.getAll = function(callback){
    var self = this;
    self.keys(function(err, keys){
      if(err != null){
        callback(err);
      }else{
        var count = 0;
        var data = {};
        if(keys.length === 0){
          callback(null, {});
        }else{
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
      }
    });
  }

  next();
}