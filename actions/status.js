var CouchbaseStructures = require("couchbase-structures");

exports.action = {
  name: "status",
  description: "status",
  inputs: {
    required: [],
    optional: [
      "workers",
      "queues",
      "interests",
    ],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    var started = 0;
    var action = this;
    connection.response.status = {};

    var complete = function(err){
      started--;
      if(err != null){
        started = 0;
        connection.error = err;
        nex(connection, true);
      }
      if(started === 0){
        next(connection, true);
      }
    }
    
    if(connection.params.workers != null){
      started++;
      api.couchqueue.workers.getAll(function(err, data){
        connection.response.status.workers = data;
        complete(err);
      });
    }

    if(connection.params.queues != null){
      started++;
      connection.response.queues = {};
      api.couchqueue.queues.getAll(function(err, data){
        if(api.utils.hashLength(data) == 0){
          complete(err);
        }else{
          started--;
          for(var queue in data){
            started++;
            var couchName = data[queue];
            (function(queue, couchName){
              if(api.couchqueue.queueObjects[queue] == null){
                api.couchqueue.queueObjects[queue] = new CouchbaseStructures.queue(couchName, api.couchbase.bucket);
              }
              api.couchqueue.queueObjects[queue].length(function(err, length){
                connection.response.queues[queue] = length;
                complete(err);
              });
            })(queue, couchName);
          }
        }        
      });
    }

    if(connection.params.interests != null){
      started++;
      api.couchqueue.interests.getAll(function(err, data){
        connection.response.status.interests = data;
        complete(err);
      });
    }

    if(started === 0){
      started++;
      complete();
    }
  }
};
