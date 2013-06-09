exports._setup = {
  request:         require("request"),
  couchbase:       require("couchbase"),
  serverPrototype: require("../node_modules/actionHero/actionHero.js").actionHeroPrototype,
  bootTimeout:     60 * 1000,  // travis needs a long time between buckets
  bucket:          null,
  bucketCreatedAt: null,
  couchbase_config: {
    "debug" : false,
    "hosts" : [ "localhost:8091" ],
    "password" : "password",
    "bucket" : "test",
    "user" : "test",
    "adminUser" : "Administrator",
    "adminPassword" : "password"
  },
  serverConfigChanges: {
    general: {
      id: "test-server-1",
      workers: 1,
      developmentMode: false
    },
    logger: { transports: null, },
    servers: {
      web: {
        secure: false, 
        port: 9000,    
      },
    }
  },
  // as we are deleting and recreating buckets, we need to wait and retry until the bucket is ready
  connect: function(callback){
    var self = this;
    self.couchbase.connect(self.couchbase_config, function(err, b){
      if(err){ 
        // console.log(err);
        setTimeout(function(){ self.connect.bind(self, callback)() }, 100);
      }else{
        self.bucket = b;
        self.bucket.set("foo", "bar", function(err){
          if(err){
            // console.log(err);
            setTimeout(function(){ self.connect.bind(self, callback)() }, 100);
          }else{  
            console.log("      ~ bucket creation took " + Math.round((new Date().getTime() - self.bucketCreatedAt)/1000) + "s")
            callback();
          }
        });
      }
    });
  },
  bootServer: function(callback){
    var self = this;
    if(self.server == null){
      self.server = new self.serverPrototype();
      self.server.start({configChanges: self.serverConfigChanges}, function(err, api){
        self.api = api;
        callback();
      });
    }else{
      callback();
    }
  },
  init: function(callback){
    var self = this;
    self.bucketCreatedAt = new Date().getTime();
    self.request({
      auth: { 'user': self.couchbase_config.adminUser, 'pass': self.couchbase_config.adminPassword },
      method: 'DELETE',
      uri: 'http://' + self.couchbase_config.hosts[0] + '/pools/default/buckets/' + self.couchbase_config.bucket,
    }, function(error, response, body){
      self.request({
        auth: { 'user': self.couchbase_config.adminUser, 'pass': self.couchbase_config.adminPassword },
        method: 'POST',
        form: { name: self.couchbase_config.bucket, ramQuotaMB: 100, authType: "sasl", saslPassword: self.couchbase_config.password, replicaNumber: 0 },
        uri: 'http://' + self.couchbase_config.hosts[0] + '/pools/default/buckets',
      }, function(error, response, body){
        self.connect(function(){
          self.bootServer(function(){
            callback();
          });
        });
      });
    });
  }
}