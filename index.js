var debug = require('debug')('loopback-ds-readonly-mixin');

function readonly(Model, options) {
  'use strict';

  debug('Readonly mixin for Model %s', Model.modelName);

  var loopback = require('loopback');

  // Make sure emailVerified is not set by creation
  Model.stripReadOnlyProperties = function(ctx, modelInstance, next) {
    var body = ctx.req.body;
    if (!body) {
      return next();
    }
    var properties = (Object.keys(options).length) ? options : null;
    if (properties) {
      debug('Creating %s : Readonly properties are %j', 'modelInstance.Model.modelName', properties);
      Object.keys(properties).forEach(function(key) {
        debug('The \'%s\' property is readonly, removing incoming data', key);
        delete body[key];
      });
      next();
    } else {
      var err = new Error('Unable to update: ' + Model.modelName + ' is readonly.');
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
}

module.exports = function mixin(app) {
  app.loopback.modelBuilder.mixins.define('Readonly', readonly);
};
