var uuid = require('node-uuid');

exports.action = {
  name: "workerRegister",
  description: "workerRegister",
  inputs: {
    required: ["queues"],
    optional: [],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    var workerId = uuid.v4();
    var raw_queues = connection.params.queues.split(",");
    var queues = [];
    for(var q in raw_queues){
      queues.push(raw_queues[q].replace(/\s+/g, ''));
    }
    api.couchqueue.workers.set(workerId, {workerId: workerId, queues: queues}, function(err){
      connection.response.workerId = workerId;
      connection.response.queues = queues;
      connection.error = err;
      next(connection, true);
    });
  }
};
