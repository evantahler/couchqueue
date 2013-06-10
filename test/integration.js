var should = require("should")
var setup = require("./_setup.js")._setup;
var r = setup.request;
var workerId;
var taskId;
var queue1 = "testQueue1";
var queue2 = "testQueue2";
var taskIds = [];

describe('integration', function(){  
  
  before(function(done){
    this.timeout(setup.bootTimeout);
    setup.init(done);
  });

  it("should be able to create a worker", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "workerRegister",
        queues: queue1 + "," + queue2,
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.workerId.should.exist;
      workerId = body.workerId;
      done();
    });
  });

  it("can create a * interest on queue1", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestCreate",
        queue: queue1,
        interests: "*"
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      should.not.exists(body.error)
      done();
    });
  });

  it("can create a regex interest on queue2", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "interestCreate",
        queue: queue2,
        interests: JSON.stringify( { "email": "^.*", } )
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      should.not.exists(body.error)
      done();
    });
  });

  it("worker should get no tasks when asking", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "taskGet",
        workerId: workerId,
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.error.should.equal("no tasks found")
      should.not.exist(body.task);
      done();
    });
  });

  it("can post a new task, and it should go to both queues", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "taskCreate",
        publisher: "TEST",
        data: JSON.stringify( { "email": "evan@test.com", "name": "task 1" } )
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.interestedSubscriptions.length.should.equal(2);
      should.not.exists(body.error)
      done();
    });
  });

  it("0 tasks should be in progress", function(done){
    setup.api.couchqueue.tasksInProgress.length(function(err, length){
      length.should.equal(0);
      done();
    });
  });

  it("can post a new task just to queue 1", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "taskCreate",
        publisher: "TEST",
        data: JSON.stringify( { "thing": "stuff", "name": "task 2" } )
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      body.interestedSubscriptions.length.should.equal(1);
      should.not.exists(body.error)
      done();
    });
  });

  it("can get the tasks in the proper order", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "taskGet",
        workerId: workerId,
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      task = body.task;
      should.not.exists(body.error)
      task.data.name.should.equal("task 1")
      task.queue.should.equal(queue1);
      taskIds.push(task.taskId)

      r.post(setup.testUrl, {
        form: {
          action: "taskGet",
          workerId: workerId,
        }
      }, function(err, response, body){
        body = JSON.parse(body);
        task = body.task;
        should.not.exists(body.error)
        task.data.name.should.equal("task 2")
        task.queue.should.equal(queue1);
        taskIds.push(task.taskId)

        r.post(setup.testUrl, {
          form: {
            action: "taskGet",
            workerId: workerId,
          }
        }, function(err, response, body){
          body = JSON.parse(body);
          task = body.task;
          should.not.exists(body.error)
          task.data.name.should.equal("task 1")
          task.queue.should.equal(queue2);
          taskIds.push(task.taskId)
          done();
        });
      });
    });
  });

  it("3 tasks should be in progress", function(done){
    setup.api.couchqueue.tasksInProgress.length(function(err, length){
      length.should.equal(3);
      done();
    });
  });

  it("can complete the tasks", function(done){
    r.post(setup.testUrl, {
      form: {
        action: "taskUpdate",
        taskId: taskIds.pop(),
        workerId: workerId,
        state: "success",
      }
    }, function(err, response, body){
      body = JSON.parse(body);
      should.not.exists(body.error)

      r.post(setup.testUrl, {
        form: {
          action: "taskUpdate",
          taskId: taskIds.pop(),
          workerId: workerId,
          state: "success",
        }
      }, function(err, response, body){
        body = JSON.parse(body);
        should.not.exists(body.error)
      });

      r.post(setup.testUrl, {
        form: {
          action: "taskUpdate",
          taskId: taskIds.pop(),
          workerId: workerId,
          state: "success",
        }
      }, function(err, response, body){
        body = JSON.parse(body);
        should.not.exists(body.error)
        done();
      });

    });
  });

  it("0 tasks should be in progress (again)", function(done){
    setup.api.couchqueue.tasksInProgress.length(function(err, length){
      length.should.equal(0);
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

});