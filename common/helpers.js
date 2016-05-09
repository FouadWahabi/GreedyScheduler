module.exports.disableAllMethods = function disableAllMethods(model, methodsToExpose)
{
  if(model && model.sharedClass)
  {
    methodsToExpose = methodsToExpose || [];

    var modelName = model.sharedClass.name;
    var methods = model.sharedClass.methods();
    var relationMethods = [];
    var hiddenMethods = [];

    try
    {
      Object.keys(model.definition.settings.relations).forEach(function(relation)
      {
        relationMethods.push({ name: '__findById__' + relation, isStatic: false });
        relationMethods.push({ name: '__destroyById__' + relation, isStatic: false });
        relationMethods.push({ name: '__updateById__' + relation, isStatic: false });
        relationMethods.push({ name: '__exists__' + relation, isStatic: false });
        relationMethods.push({ name: '__link__' + relation, isStatic: false });
        relationMethods.push({ name: '__get__' + relation, isStatic: false });
        relationMethods.push({ name: '__create__' + relation, isStatic: false });
        relationMethods.push({ name: '__update__' + relation, isStatic: false });
        relationMethods.push({ name: '__destroy__' + relation, isStatic: false });
        relationMethods.push({ name: '__unlink__' + relation, isStatic: false });
        relationMethods.push({ name: '__count__' + relation, isStatic: false });
        relationMethods.push({ name: '__delete__' + relation, isStatic: false });
      });
    } catch(err) {}

    methods.concat(relationMethods).forEach(function(method)
    {
      var methodName = method.name;
      if(methodsToExpose.indexOf(methodName) < 0)
      {
        hiddenMethods.push(methodName);
        model.disableRemoteMethod(methodName, method.isStatic);
      }
    });

    if(hiddenMethods.length > 0)
    {
      console.log('\nRemote mehtods hidden for', modelName, ':', hiddenMethods.join(', '), '\n');
    }
  }
};

// ==== Default config ====
module.exports.defaultconfig = [];
this.defaultconfig["energy"] =
{
  "var": "energy",
  "default": 2000,
  "coefficient": 2
};
this.defaultconfig["money"] =
{
  "var": "money",
  "default": 0,
  "coefficient": 4
};
this.defaultconfig["morale"] =
{
  "var": "morale",
  "default": 10,
  "coefficient": 4
};
this.defaultconfig["longitude"] =
{
  "var": "longitude",
  "default": 0,
  "coefficient": 2
};
this.defaultconfig["latitude"] =
{
  "var": "latitude",
  "default": 0,
  "coefficient": 2
};

// ==== Cosntants =====
module.exports.CLIENT_CREATION_FAILED = {status: 400, message : 'Client creation failed', code: 'BAD_REQUEST'};
module.exports.CLIENT_NOT_FOUND = {status: 404, message : 'Client not found', code: 'NOT_FOUND'};
module.exports.TASK_NOT_FOUND = {status: 404, message : 'Task not found', code: 'NOT_FOUND'};

module.exports.VAR_DURATION_PROPORTIONAL = 1;
module.exports.VAR_FIXED_VALUE = 2;
