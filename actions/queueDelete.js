exports.action = {
  name: "queueDelete",
  description: "queueDelete",
  inputs: {
    required: ["queue"],
    optional: [],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    api.couchqueue.deleteQueue(connection.params.queue, function(err){
      connection.error = err;
      next(connection, true);
    });
  }
};
