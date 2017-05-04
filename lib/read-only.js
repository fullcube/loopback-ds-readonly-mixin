'use strict'

const debug = require('debug')('loopback:mixin:readonly')

module.exports = Model => {
  debug('ReadOnly mixin for Model %s', Model.modelName)

  Model.on('attached', () => {
    Model.stripReadOnlyProperties = (modelName, ctx, next) => {
      debug('stripReadOnlyProperties for model %s (via remote method %o)', modelName, ctx.methodString)
      const { body } = ctx.req

      if (!body) {
        return next()
      }

      const AffectedModel = Model.app.loopback.getModel(modelName)
      const options = AffectedModel.settings.mixins.ReadOnly
      const properties = (Object.keys(options).length) ? options : null

      if (properties) {
        debug('Found read only properties for model %s: %o', modelName, properties)
        Object.keys(properties).forEach(key => {
          debug('The \'%s\' property is read only, removing incoming data', key)
          delete body[key]
        })
        return next()
      }
      const err = new Error(`Unable to update: ${modelName} is read only.`)

      err.statusCode = 403
      return next(err)
    }

    // Handle native model methods.
    Model.beforeRemote('create', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next)
    })
    Model.beforeRemote('upsert', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next)
    })
    Model.beforeRemote('replaceOrCreate', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next)
    })
    Model.beforeRemote('patchOrCreate', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next)
    })
    Model.beforeRemote('prototype.updateAttributes', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next)
    })
    Model.beforeRemote('prototype.patchAttributes', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next)
    })
    Model.beforeRemote('updateAll', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next)
    })
    Model.beforeRemote('upsertWithWhere', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next)
    })
    Model.beforeRemote('replaceById', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, next)
    })

    // Handle updates via relationship.
    Object.keys(Model.definition.settings.relations).forEach(relationName => {
      const relation = Model.definition.settings.relations[relationName]

      if (relation.type.startsWith('has')) {
        const modelName = relation.model
        const AffectedModel = Model.app.loopback.getModel(modelName)

        Model.beforeRemote(`prototype.__updateById__${relationName}`, (ctx, modelInstance, next) => {
          if (typeof AffectedModel.stripReadOnlyProperties === 'function') {
            return AffectedModel.stripReadOnlyProperties(modelName, ctx, next)
          }
          return next()
        })
      }
    })

  })
}
