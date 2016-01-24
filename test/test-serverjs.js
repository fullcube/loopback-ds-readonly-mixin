var loopback = require('loopback');
var lt = require('loopback-testing');
var chai = require('chai');
var expect = chai.expect;

// Create a new loopback app.
var app = loopback();

// import our ReadOnly mixin.
require('../lib')(app);

describe('loopback datasource readonly property (server.js)', function() {

  beforeEach(function(done) {
    // A model with 1 readonly property.
    var Product = this.Product = loopback.PersistedModel.extend('product',
      { name: String, type: String, status: String },
      { mixins: { ReadOnly: { status: true } } }
    );
    Product.attachTo(loopback.memory());
    app.model(Product);

    // A model with 2 readonly properties.
    var Person = this.Person = loopback.PersistedModel.extend('person',
      { name: String, status: String, role: String },
      { mixins: { ReadOnly: { status: true, role: "createOnly" } } }
    );
    Person.attachTo(loopback.memory());
    app.model(Person);

    // A model that is fully readony.
    var AuditTrail = this.AuditTrail = loopback.PersistedModel.extend('audittrail',
      { event: String, user: String },
      { mixins: { ReadOnly: true } }
    );
    AuditTrail.attachTo(loopback.memory());
    app.model(AuditTrail);

    app.use(loopback.rest());
    app.set('legacyExplorer', false);
    done();
  });

  lt.beforeEach.withApp(app);

  describe('when called internally', function() {
    lt.beforeEach.givenModel('product', {name: 'some book', type: 'book', status: 'pending'});

    it('should save readonly properties on create.', function(done) {
      expect(this.product.name).to.equal('some book');
      expect(this.product.type).to.equal('book');
      expect(this.product.status).to.equal('pending');
      done();
    });

    it('should change readonly properties on update.', function(done) {
      var self = this;
      self.product.name = 'some other book';
      self.product.status = 'disabled';
      self.product.save(function(err, p) {
        expect(err).to.not.exist;
        expect(p.name).to.equal(self.product.name);
        expect(p.type).to.equal(self.product.type);
        expect(p.status).to.equal(self.product.status);
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
          expect(err).to.not.exist;
          expect(res.body.name).to.equal('test product');
          expect(res.body.status).to.not.exist;
          done();
        });
    });

    lt.beforeEach.givenModel('product', {name: 'some book', type: 'book', status: 'pending'});
    it('should not change readonly properties on update (single readonly property)', function(done) {
      var product = this.product;
      this.put('/products/' + product.id)
        .send({
          name: 'updated name',
          status: 'disabled'
        })
        .expect(200)
        .end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body.name).to.equal('updated name');
          expect(res.body.status).to.equal('pending');
          done();
        });
    });

    lt.beforeEach.givenModel('person', {name: 'Tom', status: 'disabled', role: 'user'});
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
          expect(err).to.not.exist;
          expect(res.body.name).to.equal('Tom (edited)');
          expect(res.body.status).to.equal('disabled');
          expect(res.body.role).to.equal('user');
          done();
        });
    });

    lt.beforeEach.givenModel('audittrail', {event: 'edit', user: 'tom'});
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

    lt.beforeEach.givenModel('product', {name: 'book 1', type: 'book', status: 'disabled'}, 'book1');
    lt.beforeEach.givenModel('product', {name: 'book 12', type: 'book', status: 'pending'}, 'book2');
    it('should not change readonly properties with bulk updates', function(done) {
      var self = this;
      var data = { 'status': 'disabled' };
      var query = { 'where': {'type': 'book' }};
      self.post('/products/update')
        .query(query)
        .send(data)
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          expect(err).to.not.exist;
          self.Product.findById(self.book1.id, function(err, b1) {
            expect(err).to.not.exist;
            expect(b1.status).to.equal(self.book1.status);
            self.Product.findById(self.book2.id, function(err, b2) {
              expect(err).to.not.exist;
              expect(b2.status).to.equal(self.book2.status);
              done();
            });
          });
        });
    });
  });
});
