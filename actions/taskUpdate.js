exports.action = {
  name: "taskUpdate",
  description: "taskUpdate",
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
