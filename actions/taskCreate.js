var uuid = require('node-uuid');

exports.action = {
  name: "taskCreate",
  description: "taskCreate",
  inputs: {
    required: ["publisher", "data"],
    optional: ["runAt", "scope", "singularlyEnqueue", "singularlyRun"],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    
    var status            = "enqueued";
    var publisher         = connection.params.publisher;
    var data              = JSON.parse(connection.params.data);
    var runAt             = connection.params.runAt; // TODO
    var scope             = connection.params.scope; // TODO
    var singularlyEnqueue = connection.params.singularlyEnqueue; // TODO
    var singularlyRun     = connection.params.singularlyRun; // TODO

    if(runAt == null){
      runAt = new Date().getTime() - 1;
    }

    if( scope == null){
      scope = "any";
    }

    if( singularlyEnqueue == null ){
      singularlyEnqueue = false;
    }

    if( singularlyRun == null ){
      singularlyRun = false;
    }

    var task = {
      status: status,
      createdAt: new Date().getTime(),
      publisher: publisher,
      data: data,
      runAt: runAt,
      scope: scope,
      singularlyEnqueue: singularlyEnqueue,
      singularlyRun: singularlyRun,
    }

    var interestedSubscriptions = [];
    for(var queue in api.couchqueue.registeredInterests){
      var subsciption = api.couchqueue.registeredInterests[queue];
      for(var interest in subsciption){
        // regexp match
        var interest_regexp = new RegExp(interest);
        var subsciption_regexp = new RegExp(subsciption[interest]);
        var matched = false;
        for(var key in data){
          if(interest_regexp.exec(key) != null && subsciption_regexp.exec(data[key]) != null && matched == false){
            interestedSubscriptions.push(queue);
            matched = true;
            break;
          }
        }
      }
    }

    api.log("new task", "info", task);
    api.log("sending ^ to " + interestedSubscriptions.length + " queues", "debug", interestedSubscriptions);
    connection.response.interestedSubscriptions = interestedSubscriptions;

    if(interestedSubscriptions.length == 0){
      next(connection, true);
    }else{
      var started = 0;
      interestedSubscriptions.forEach(function(queue){
        started++;
        (function(queue){
          api.couchqueue.createQueueIfNeeded(queue, function(err){
            if (err != null){
              connection.error = err;
              started = -1;
              next(connection, true);
            }else{
              task.taskId = uuid.v4();
              task.enquedAt = new Date().getTime();
              task.queue = queue;
              api.couchqueue.queueObjects[queue].push(task, function(err){
                started--;
                connection.error = err;
                if(started == 0){ next(connection, true); }
              });
            }
          });
        })(queue)
      });
    }
  }
};
