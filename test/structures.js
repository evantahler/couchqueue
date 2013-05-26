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

var cleanup = function(callback){
  var count = 0;
  [
    "foo", 
    "test", 
    "test2", 
    "test3", 
    "test:_counter", 
    "test2:_counter", 
    "test3:_counter", 
    "test:childish",
    "test:0",
    "test:1",
    "test:2",
  ].forEach(function(key){
    count++;
    api.couchbase.bucket.remove(key, function(){
      count--;
      if(count === 0){ callback(); }
    });
  });
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
      cleanup(done);
    });

  });

  describe('structure prototype', function(){ 

    it("can make a basic object", function(done){
      var t = new Date().getTime();
      var obj = new api.couchbase.structure("test");
      obj.type.should.equal("structure");
      obj.key.should.equal("test");
      obj.metadata.createdAt.should.be.within(t, t + 3);
      obj.metadata.updatedAt.should.be.within(t, t + 3);
      obj.metadata.childKeys[0].should.equal("_counter");
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
          metadata.childKeys[0].should.equal("_counter");
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

  describe("Array", function(){

    before(function(done){
      cleanup(done);
    });

    it("can createa an array", function(done){
      var t = new Date().getTime();
      var obj = new api.couchbase.array("test");
      obj.type.should.equal("array");
      obj.key.should.equal("test");
      obj.metadata.createdAt.should.be.within(t, t + 3);
      obj.metadata.updatedAt.should.be.within(t, t + 3);
      obj.metadata.childKeys[0].should.equal("_counter");
      done();
    });

    it("starts with an initial length of 0", function(done){
      var obj = new api.couchbase.array("test");
      obj.create(function(err){
        obj.length(function(err, length){
          length.should.equal(0);
          done();
        });
      });
    });

    it("setting an element will increase lenght", function(done){
      var obj = new api.couchbase.array("test");
      obj.load(function(){
        obj.length(function(err, length){
          length.should.equal(0);
          obj.set(0, {body: 'item 0'}, function(err){
            should.not.exists(err);
            obj.length(function(err, length){
              length.should.equal(1);
              done();
            });
          });
        });
      });
    });

    it("can retrieve a set value", function(done){
      var obj = new api.couchbase.array("test");
      obj.load(function(){
        obj.get(0, function(err, data){
          should.not.exists(err);
          data.body.should.equal('item 0');
          done();
        });
      });
    });

    it("will error when asking for a value which hasn't beeen set", function(done){
      var obj = new api.couchbase.array("test");
      obj.load(function(){
        obj.get(2, function(err, data){
          should.not.exists(data);
          String(err).should.equal("Error: index out of bounds");
          done();
        });
      });
    });

    it("can set another value, skipping an index", function(done){
      var obj = new api.couchbase.array("test");
      obj.load(function(){
        obj.set(2, {body: 'item 2'}, function(err){
          should.not.exists(err);
          obj.length(function(err, length){
            length.should.equal(3);
            done();
          });
        });
      });
    });

    it("can get all saved values", function(done){
      var obj = new api.couchbase.array("test");
      obj.load(function(){
        obj.getAll(function(err, data){
          should.not.exists(err);
          data.length.should.equal(3);
          data[0].body.should.equal("item 0");
          should.not.exist(data[1]);
          data[2].body.should.equal("item 2");
          done();
        });
      });
    });

    it("can be delted and will remove all children", function(done){
      var obj = new api.couchbase.array("test");
      obj.destroy(function(err){
        should.not.exists(err);
        api.couchbase.bucket.get("test:0", function(err, data){
          should.not.exists(data);
          api.couchbase.bucket.get("test:1", function(err, data){
            should.not.exists(data);
            api.couchbase.bucket.get("test:2", function(err, data){
              should.not.exists(data);
              done();
            });
          });
        });
      });
    });

  });

});