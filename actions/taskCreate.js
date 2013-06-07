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
    
    var publisher         = connection.params.publisher;
    var data              = JSON.parse(connection.params.data);
    var runAt             = connection.params.runAt;
    var scope             = connection.params.scope;
    var singularlyEnqueue = connection.params.singularlyEnqueue;
    var singularlyRun     = connection.params.singularlyRun;

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
      createdAt: new Date().getTime(),
      publisher: publisher,
      data: data,
      publisher: runAt,
      scope: scope,
      singularlyEnqueue: singularlyEnqueue,
      singularlyRun: singularlyRun,
    }

    var interestedSubscriptions = [];
    for(var queue in api.couchqueue.registeredInterests){
      var subsciption = api.couchqueue.registeredInterests[queue];
      if (subsciption === "*"){
        // subscribe to all
        interestedSubscriptions.push(queue);
      }else{
        for(var interest in subsciption){
          // regexp match
          var regexp = new RegExp(subsciption[interest]);
          var matched = false;
          for(var key in data){
            if(regexp.exec(data[key]) != null && matched == false){
              interestedSubscriptions.push(queue);
              matched = true;
              break;
            }
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
        api.couchqueue.createQueueIfNeeded(queue, function(err){
          if (err != null){
            connection.error = err;
            started = -1;
            next(connection, true);
          }else{
            task.enquedAt = new Date().getTime();
            api.couchqueue.queueObjects[queue].push(task, function(err){
              started--;
              connection.error = err;
              if(started == 0){ next(connection, true); }
            });
          }
        });
      });
    }
  }
};
