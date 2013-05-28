exports.action = {
  name: "workerRegister",
  description: "workerRegister",
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
