var couchbase = require("couchbase");
var CouchbaseStructures = require("couchbase-structures");

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

  next();
}