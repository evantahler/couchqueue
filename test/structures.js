var actionHeroPrototype = require(__dirname + "/../node_modules/actionHero/actionHero.js").actionHeroPrototype;
var should = require("should");
var request = require("request"); 

var AH;
var api;

var configChanges = {
  logger: {
    transports: [],
  },
  couchbase: {
    "debug" : false,
    "hosts" : [ "localhost:8091" ],
    "password" : "password",
    "bucket" : "couchqueue_test",
    "user" : "couchqueue_test"
  }
}

describe('couchbase', function(){  
  
  before(function(done){
    AH = new actionHeroPrototype();
    AH.start({configChanges: configChanges}, function(err, returned_api){
      api = returned_api;
      done();
    });
  });

  describe('basics', function(){  

    it("should be able to connect to couch", function(done){
      api.couchbase.bucket.should.be.an.instanceOf(Object);
      api.couchbase.bucket.set("foo", {key: "bar"}, function(err, metadata){
        api.couchbase.bucket.get("foo", function(err, doc, metadata){
          doc.key.should.equal("bar");
          done();
        });
      });
    });

    after(function(done){
      var count = 0;
      ["foo", "test", "test2", "test3", "test:_counter", "test2:_counter", "test3:_counter", "test:childish"].forEach(function(key){
        count++;
        api.couchbase.bucket.remove(key, function(){
          count--;
          if(count === 0){ done(); }
        });
      });
    })

  });

  describe('structure prototype', function(){ 

    it("can make a basic object", function(done){
      var t = new Date().getTime();
      var obj = new api.couchbase.structure("test");
      obj.type.should.equal("structure");
      obj.key.should.equal("test");
      obj.metadata.createdAt.should.be.within(t, t + 3);
      obj.metadata.updatedAt.should.be.within(t, t + 3);
      obj.metadata.childKeys[0].should.equal("test:_counter");
      done();
    });

    it("requires a key", function(done){
      try{
        var obj = new api.couchbase.structure();
      }catch(e){
        String(e).should.equal("Error: key is required");
        done();
      }
    });

    it("will save correctly", function(done){
      var obj = new api.couchbase.structure("test");
      obj.create(function(err){
        should.not.exist(err);
        done();
      });
    });

    it("can check if it exists", function(done){
      var obj = new api.couchbase.structure("test");
      obj.exists(function(err, exists){
        exists.should.equal(true);
        done();
      });
    })

    it("will fail on create if another doc exists with the same name", function(done){
      var obj = new api.couchbase.structure("test");
      obj.create(function(err){
        String(err).should.equal("Error: document already exists");
        done();
      });
    });

    it("will be able to retrive it's own metadata", function(done){
      var t = new Date().getTime();
      var obj = new api.couchbase.structure("test2");
      obj.create(function(err){
        obj.load(function(err, metadata){
          metadata.type.should.equal("structure");
          metadata.createdAt.should.be.within(t, t + 3);
          metadata.updatedAt.should.be.within(t, t + 3);
          metadata.childKeys[0].should.equal("test2:_counter");
          done();
        })
      });
    })

    it("will be able to get the count", function(done){
      var obj = new api.couchbase.structure("test");
      obj.getCount(function(err, count){
        count.should.equal(0);
        done();
      });
    })

    it("will be able to incr the count", function(done){
      var obj = new api.couchbase.structure("test");
      obj.getCount(function(err, count){
        count.should.equal(0);
        obj.incr(10, function(err, count){
          count.should.equal(10);
          obj.incr(-2, function(err, count){
            count.should.equal(8);
            done();
          });
        });
      });
    })

    it("will be able to force-set the count", function(done){
      var obj = new api.couchbase.structure("test");
      obj.forceCounter(999, function(err, count){
        count.should.equal(999);
        done();
      });
    });

    it("will be able touch its timestamps", function(done){
      var obj = new api.couchbase.structure("test");
      obj.load(function(){
        var a = obj.metadata.updatedAt;
        setTimeout(function(){
          obj.touch(function(){
            obj.load(function(){
              obj.metadata.updatedAt > a;
              done();
            });
          });
        }, 10);
      });
    })

    it("will be able to add a child doc", function(done){
      var obj = new api.couchbase.structure("test")
      obj.load(function(){
        obj.metadata.childKeys.length.should.equal(1);
        obj.addChild("childish", 'body', function(){
          obj.metadata.childKeys.length.should.equal(2);
          api.couchbase.bucket.get("test:childish", function(err, doc, metadata){
            should.not.exist(err)
            doc.should.equal("body");
            done();
          });
        });
      });
    })

    it("will be able to remove a child doc", function(done){
      var obj = new api.couchbase.structure("test")
      obj.load(function(){
        obj.metadata.childKeys.length.should.equal(2);
        obj.removeChild("childish", function(){
          obj.metadata.childKeys.length.should.equal(1);
          api.couchbase.bucket.get("test:childish", function(err, doc, metadata){
            should.not.exist(doc);
            String(err).should.equal("Error: No such key");
            done();
          });
        });
      });
    })

    it("will be able to be removed", function(done){
      var obj = new api.couchbase.structure("test3");
      obj.create(function(){
        obj.destroy(function(){
          api.couchbase.bucket.get("test3", function(err, doc){
            should.not.exists(doc);
            api.couchbase.bucket.get("test3:_counter", function(err, doc){
              should.not.exists(doc);
              done();
            });
          });
        });
      });
    });

  });

});