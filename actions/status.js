exports.action = {
  name: "status",
  description: "status",
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
