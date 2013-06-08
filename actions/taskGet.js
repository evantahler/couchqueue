var CouchbaseStructures = require("couchbase-structures");

exports.action = {
  name: "taskGet",
  description: "taskGet",
  inputs: {
    required: ["workerId"],
    optional: [],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){

    var loopAllQueues = function(remainingQueues, callback){
      if(remainingQueues.length === 0){
        callback("no tasks found")
      }else{
        var queue = remainingQueues.pop();
        if(api.couchqueue.queueObjects[queue] == null){
          var couchName = api.couchqueue.couchName(queue);
          api.couchqueue.queueObjects[queue] = new CouchbaseStructures.queue(couchName, api.couchbase.bucket);
        }
        api.couchqueue.queueObjects[queue].pop(function(err, task){
          if(err != null){
            callback(err);
          }else if(task != null){
            callback(null, task);
          }else{
            loopAllQueues(remainingQueues, callback);
          }
        });
      }
    }

    api.couchqueue.workers.get(connection.params.workerId, function(err, worker){
      if(err != null){
        connection.error = err;
        next(connection, true);
      }else if(worker == null){
        connection.error = "no worker with that workerId";
        next(connection, true);
      }else{
        connection.response.worker = worker;
        var remainingQueues = worker.queues;
        loopAllQueues(remainingQueues, function(err, task){
          if(err != null){
            connection.error = err;
            next(connection, true);
          }else{
            task.workerId = worker.workerId;
            task.status = "processing";
            task.startedAt = new Date().getTime();
            api.couchqueue.tasksInProgress.set(task.taskId, task, function(err){
              connection.response.task = task;
              connection.error = err;
              next(connection, true);
            });
          }          
        });
      }
    });
  }
};
