var helpers = require('../helpers.js');
var app = require('../../server/server');

module.exports = function(Client) {
  // hinding all remote methods
  // helpers.disableAllMethods(Client);

  Client.registerClient = function(userId, schedulerPass, cb) {
    // TODO created users
    console.log(userId + "   "  + schedulerPass + " well done !");
    Client.findOne({where: {userId: userId}}, function(err, user) {
      if(!err && user != null) {
        user.schedulerPass = schedulerPass;
        user.save();
        cb(null, user);
      } else {
        if(userId && schedulerPass) {
          Client.create({userId: userId, schedulerPass: schedulerPass, config: null, state: null}, cb);
        } else {
          cb(helpers.CLIENT_CREATION_FAILED, {});
        }
      }
    })
  }

  Client.remoteMethod('registerClient',   {
    accepts: [
      {arg: 'userId', type: 'string'},
      {arg: 'schedulerPass', type: 'string'},
    ],
    returns: {type: 'string', root: true},
    http: {path:'/registerClient', verb: 'post'}
  })

  Client.setConfig = function(userId, config, cb) {
    Client.findOne({where: {userId: userId}}, function(err, user) {
      if(!err && user != null) {
        var tmp_config = [];
        for (var i = 0; i < config.length; i++) {
          tmp_config[config[i].var] = config[i];
        }
        user.config = tmp_config;
        user.save();
        cb(null, user);
      } else {
        cb(helpers.CLIENT_NOT_FOUND, {});
      }
    });
  }

  Client.remoteMethod('setConfig', {
    accepts: [
      {arg: 'userId', type: 'string'},
      {arg: 'config', type: 'object'},
    ],
    returns: {type: 'string', root: true},
    http: {path:'/setConfig', verb: 'post'}
  })

  Client.setState = function(userId, state, cb) {
    Client.findOne({where: {userId: userId}}, function(err, user) {
      if(!err && user != null) {
        var tmp_state = [];
        for (var i = 0; i < state.length; i++) {
          tmp_state[state[i].var] = state[i];
        }
        user.state = tmp_state;
        user.save();
        cb(null, user);
      } else {
        cb(helpers.CLIENT_NOT_FOUND, {});
      }
    });
  }

  Client.remoteMethod('setState', {
    accepts: [
      {arg: 'userId', type: 'string'},
      {arg: 'state', type: 'object'},
    ],
    returns: {type: 'string', root: true},
    http: {path:'/setState', verb: 'post'}
  })

  var taskObjectif = function(task, config, state, date, duration) {
    // verify duration is less than
    if(task.vars.duration * 60000 > duration) {
      return 1/-0;
    }
    // constraints verfication
    for (var i = 0; i < task.vars.constraint.length; i++) {
      if(state[task.vars.constraint[i].var]) {
        var diff = state[task.vars.constraint[i].var].value - task.constraint[i].value;
        if(Math.sign(diff) !== Math.sign(task.vars.constraint[i].type)) {
          console.log("constraint violated")
          return 1/-0;
        }
      }
    }
    // we should verify the deadline
    if(task.vars.duration * 60000 + task.vars.date - task.vars.deadline <= 10 * 60000) {
      return 1/+0;
    }
    // if all constraints are verified
    var result = 0;

    for(var key in config) {
      console.log(key, config[key]);
    }

    for (var i = 0; i < task.vars.variation.length; i++) {
      if(config[task.vars.variation[i].var]) {
        if(task.vars.variation[i].type === helpers.VAR_DURATION_PROPORTIONAL) {
          result += config[task.vars.variation[i].var].coefficient * task.vars.duration * task.vars.variation[i].value;
        } else if(task.vars.variation[i].type === helpers.VAR_FIXED_VALUE) {
          result += config[task.vars.variation[i].var].coefficient * task.vars.variation[i].value;
        }
      }
    }

    return result;
  }

  var bestTask = function(not_fixed_tasks, config, state, date, duration) {
    var bestTask = null;
    var result = 1/-0;
    for (var i = 0; i < not_fixed_tasks.length; i++) {
      var tmpResult = taskObjectif(not_fixed_tasks[i], config, state, date, duration);
      console.log(not_fixed_tasks[i].vars.label, tmpResult);
      if(tmpResult > result) {
        bestTask = not_fixed_tasks[i];
        result = tmpResult;
      }
    }
    return bestTask;
  }

  Object.extend = function(destination, source) {
    for (var property in source) {
        if (source.hasOwnProperty(property)) {
            destination[property] = source[property];
        }
    }
    return destination;
};

  Client.getSchedule = function(userId, scheduleparam, cb) {

    app.models.task.find({where: { and: [
          { ownerId: userId },
          { or: [
            {and: [
              {"vars.date": {gte: scheduleparam['start-date']}},
              {"vars.date": {lt: scheduleparam['end-date']}}
            ]},
            {"vars.deadline": {gte: scheduleparam['start-date']}}
          ]},
          { "vars.done": false }
        ]
      }
    }, function(err, tasks) {
      if(!err && tasks != null) {

        var schedule = [];

        Client.findOne({where: {userId: userId}}, function(err, user) {
          if(!err && user != null && user.config != null) {
            var config = Object.extend(user.config, helpers.defaultconfig);
            var state = user.state;

            for(var key in config) {
              console.log(key, config[key]);
            }

            // TODO we construct our timeline slots
            // sort tasks
            tasks.sort(function(task1, task2) {
              if(!task1) {
                return -1;
              }
              if(!task2) {
                return 1;
              }
              if(!task1.vars.date) {
                return -1;
              }
              if(!task2.vars.date) {
                return 1;
              }
              return task1.vars.date - task1.vars.date;
            })

            var not_fixed_tasks = [];
            var index = 0;
            while(index < tasks.length && !tasks[index].vars.date) {
              not_fixed_tasks.push(tasks[index]);
              index++;
            }

            // add fixed tasks to the schedule
            schedule = schedule.concat(tasks.slice(index, tasks.length));

            var slots = [];
            var start_date = scheduleparam['start-date'];
            var end_date = scheduleparam['end-date'];
            while(index < tasks.length && start_date < end_date) {
              if(tasks[index].vars.date - start_date > 0) {
                slots.push([start_date, tasks[index].vars.date - start_date]);
              }
              start_date = tasks[index].vars.date + tasks[index].vars.duration * 60000;
              index++;
            }
            slots.push([start_date, end_date - start_date]);

            console.log("slots", slots);

            for (var i = 0; i < slots.length; i++) {
              console.log("slot " + i, slots[i]);
              var taskToSchedule = bestTask(not_fixed_tasks, config, state, slots[i][0], slots[i][1]);
              while(taskToSchedule != null) {
                taskToSchedule.vars.date = slots[i][0];
                schedule.push(taskToSchedule);
                not_fixed_tasks.splice(not_fixed_tasks.indexOf(taskToSchedule), 1);

                slots[i][0] = taskToSchedule.vars.date + taskToSchedule.vars.duration * 60000;
                slots[i][1] -= taskToSchedule.vars.duration * 60000;
                taskToSchedule = bestTask(not_fixed_tasks, config, state, slots[i][0], slots[i][1]);
              }
            }

            console.log("schedule", schedule);

            cb(null, schedule);
          } else {
            cb(helpers.CLIENT_NOT_FOUND, {});
            return;
          }
        })
      } else {
        cb(helpers.TASK_NOT_FOUND, {});
      }
    });
  }

  Client.remoteMethod('getSchedule', {
    accepts: [
      {arg: 'userId', type: 'string'},
      {arg: 'scheduleparam', type: 'object'},
    ],
    returns: {type: 'string', root: true},
    http: {path:'/getSchedule', verb: 'post'}
  })

};
