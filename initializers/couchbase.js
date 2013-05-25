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

  api.couchbase.structure = function(key, bucket){
    this.key = key;
    if(bucket == null){ bucket = api.couchbase.bucket; }
    this.bucket = bucket;
    this.type = "structure"
  }

  api.couchbase.structure.prototype.create = function(callback){
    var self = this;
    self.exists(function(existing){
      if(existing){
        callback(new Error("already exists"), null);
      }else{
        self.bucket.set(self.key, self.generateDefaultState(), null, function(err, meta){

        });
      }
    });
  }

  api.couchbase.structure.prototype.generateDefaultState = function(){
    return {
      createdAt: new Date().getTime(), 
      updatedAt: new Date().getTime(),
      type: this.type,
      childKeys: [],
    }
  };

  api.couchbase.structure.prototype.touch = function(){
    var self = this;
  }

  api.couchbase.structure.prototype.getTimestamps = function(){
    var self = this;
  }

  api.couchbase.structure.prototype.exists = function(callback){
    var self = this;
    self.bucket.get(self.key, function(err, doc, meta){
      if(err != null){
        callback(err, false);
      }else if(doc != null){
        callback(null, true);
      }else{
        callback(null, false);
      }
    });
  }

  ///////////
  // Array //
  ///////////

  array:{
    this = new api.couchbase.object();
    create: function(key, callback){
      cb.get(key, function(err, doc, meta){
        if(err != null){
          callback(err);
        }else if(doc != null){
          callback(new Error(key + " exists"));
        }else{

        }
      });
    },
    delete: function(key, callback){

    },
    length: function(key, callback){

    },
    get: function(key, callback){

    },
    set: function(key, value, callback){

    },
    push: function(key, value, callback){

    },
    pop: function(key, callback){

    },
  }

  api.couchbase.array.prototype = new api.couchbase.structure;

  next();
}