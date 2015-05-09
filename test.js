/* jshint mocha: true */

var assert = require('assert');
var loopback = require('loopback');
var lt = require('loopback-testing');

// Create a new loopback app.
var app = loopback();

// import our Readonly mixin.
require('./')(app);

describe('loopback datasource readonly property', function() {

  beforeEach(function(done) {
    // A model with 1 readonly property.
    var Product = this.Product = loopback.PersistedModel.extend('product',
      { name: String, type: String, status: String },
      { mixins: { Readonly: { status: true } } }
    );
    Product.attachTo(loopback.memory());
    app.model(Product);

    // A model with 2 readonly properties.
    var Person = this.Person = loopback.PersistedModel.extend('person',
      { name: String, status: String, role: String },
      { mixins: { Readonly: { status: true, role: true } } }
    );
    Person.attachTo(loopback.memory());
    app.model(Person);

    // A model that is fully readony.
    var AuditTrail = this.AuditTrail = loopback.PersistedModel.extend('audittrail',
      { event: String, user: String },
      { mixins: { Readonly: true } }
    );
    AuditTrail.attachTo(loopback.memory());
    app.model(AuditTrail);

    app.use(loopback.rest());
    app.set('legacyExplorer', false);
    done();
  });

  lt.beforeEach.withApp(app);

  describe('when called internally', function() {
    lt.beforeEach.givenModel('product', {name:'some book', type:'book', status: 'pending'});

    it('should save readonly properties on create.', function(done) {
      assert.equal(this.product.name, 'some book');
      assert.equal(this.product.type, 'book');
      assert.equal(this.product.status, 'pending');
      done();
    });

    it('should change readonly properties on update.', function(done) {
      var self = this;
      self.product.name = 'some other book';
      self.product.status = 'disabled';
      self.product.save(function(err, p) {
        assert.ifError(err);
        assert.equal(p.name, self.product.name);
        assert.equal(p.type, self.product.type);
        assert.equal(p.status, self.product.status);
        done();
      });
    });
  });

  describe('when called remotely', function() {

    it('should not save readonly properties on create.', function(done) {
      var product = this.product;
      this.post('/products')
        .send({
          name: 'test product',
          status: 'active'
        })
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.name, 'test product');
          assert(!res.body.status);
          done();
      });
    });

    lt.beforeEach.givenModel('product', {name:'some book', type:'book', status: 'pending'});
    it('should not change readonly properties on update (single readonly property)', function(done) {
      var product = this.product;
      this.put('/products/' + product.id)
        .send({
          name: 'updated name',
          status: 'disabled'
        })
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.name, 'updated name');
          assert.equal(res.body.status, 'pending');
          done();
      });
    });

    lt.beforeEach.givenModel('person', {name:'Tom', status:'disabled', role: 'user'});
    it('should not change readonly properties on update (multiple readonly properties)', function(done) {
      var person = this.person;
      this.put('/people/' + person.id)
        .send({
          name: 'Tom (edited)',
          status: 'active',
          role: 'user'
        })
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.equal(res.body.name, 'Tom (edited)');
          assert.equal(res.body.status, 'disabled');
          assert.equal(res.body.role, 'user');
          done();
      });
    });

    lt.beforeEach.givenModel('audittrail', {event: 'edit', user:'tom'});
    it('should not change readonly properties on update (full read only model)', function(done) {
      var audittrail = this.audittrail;
      this.put('/audittrails/' + audittrail.id)
        .send({
          event: 'update',
          user: 'john'
        })
        .expect(403)
        .end(done);
    });

    lt.beforeEach.givenModel('product', {name:'book 1', type:'book', status: 'disabled'}, 'book1');
    lt.beforeEach.givenModel('product', {name:'book 12', type:'book', status: 'pending'}, 'book2');
    it('should not change readonly properties with bulk updates', function(done) {
      var self = this;
      var data = { 'status': 'disabled' };
      var query = { 'where': {'type' : 'book' }};
      self.post('/products/update')
        .query(query)
        .send(data)
        .set('Accept', 'application/json')
        .expect(204)
        .end(function(err, res) {
          assert.ifError(err);
          self.Product.findById(self.book1.id, function(err, b1) {
            assert.ifError(err);
            assert.equal(b1.status, self.book1.status);
            self.Product.findById(self.book2.id, function(err, b2) {
              assert.ifError(err);
              assert.equal(b2.status, self.book2.status);
              done();
            });
          });
        });
    });
  });
});
