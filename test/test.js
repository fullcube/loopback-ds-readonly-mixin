var loopback = require('loopback');
var lt = require('loopback-testing');
var chai = require('chai');
var expect = chai.expect;
var TestDataBuilder = lt.TestDataBuilder
var ref = TestDataBuilder.ref
var request = require('supertest')

// Helper function to make api requests.
function json(verb, reqUrl) {
  return request(app)[verb](reqUrl)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
}

// Create a new loopback app.
var app = require('./fixtures/simple-app/server/server.js');

describe('loopback datasource readonly property (mixin sources.js)', function() {

  lt.beforeEach.withApp(app);

  describe('Direct', function() {
    lt.beforeEach.givenModel('Product', {name: 'some book', type: 'book', status: 'pending'}, 'product');

    describe('Create', function() {
      it('should save readonly properties on create.', function(done) {
        expect(this.product.name).to.equal('some book');
        expect(this.product.type).to.equal('book');
        expect(this.product.status).to.equal('pending');
        done();
      });
    });

    describe('Update', function() {
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
  });

  describe('Remote', function() {
    describe('Create', function() {
      lt.beforeEach.givenModel('Product', {name: 'some book', type: 'book', status: 'pending'}, 'product');
      it('should not save readonly properties', function(done) {
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
            expect(res.body.status).to.equal('temp');
            done();
          });
      });
    })

    describe('updateAttributes', function() {
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
    });

    describe('upsert_put', function() {
      lt.beforeEach.givenModel('Product', {name: 'book 1', type: 'book', status: 'pending'}, 'product')
      it('should not change readonly properties with bulk updates', function() {
        var data = { id: this.product.id, status: 'disabled' }
        return json('put', '/api/products')
          .send(data)
          .then(res => app.models.Product.findById(this.product.id))
          .then(product => expect(product.status).to.equal('pending'))
      })
    })

    describe('upsert_patch', function() {
      lt.beforeEach.givenModel('Product', {name: 'book 1', type: 'book', status: 'pending'}, 'product');
      it('should not change readonly properties', function() {
        var data = { id: this.product.id, status: 'disabled' }
        return json('patch', '/api/products')
          .send(data)
          .then(res => app.models.Product.findById(this.product.id))
          .then(product => expect(product.status).to.equal('pending'))
      })
    })

    describe('replaceById', function() {
      lt.beforeEach.givenModel('Product', {name: 'book 1', type: 'book', status: 'pending'}, 'product');
      it('should not change readonly properties', function() {
        var data = { id: this.product.id, status: 'disabled' }
        return json('post', `/api/products/${this.product.id}`)
          .send(data)
          .then(res => app.models.Product.findById(this.product.id))
          .then(product => expect(product.status).to.equal('pending'))
      })
    })

    describe('replaceOrCreate', function() {
      lt.beforeEach.givenModel('Product', {name: 'book 1', type: 'book', status: 'pending'}, 'product');
      it('should not set readonly properties', function() {
        var data = { id: this.product.id, status: 'disabled' }
        return json('post', '/api/products/replaceOrCreate')
          .send(data)
          .then(res => app.models.Product.findById(this.product.id))
          .then(product => expect(product.status).to.equal('temp'))
      })
    })

    describe('updateAll', function() {
      lt.beforeEach.givenModel('Product', {name: 'book 1', type: 'book', status: 'disabled'}, 'book1')
      lt.beforeEach.givenModel('Product', {name: 'book 2', type: 'book', status: 'pending'}, 'book2')
      it('should not change readonly properties with bulk updates', function() {
        return json('post', '/api/products/update')
          .query({ where: {type: 'book' }})
          .send({ status: 'disabled' })
          .then(res => app.models.Product.findById(this.book1.id))
          .then(book1 => expect(book1.status).to.equal('disabled'))
          .then(res => app.models.Product.findById(this.book2.id))
          .then(book2 => expect(book2.status).to.equal('pending'))
      })
    })

    describe('upsertWithWhere', function() {
      lt.beforeEach.givenModel('Product', { name: 'book 1', type: 'book', status: 'disabled' }, 'product')
      it('should not change readonly properties with bulk updates', function() {
        return json('post', '/api/products/upsertWithWhere')
          .query({ where: { id: this.product.id } })
          .send({ status: 'active', name: 'book 1 (updated)' })
          .then(res => app.models.Product.findById(this.product.id))
          .then(product => {
            expect(product.status).to.equal('disabled')
            expect(product.name).to.equal('book 1 (updated)')
          })
      })
    })

    describe('Update via relationship', function() {
      before(function(done) {
        new TestDataBuilder()
          .define('person', app.models.Person, { name: 'Tom', status: 'disabled', role: 'user' })
          .define('product', app.models.Product, { name: 'book 2', type: 'book', status: 'pending', personId: ref('person.id') })
          .buildTo(this, done)
      })

      it('should not change readonly properties with updates via a relationship', function(done) {
        this.put('/api/people/' + this.person.id + '/products/' + this.product.id)
          .send({
            name: 'updated name',
            status: 'disabled'
          })
          .expect(200)
          .end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.body.name).to.equal('updated name');
            expect(res.body.status).to.equal('pending');
            done()
          });
      });
    });
  });
});
