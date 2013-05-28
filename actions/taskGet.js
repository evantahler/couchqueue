exports.action = {
  name: "taskGet",
  description: "taskGet",
  inputs: {
    required: [],
    optional: [],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    // your logic here
    next(connection, true);
  }
};
