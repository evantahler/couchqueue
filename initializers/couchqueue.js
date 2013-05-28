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
          api.couchqueue[key] = new api.couchbase.hash(key);
          api.couchqueue[key].create(function(err){
            if(err != null){
              api.log(err, "error");
            }else{
              started--;
              if(started == 0){
                next();
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

    }
  }

  next();
}
