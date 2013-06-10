var should = require("should")
var setup = require("./_setup.js")._setup;
var r = setup.request;

describe('#interestCreate and #interestDelete', function(){  
  
  before(function(done){
    this.timeout(setup.bootTimeout);
    setup.init(done);
  });

  it("can create a regex interest", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestCreate",
        queue: "testQueue",
        interests: JSON.stringify( { "email": "^.*", } )
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      should.not.exists(body.error)
      done();
    });
  });

  it("can create a * interest", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestCreate",
        queue: "testQueue",
        interests: "*"
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      should.not.exists(body.error)
      done();
    });
  });

  it("can create multiple interests", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestCreate",
        queue: "testQueue",
        interests: JSON.stringify( { "email": "^.*", "user": "^.*"} )
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      should.not.exists(body.error)
      done();
    });
  });

  it("setting intersts will overwrite old values", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestCreate",
        queue: "testQueue",
        interests: JSON.stringify( { "email": "THING_1", } )
      }
    }, function(err, response, body){
      r.post(setup.testUrl, {
        form: {
          action: "interestCreate",
          queue: "testQueue",
          interests: JSON.stringify( { "email": "THING_2", } )
        }
      }, function(err, response, body){
        setup.api.couchbase.bucket.get("interests:testQueue", function(err, data){
          data.email.should.equal("THING_2");
          done();
        });
      });
    });
  });

  it("will fail create without queue", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestCreate",
        interests: JSON.stringify( { "email": "^.*", } )
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.error.should.equal("Error: queue is a required parameter for this action")
      done();
    });
  });

  it("will fail create without interests", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestCreate",
        queue: "testQueue",
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.error.should.equal("Error: interests is a required parameter for this action")
      done();
    });
  });
  
  it("can delete intersts", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestDelete",
        queue: "testQueue",
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      should.not.exists(body.error)
      done();
    });
  });

  it("will fail delete without a queue", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestDelete",
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.error.should.equal("Error: queue is a required parameter for this action")
      done();
    });
  });

});