exports.action = {
  name: "interestCreate",
  description: "interestCreate",
  inputs: {
    required: ["queue", "interests"],
    optional: [],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    var interests = JSON.parse(connection.params.interests);
    console.log(interests)
    api.couchqueue.interests.set(connection.params.queue, interests, function(err){
      connection.error == err;
      next(connection, true)
    });
  }
};
