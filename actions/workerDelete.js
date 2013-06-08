exports.action = {
  name: "workerDelete",
  description: "workerDelete",
  inputs: {
    required: ["workerId"],
    optional: [],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    // TODO: block if a task is running for this worker
    api.couchqueue.workers.unset(connection.params.workerId, function(err){
      connection.error = err;
      next(connection, true);
    });
  }
};
