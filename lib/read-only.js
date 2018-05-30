'use strict'

const debug = require('debug')('loopback:mixin:readonly')

function deletePropertiesFrom(properties, data) {
  Object.keys(properties).forEach(key => {
    debug('The \'%s\' property is read only, removing incoming data', key)
    delete data[key]
  })
}

function replacePropertiesWithValuesFrom(properties, from, to) {
  Object.keys(properties).forEach(key => {
    const value = from[key]

    debug('The \'%s\' property is read only, replacing incoming data with existing value: %o', key, value)
    to[key] = value
  })
}

module.exports = Model => {
  debug('ReadOnly mixin for Model %s', Model.modelName)

  Model.on('attached', () => {
    Model.stripReadOnlyProperties = (modelName, ctx, modelInstance, next) => {
      debug('stripReadOnlyProperties for model %s (via remote method %o)', modelName, ctx.methodString)
      const { body } = ctx.req

      if (!body) {
        return next()
      }

      const AffectedModel = Model.app.loopback.getModel(modelName)
      const options = AffectedModel.settings.mixins.ReadOnly
      const properties = (Object.keys(options).length) ? options : null
      const instanceId = ctx.args[AffectedModel.getIdName()]

      if (properties) {
        debug('Found read only properties for model %s: %o', modelName, properties)

        // Handle the case for updating an existing instance.
        if (instanceId) {
          return AffectedModel.findById(instanceId)
            .then(instance => {
              if (instance) {
                replacePropertiesWithValuesFrom(properties, instance, body)
              }
              else {
                deletePropertiesFrom(properties, body)
              }
              return next()
            })
        }

        // Handle the case creating a new instance.
        deletePropertiesFrom(properties, body)
        return next()

      }
      const err = new Error(`Unable to update: ${modelName} is read only.`)

      err.statusCode = 403
      return next(err)
    }

    // Handle native model methods.
    Model.beforeRemote('create', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, modelInstance, next)
    })
    Model.beforeRemote('upsert', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, modelInstance, next)
    })
    Model.beforeRemote('replaceOrCreate', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, modelInstance, next)
    })
    Model.beforeRemote('patchOrCreate', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, modelInstance, next)
    })
    Model.beforeRemote('prototype.updateAttributes', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, modelInstance, next)
    })
    Model.beforeRemote('prototype.patchAttributes', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, modelInstance, next)
    })
    Model.beforeRemote('updateAll', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, modelInstance, next)
    })
    Model.beforeRemote('upsertWithWhere', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, modelInstance, next)
    })
    Model.beforeRemote('replaceById', (ctx, modelInstance, next) => {
      Model.stripReadOnlyProperties(Model.modelName, ctx, modelInstance, next)
    })

    // Handle updates via relationship.
    Object.keys(Model.definition.settings.relations).forEach(relationName => {
      const relation = Model.definition.settings.relations[relationName]
      const modelName = relation.model
      const AffectedModel = Model.app.loopback.getModel(modelName)

      if (relation.type.startsWith('has')) {
        Model.beforeRemote(`prototype.__updateById__${relationName}`, (ctx, modelInstance, next) => {
          if (typeof AffectedModel.stripReadOnlyProperties === 'function') {
            return AffectedModel.stripReadOnlyProperties(modelName, ctx, modelInstance, next)
          }
          return next()
        })
      }
      if (relation.type.startsWith('belongs')) {
        const affectedRelations = AffectedModel.definition.settings.relations
        const affectedRelName = Object.keys(affectedRelations).find(name =>
          affectedRelations[name].model === Model.modelName
        )

        if (affectedRelName) {
          AffectedModel.beforeRemote(`prototype.__create__${affectedRelName}`,
            (ctx, modelInstance, next) => {
              if (typeof Model.stripReadOnlyProperties === 'function') {
                return Model.stripReadOnlyProperties(
                  Model.modelName,
                  ctx,
                  modelInstance,
                  next
                )
              }
              return next()
            }
          )

          AffectedModel.beforeRemote(`prototype.__updateById__${affectedRelName}`,
            (ctx, modelInstance, next) => {
              if (typeof Model.stripReadOnlyProperties === 'function') {
                return Model.stripReadOnlyProperties(
                  Model.modelName,
                  ctx,
                  modelInstance,
                  next
                )
              }
              return next()
            }
          )
        }
      }

    })

  })
}
