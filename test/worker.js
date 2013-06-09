var should = require("should")
var setup = require("./_setup.js")._setup;
var r = setup.request;
var workerId;

describe('#workerRegister and #workerDelte', function(){  
  
  before(function(done){
    this.timeout(setup.bootTimeout);
    setup.init(done);
  });

  it("should be able to create a worker", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "workerRegister",
        queues: "myQueue",
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.workerId.should.exist;
      workerId = body.workerId;
      body.queues.length.should.equal(1)
      body.queues[0].should.equal("myQueue");
      done();
    });
  });

  it("will fail without queues", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "workerRegister",
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.error.should.equal("Error: queues is a required parameter for this action");
      done();
    });
  });

  it("can have more than one queue and priority order should be maintained", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "workerRegister",
        queues: "myQueue,otherQueue",
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.workerId.should.exist;
      body.queues.length.should.equal(2)
      body.queues[0].should.equal("myQueue");
      body.queues[1].should.equal("otherQueue");
      done();
    });
  });

  it("can delete a worker", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "workerDelete",
        workerId: workerId,
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      should.not.exist(body.error);
      done();
    });
  });

  it("will fail with an invalid workerId", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "workerDelete",
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.error.should.equal("Error: workerId is a required parameter for this action");
      done();
    });
  });

});