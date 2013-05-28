# Couch Queue
**A high-availability, distrubuted remote queue based on node.js and couchbase**

(this readme is very likely to change until this project reached v1.)

## Intro

Goals: 

- To create a resque-like queue system which works off of a data store which is inhirently clustered and reduntant.  
- To speak to the queue system via a simple HTTP JSON api to make using the queue as simple as possible
- To creae a resque-like management site
- To allow for interest-based subscribtions and task duplication from other applications/wokers
- To build in support for our favorite resque plugins:
  - scheduler
  - retry

Notes:

- Unlike Resque, where events are published directly to work queues, CouchQueue assumes a distributed model mapped by `interest`.  For example, an event might come for `action: userCreated`.  There might be 2 intersted queues, `sendNewUserWelcomeEmail` and `giveNewUser20Points`.  CouchQueue will duplicate the task and place the task in each queue.  This means that by default, if no one has registered interest for an incomming task, it will be discrded.  Of course, workers can still register interest in all events (`*`)
- More than one of these node servers can be run off of the same couchbase cluster.  The coal of this project is to support reduant and homogenous archetectures.
- Using HTTP (rather than a direct connection to the DB) should allow for cross-datacenter workers
- Workers can be working on more than one task at a time (AKA Sidekiq and ActionHero), but this isn't a requirement
- Couchbase **is** slower than redis, but that is the price for redundancy :D

## API

### Publishing Tasks

- action: taskCreate
- route: PUT /task

**params**:
- `publisher`: A unique identified of the publishing appliaction (perhaps `hostbname+pid`)
- `data`: A JSON hash of any relivent information to publish.  It is best to publish IDs to be looked up later rather than all the information needed by the task
- `runAt`: (optional) A unix timestamp (in seconds) when the task can be run.  A null value will be itnerprited as `now`
- `scope`: (optional) either `any` or `all`.  Defaults to `any`.  Should each registed queue recieve only one copy of the task, or should all relevemnt workers preform the task?
- `singularlyEnqueue`: (optional) should more than one of these events be allowed in the queue at a time?
- `singularlyRun`: (optional) should more than one of these events be allowed to be run at a time?

### Getting Tasks & Starting work

- action: taskGet
- route: GET /task

This call will return JSON which contains all the informtaion published above.  The act of asking for the next task will mark the task as `started` by the worker which requested it.  If there is no task to be done, null will be returned.

**params**:
- `workerId`.  Given to the worker when registerd.

### Completing a task / Denoting a task as `errored`

- action: taskUpdate
- route: post /task

posting to `/tasks` will inform the sever if the task you are working on is done, and if you were able to sucesfully complete it or it failed.

**params**
- `workerId`:  Given to the worker when registerd.
- `taskId`:  Given to the worker when registerd.
- `state`:  Either `complete` or `fail`.
- `failReason`: (optional) a note about why the task failed
- `reEnqueue`; (optional) should we re-enqueue this task?  This can be used on both failed and complete tasks

### Removing Tasks

- action: taskDelete
- route: DELETE /task

This action will remove all the tasks for a specific queue or worker

**params**
- `workerId`: (optional).
- `queue`: (optional).

### Registering a Worker

- action: workerRegister
- route: PUT /worker

This is run when a worker boots, and how a worker obtains its `workerId`

**params**
- `queues`: A JSON array of queues to work from, in priority order

### Delteting a worker

- action: workerDelete
- route: DELETE /worker

This is how to 'gracefully' inform the server that a worker is shutting down.  Otherwise, the server will remover workers that aren't working a task and are idle for XXX duration

**params**
- `workerId`.  Given to the worker when registerd.

Optionally, you can delete all workers for a queue with the below.  This will stop all workers from getting any more tasks, even if they requst one.

**params**
- `queue`

### Registring Interest

- action: interestCreate
- route: PUT /interest

This tasks maps potential attibutes of a tasks published `data` JSON to a specfic queue.  Remember that tasks with more than one interseted work queue will be duplicated.  If a `queue` doesn't exist, it will be created here.

**params**
- `queue`:  A unique name for this queue (IE: `emails` or `applicationName`.
- `interests`: Interests is a JSON collection of regexes which will be matched in a **OR** fashion. Examples below

### Removing Interest

- action: interestDelete
- route: DELETE /interest

Nominally, you should use `registerInterest` to update your interest map.  This command will remove all interests from this queue entirely

**params**
- `queue`:  A unique name for this queue (IE: `emails` or `applicationName`.

### Removing a Queue

- action: queueDelete
- route: PUT /interest

### Inspecting the stated of the system

action: status
route: GET /status

This will give you status about various parts of the sytsem

**params**
- `queue`:  (optional) length of the items in the queue.
- `queues`: (optional) list of all queues in the sytem.
- `workerQueue`: (optional) length of worker-specific queues.
- `interests`: (optional) list of all interests registerd.
- `workers`: (optional) list of wokers and status.
- `failedQueue`: (optional) list of failed tasks
- `task`: (optional) get the details of a task 

## Registering Interests

When registering interst for a queue, you will be POSTing a JSON hash with regex.   This will be checked against all incomming tasks for a match before adding it to your work queue.  

### Registering for All queues:
`interests: *`

### Registering for all tasks with an `email` field
`interest: {email: "^.*"}`

### Registering for all tasks with an `email` field that are for a user named "evan"
`interest: {email: "^.*evan.*"}`

### Registering for all tasks with an `email` or a `userId`
`interest: {email: "^.*", userId: "^.*"}`

## Data Flow

`incomming task` -> `interset comparison` -> `work queue` -> `worker queue` -> `(worked)` -> `delted / failed / retried`

