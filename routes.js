exports.routes = {

  get: [
    { path: "/task", action: "taskGet" },
    { path: "/status", action: "status" },
  ],

  put: [
    { path: "/task", action: "taskCreate" },
    { path: "/worker", action: "workerRegister" },
    { path: "/interest", action: "interestCreate" },
  ],

  post: [
    { path: "/task", action: "taskUpdate" },
  ],

  delete: [
    { path: "/worker", action: "workerDelete" },
    { path: "/interest", action: "interetDelelete" },
    { path: "/queue", action: "queueDelete" },
  ],

};
