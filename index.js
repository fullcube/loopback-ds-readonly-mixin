var debug = require('debug')('loopback-ds-readonly-mixin');

function readonly(Model, options) {
  'use strict';

  debug('Readonly mixin for Model %s', Model.modelName);

  var loopback = require('loopback');

  Model.observe('before save', function event(ctx, next) {
    var properties;

    // If there is no current context, the method is be being called internally
    // as opposed to via REST, so do nothing.
    var currentContext = loopback.getCurrentContext();
    if (!currentContext) {
      return next();
    }

    if (ctx.instance) {
      properties = (!Object.keys(options).length) ? ctx.instance : options;
      debug('Creating %s : Readonly properties are %j', ctx.Model.modelName, properties);
      Object.keys(properties).forEach(function(key) {
        debug('The \'%s\' property is readonly, removing incoming data', key);
        ctx.instance[key] = undefined;
      });
    } else {
      properties = (!Object.keys(options).length) ? ctx.data : options;
      debug('Updating %s matching %j : Readonly properties are %j', ctx.Model.modelName, ctx.where, properties);
      Object.keys(properties).forEach(function(key) {
        debug('The \'%s\' property is readonly, removing incoming data', key);
        delete ctx.data[key];
      });
    }
    next();
  });

}

module.exports = function mixin(app) {
  app.loopback.modelBuilder.mixins.define('Readonly', readonly);
};
