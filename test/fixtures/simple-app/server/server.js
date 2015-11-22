var loopback = require('loopback');
var boot = require('loopback-boot');
var explorer = require('loopback-component-explorer');

var app = module.exports = loopback();

app.use('/api', loopback.rest());

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    console.log('Web server listening at: %s', app.get('url'));
    console.log('Explorer mounted at : %s', app.get('url') + 'explorer');
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // Register explorer using component-centric API:
  explorer(app, { basePath: '/api', mountPath: '/explorer' });

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
