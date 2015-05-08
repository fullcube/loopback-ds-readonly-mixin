READONLY
=============

This module is designed for the [Strongloop Loopback](https://github.com/strongloop/loopback) framework.
It makes it possible to mark model properties as Readonly.

A Readonly property is not sent in the JSON data in the application's HTTP
response.  The property value is an object that details model properties to be
treated as readonly properties. Each key in the object must match a property
name defined for the model.

A feature requests exists against the Loopback project for similar functionality:
https://github.com/strongloop/loopback/issues/531

This module is implemented with the `before save` [Operation Hook](http://docs.strongloop.com/display/public/LB/Operation+hooks#Operationhooks-beforesave)
which is relatively new to the loopback framework so make sure you've updated
your loopback-datasource-juggler module.

INSTALL
=============

```bash
  npm install --save loopback-ds-readonly-mixin
```

SERVER.JS
=============

In your `server/server.js` file add the following line before the `boot(app, __dirname);` line.

```js
...
var app = module.exports = loopback();
...
// Add Readonly Mixin to loopback
require('loopback-ds-readonly-mixin')(app);

boot(app, __dirname, function(err) {
  'use strict';
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
```

CONFIG
=============

To use with your Models add the `mixins` attribute to the definition object of your model config.

```json
  {
    "name": "Widget",
    "properties": {
      "name": {
        "type": "string",
      }
    },
    "mixins": {
      "Readonly" : true
    }
  }
```

OPTIONS
=============

The specific fields that are marked as readonly can be set by passing an object to the mixin options.

In this example we mark the `status` and `role` fields as readonly.

```json
  {
    "name": "Widget",
    "properties": {
      "name": {
        "type": "string",
      }
    },
    "mixins": {
      "Readonly" : {
        "status" : true,
        "role" : true
      }
    }
  }
```

TESTING
=============

Run the tests in `test.js`

```bash
  npm test
```

Run with debugging output on:

```bash
  DEBUG='loopback-ds-readonly-mixin' npm test
```
