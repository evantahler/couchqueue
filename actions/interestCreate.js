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
    if(connection.params.interests === "*"){
      var interests = "*";
    }else{
      var interests = JSON.parse(connection.params.interests);
    }
    api.couchqueue.interests.set(connection.params.queue, interests, function(err){
      connection.error == err;
      api.couchqueue.loadInterests(function(){
        next(connection, true);
      });
    });
  }
};
