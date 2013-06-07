exports.action = {
  name: "interestDelete",
  description: "interestDelete",
  inputs: {
    required: ["queue"],
    optional: [],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    api.couchqueue.interests.unset(connection.params.queue, function(err){
      connection.error == err;
      next(connection, true)
    });
  }
};
