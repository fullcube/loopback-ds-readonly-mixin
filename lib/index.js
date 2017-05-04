'use strict'

const deprecate = require('depd')('loopback-ds-readonly-mixin')
const readOnly = require('./read-only')

module.exports = function mixin(app) {
  app.loopback.modelBuilder.mixins.define = deprecate.function(app.loopback.modelBuilder.mixins.define,
    'app.modelBuilder.mixins.define: Use mixinSources instead ' +
    'see https://github.com/fullcube/loopback-ds-readonly-mixin#mixinsources')
  app.loopback.modelBuilder.mixins.define('ReadOnly', readOnly)
}
