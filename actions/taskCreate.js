exports.action = {
  name: "taskCreate",
  description: "taskCreate",
  inputs: {
    required: ["publisher", "data"],
    optional: ["runAt", "scope", "singularlyEnqueue", "singularlyRun"],
  },
  blockedConnectionTypes: [],
  outputExample: {},
  run: function(api, connection, next){
    // your logic here
    next(connection, true);
  }
};
