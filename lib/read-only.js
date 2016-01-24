var debug = require('debug')('loopback-ds-readonly-mixin');

module.exports = function(Model, options) {
  'use strict';

  debug('ReadOnly mixin for Model %s', Model.modelName);

  // Make sure emailVerified is not set by creation
  Model.stripReadOnlyProperties = function(ctx, modelInstance, next) {
    var body = ctx.req.body;
    if (!body) {
      return next();
    }
    var properties = (Object.keys(options).length) ? options : null;
    if (properties) {
      debug('Creating %s : Read only properties are %j', Model.modelName, properties);
      Object.keys(properties).forEach(function(key) {
        if (properties[key] === true ||
          (properties[key].toString().toLowerCase() === 'createonly' && ctx.instance)) {
          debug('The \'%s\' property is read only, removing incoming data', key);
          delete body[key];
        }
      });
      next();
    } else {
      var err = new Error('Unable to update: ' + Model.modelName + ' is read only.');
      err.statusCode = 403;
      next(err);
    }
  };

  // Make sure emailVerified is not set by creation
  Model.beforeRemote('create', function(ctx, modelInstance, next) {
    Model.stripReadOnlyProperties(ctx, modelInstance, next);
  });
  Model.beforeRemote('upsert', function(ctx, modelInstance, next) {
    Model.stripReadOnlyProperties(ctx, modelInstance, next);
  });
  Model.beforeRemote('prototype.updateAttributes', function(ctx, modelInstance, next) {
    Model.stripReadOnlyProperties(ctx, modelInstance, next);
  });
  Model.beforeRemote('updateAll', function(ctx, modelInstance, next) {
    Model.stripReadOnlyProperties(ctx, modelInstance, next);
  });
};
