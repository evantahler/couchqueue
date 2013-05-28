exports.action = {
  name: "taskCreate",
  description: "taskCreate",
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
