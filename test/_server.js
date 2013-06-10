var should = require("should")
var setup = require("./_setup.js")._setup;

describe('server', function(){  
  
  before(function(done){
    this.timeout(setup.bootTimeout);
    setup.init(done);
  });

  it("should be able to connect to couchbase", function(done){
    setup.bucket.should.be.an.instanceOf(Object);
    setup.bucket.set("foo", {key: "bar"}, function(err, metadata){
      setup.bucket.get("foo", function(err, doc, metadata){
        doc.key.should.equal("bar");
        done();
      });
    });
  });

});