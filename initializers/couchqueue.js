var CouchbaseStructures = require("couchbase-structures");

exports.couchqueue = function(api, next){
  
  api.couchqueue = {
    
    _start: function(api, next){
      if(api.couchbase.bucket != null){
        var started = 0;
        [
          "queues", 
          "workers", 
          "interests"
        ].forEach(function(key){
          started++;
          api.couchqueue[key] = new CouchbaseStructures.hash(key, api.couchbase.bucket);
          api.couchqueue[key].create(function(err){
            if(err != null){
              api.log(err, "error");
            }else{
              started--;
              if(started == 0){
                api.couchqueue.loadQueues(function(err){
                  if(err != null){
                    api.log(err, "fatal");
                    process.exit();
                  }else{
                    next();
                  }
                });
              }
            }
          }, true);
        });
      }else{
        api.log("waiting for couchbase to init...");
        setTimeout(function(){
          api.couchqueue._start(api, next);
        }, 100)
      }
    },
    
    _teardown: function(api, next){
      next();
    },

    registeredInterests: {},
    
    loadQueues: function(next){
      api.couchqueue.interests.getAll(function(err, interests){
        if(err == null){
          api.couchqueue.registeredInterests = interests;
          api.log(api.utils.hashLength(api.couchqueue.registeredInterests) + " interests loaded");
        }
        next(err);
      });
    }
  }

  next();
}
