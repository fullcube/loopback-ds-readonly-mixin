var loopback = require('loopback');
var lt = require('loopback-testing');
var chai = require('chai');
var expect = chai.expect;

// Create a new loopback app.
var app = require('./fixtures/simple-app/server/server.js');

describe('loopback datasource readonly property (mixin sources.js)', function() {

  lt.beforeEach.withApp(app);

  describe('when called internally', function() {
    lt.beforeEach.givenModel('Product', {name: 'some book', type: 'book', status: 'pending'}, 'product');

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
    lt.beforeEach.givenModel('Product', {name: 'some book', type: 'book', status: 'pending'}, 'product');
    it('should not save readonly properties on create.', function(done) {
      var product = this.product;
      this.post('/api/products')
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

    lt.beforeEach.givenModel('Product', {name: 'some book', type: 'book', status: 'pending'}, 'product');
    it('should not change readonly properties on update (single readonly property)', function(done) {
      var product = this.product;
      this.put('/api/products/' + product.id)
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

    lt.beforeEach.givenModel('Person', {name: 'Tom', status: 'disabled', role: 'user'}, 'Person');
    it('should not change readonly properties on update (multiple readonly properties)', function(done) {
      var Person = this.Person;
      this.put('/api/people/' + Person.id)
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

    lt.beforeEach.givenModel('AuditTrail', {event: 'edit', user: 'tom'}, 'audittrail');
    it('should not change readonly properties on update (full read only model)', function(done) {
      var audittrail = this.audittrail;
      this.put('/api/audittrails/' + audittrail.id)
        .send({
          event: 'update',
          user: 'john'
        })
        .expect(403)
        .end(done);
    });

    lt.beforeEach.givenModel('Product', {name: 'book 1', type: 'book', status: 'disabled'}, 'book1', 'product');
    lt.beforeEach.givenModel('Product', {name: 'book 12', type: 'book', status: 'pending'}, 'book2', 'product');
    it('should not change readonly properties with bulk updates', function(done) {
      var self = this;
      var data = { status: 'disabled' };
      var query = { where: {type: 'book' }};
      self.post('/api/products/update')
        .query(query)
        .send(data)
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
          expect(err).to.not.exist;
          app.models.Product.findById(self.book1.id, function(err, b1) {
            expect(err).to.not.exist;
            expect(b1.status).to.equal(self.book1.status);
            app.models.Product.findById(self.book2.id, function(err, b2) {
              expect(err).to.not.exist;
              expect(b2.status).to.equal(self.book2.status);
              done();
            });
          });
        });
    });
  });
});
