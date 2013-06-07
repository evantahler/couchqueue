exports.task = {
  name: "loadInterests",
  description: "loadInterests",
  scope: "any",
  frequency: 30 * 1000,
  toAnnounce: true,
  run: function(api, params, next){
    if(params == null){ prams = {}; }
    var error = null;
    api.couchqueue.loadInterests(function(err){
      next(err, true);
    });
  }
};
