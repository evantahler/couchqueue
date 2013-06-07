exports.task = {
  name: "loadSubscriptions",
  description: "loadSubscriptions",
  scope: "any",
  frequency: 10 * 1000,
  toAnnounce: true,
  run: function(api, params, next){
    if(params == null){ prams = {}; }
    var error = null;
    api.couchqueue.loadQueues(function(err){
      next(err, true);
    });
  }
};
