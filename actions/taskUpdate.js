exports.action = {
  name: "taskUpdate",
  description: "taskUpdate",
  inputs: {
    required: ["workerId", "taskId", "state"],
    optional: ["failReason", "reEnqueue"],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    
    var allowedStates = ["fail", "success"];

    // TODO: metrics about task completion time

    var stateActions = {
      "success" : function(connection, task, next){
        api.couchqueue.tasksInProgress.unset(task.taskId, function(err){
          connection.error = err;
          next(connection, true);
        });
      },
      "fail" : function(connection, task, next){
        // TODO (reason)
        // TODO (reEnqueue)
      },
    }

    if(allowedStates.indexOf(connection.params.state) < 0 ){
      connection.error = "state must be " + allowedStates.join(",");
      next(connection, true);
    }else{
      api.couchqueue.workers.get(connection.params.workerId, function(err, worker){
        if(err != null){
          connection.error = err;
          next(connection, true);
        }else if(worker == null){
          connection.error = "no worker with that workerId";
          next(connection, true);
        }else{
          api.couchqueue.tasksInProgress.get(connection.params.taskId, function(err, task){
            if(err != null){
              connection.error = err;
              next(connection, true);
            }else if(task.workerId != worker.workerId){
              connection.error = "this worker is not working on this task";
              next(connection, true);
            }else{
              task.state = connection.params.state;
              stateActions[task.state](connection, task, next);
            }
          });
        }
      });
    }
  }
};
