var debug = require('debug')('loopback-ds-readonly-mixin');

module.exports = function(Model) {
  'use strict';

  debug('ReadOnly mixin for Model %s', Model.modelName);

  var app;

  Model.stripReadOnlyProperties = function(modelName, ctx, next) {
    debug('stripReadOnlyProperties for model %s', modelName);
    var body = ctx.req.body;
    if (!body) {
      return next();
    }

    const AffectedModel = Model.app.loopback.getModel(modelName);
    const options = AffectedModel.settings.mixins.ReadOnly;

    var properties = (Object.keys(options).length) ? options : null;
    if (properties) {
      debug('Found read only properties for model %s: %o', modelName, properties);
      Object.keys(properties).forEach(function(key) {
        debug('The \'%s\' property is read only, removing incoming data', key);
        delete body[key];
      });
      next();
    } else {
      var err = new Error('Unable to update: ' + modelName + ' is read only.');
      err.statusCode = 403;
      next(err);
    }
  };

  Model.on('attached', function(a) {
    app = a;

    // Handle native model methods.
    Model.beforeRemote('create', function(ctx, modelInstance, next) {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next);
    });
    Model.beforeRemote('upsert', function(ctx, modelInstance, next) {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next);
    });
    Model.beforeRemote('replaceOrCreate', function(ctx, modelInstance, next) {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next);
    });
    Model.beforeRemote('prototype.updateAttributes', function(ctx, modelInstance, next) {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next);
    });
    Model.beforeRemote('prototype.patchAttributes', function(ctx, modelInstance, next) {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next);
    });
    Model.beforeRemote('updateAll', function(ctx, modelInstance, next) {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next);
    });
    Model.beforeRemote('upsertWithWhere', function(ctx, modelInstance, next) {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next);
    });
    Model.beforeRemote('replaceById', function(ctx, modelInstance, next) {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next);
    });

    // Handle updates via relationship.
    Object.keys(Model.definition.settings.relations).forEach(relationName => {
      var relation = Model.definition.settings.relations[relationName];
      if (relation.type.startsWith('has')) {
        var modelName = relation.model;
        var AffectedModel = Model.app.loopback.getModel(modelName);
        Model.beforeRemote(`prototype.__updateById__${relationName}`, function(ctx, modelInstance, next) {
          if (typeof AffectedModel.stripReadOnlyProperties === 'function') {
            return AffectedModel.stripReadOnlyProperties(modelName, ctx, next);
          }
          return next();
        });
      }
    });

  });
};
