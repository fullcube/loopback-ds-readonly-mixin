const chai = require('chai')
const lt = require('loopback-testing')
const request = require('supertest')

const { TestDataBuilder, TestDataBuilder: { ref } } = lt
const { expect } = chai

chai.use(require('dirty-chai'))

// Create a new loopback app.
const app = require('./fixtures/simple-app/server/server.js')

// Helper function to make api requests.
function json(verb, reqUrl) {
  return request(app)[verb](reqUrl)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
}

describe('loopback datasource readonly property (mixin sources.js)', function() {

  lt.beforeEach.withApp(app)

  describe('Direct', function() {
    lt.beforeEach.givenModel('Product', { name: 'some book', type: 'book', status: 'pending' }, 'product')
    describe('Create', function() {
      it('should save readonly properties on create.', function() {
        expect(this.product.name).to.equal('some book')
        expect(this.product.type).to.equal('book')
        expect(this.product.status).to.equal('pending')
      })
    })

    describe('Update', function() {
      it('should change readonly properties on update.', function() {
        this.product.name = 'some other book'
        this.product.status = 'disabled'
        return this.product.save()
          .then(p => {
            expect(p.name).to.equal(this.product.name)
            expect(p.type).to.equal(this.product.type)
            expect(p.status).to.equal(this.product.status)
          })
      })
    })
  })

  describe('Remote', function() {
    describe('Create', function() {
      lt.beforeEach.givenModel('Product', { name: 'some book', type: 'book', status: 'pending' }, 'product')
      it('should not save readonly properties', function() {
        return this.post('/api/products')
          .send({
            name: 'test product',
            status: 'active',
          })
          .expect(200)
          .then(res => {
            expect(res.body.name).to.equal('test product')
            expect(res.body.status).to.equal('temp')
          })
      })
    })

    describe('updateAttributes', function() {
      lt.beforeEach.givenModel('Product', { name: 'some book', type: 'book' }, 'product')
      it('should not change readonly properties on update (single readonly property)', function() {
        return this.put(`/api/products/${this.product.id}`)
          .send({
            name: 'updated name',
            status: 'disabled',
          })
          .expect(200)
          .then(res => {
            expect(res.body.name).to.equal('updated name')
            expect(res.body.status).to.equal('temp')
          })
      })

      lt.beforeEach.givenModel('Person', { name: 'Tom', status: 'disabled', role: 'user' }, 'person')
      it('should not change readonly properties on update (multiple readonly properties)', function() {
        return this.put(`/api/people/${this.person.id}`)
          .send({
            name: 'Tom (edited)',
            status: 'active',
            role: 'user',
          })
          .expect(200)
          .then(res => {
            expect(res.body.name).to.equal('Tom (edited)')
            expect(res.body.status).to.equal('disabled')
            expect(res.body.role).to.equal('user')
          })
      })
    })

    describe('patchAttributes', function() {
      lt.beforeEach.givenModel('Product', { name: 'some book', type: 'book', status: 'disabled' }, 'product')
      it('should not change readonly properties on update (single readonly property)', function() {
        return json('patch', `/api/products/${this.product.id}`)
          .send({
            name: 'updated name',
            status: 'disabled',
          })
          .expect(200)
          .then(res => {
            expect(res.body.name).to.equal('updated name')
            expect(res.body.status).to.equal('disabled')
          })
      })

      lt.beforeEach.givenModel('Person', { name: 'Tom', status: 'disabled', role: 'user' }, 'person')
      it('should not change readonly properties on update (multiple readonly properties)', function() {
        return json('patch', `/api/people/${this.person.id}`)
          .send({
            name: 'Tom (edited)',
            status: 'active',
            role: 'user',
          })
          .expect(200)
          .then(res => {
            expect(res.body.name).to.equal('Tom (edited)')
            expect(res.body.status).to.equal('disabled')
            expect(res.body.role).to.equal('user')
          })
      })

      lt.beforeEach.givenModel('AuditTrail', { event: 'edit', user: 'tom' }, 'audittrail')
      it('should not change readonly properties on update (full read only model)', function() {
        return json('patch', `/api/audittrails/${this.audittrail.id}`)
          .send({
            event: 'update',
            user: 'john',
          })
          .expect(403)
      })
    })

    lt.beforeEach.givenModel('AuditTrail', { event: 'edit', user: 'tom' }, 'audittrail')
    it('should not change readonly properties on update (full read only model)', function() {
      return json('put', `/api/audittrails/${this.audittrail.id}`)
        .send({
          event: 'update',
          user: 'john',
        })
        .expect(403)
    })

    describe('upsert_put', function() {
      lt.beforeEach.givenModel('Product', { name: 'book 1', type: 'book', status: 'pending' }, 'product')
      it('should not change readonly properties with bulk updates', function() {
        return json('put', '/api/products')
          .send({ id: this.product.id, status: 'disabled' })
          .expect(200)
          .then(() => app.models.Product.findById(this.product.id))
          .then(product => expect(product.status).to.equal('pending'))
      })
    })

    describe('upsert_patch', function() {
      lt.beforeEach.givenModel('Product', { name: 'book 1', type: 'book', status: 'pending' }, 'product')
      it('should not change readonly properties', function() {
        return json('patch', '/api/products')
          .send({ id: this.product.id, status: 'disabled' })
          .expect(200)
          .then(() => app.models.Product.findById(this.product.id))
          .then(product => expect(product.status).to.equal('pending'))
      })
    })

    describe('replaceById', function() {
      lt.beforeEach.givenModel('Product', { name: 'book 1', type: 'book', status: 'pending' }, 'product')
      it('should not change readonly properties', function() {
        return json('put', `/api/products/${this.product.id}`)
          .send({ id: this.product.id, status: 'disabled' })
          .expect(200)
          .then(() => app.models.Product.findById(this.product.id))
          .then(product => expect(product.status).to.equal('pending'))
      })
    })

    describe('replaceOrCreate', function() {
      lt.beforeEach.givenModel('Product', { name: 'book 1', type: 'book', status: 'pending' }, 'product')
      it('should not set readonly properties', function() {
        return json('post', '/api/products/replaceOrCreate')
          .send(Object.assign(this.product.toJSON(), { status: 'disabled' }))
          .expect(200)
          .then(() => app.models.Product.findById(this.product.id))
          .then(product => expect(product.status).to.equal('pending'))
      })
    })

    describe('updateAll', function() {
      lt.beforeEach.givenModel('Product', { name: 'book 1', type: 'book', status: 'disabled' }, 'bookOne')
      lt.beforeEach.givenModel('Product', { name: 'book 2', type: 'book', status: 'pending' }, 'bookTwo')
      it('should not change readonly properties with bulk updates', function() {
        return json('post', '/api/products/update')
          .query({ where: { type: 'book' } })
          .send({ status: 'disabled' })
          .expect(200)
          .then(() => app.models.Product.findById(this.bookOne.id))
          .then(bookOne => expect(bookOne.status).to.equal('disabled'))
          .then(() => app.models.Product.findById(this.bookTwo.id))
          .then(bookTwo => expect(bookTwo.status).to.equal('pending'))
      })
    })

    describe('upsertWithWhere', function() {
      lt.beforeEach.givenModel('Product', { name: 'book 1', type: 'book', status: 'disabled' }, 'product')
      it('should not change readonly properties with bulk updates', function() {
        return json('post', '/api/products/upsertWithWhere')
          .query({ where: { id: this.product.id } })
          .expect(200)
          .send({ status: 'active', name: 'book 1 (updated)' })
          .then(() => app.models.Product.findById(this.product.id))
          .then(product => {
            expect(product.status).to.equal('disabled')
            expect(product.name).to.equal('book 1 (updated)')
          })
      })
    })

    describe('Update via relationship', function() {
      before(function(done) {
        new TestDataBuilder()
          .define('person', app.models.Person, {
            name: 'Tom', status: 'disabled', role: 'user' })
          .define('product', app.models.Product, {
            name: 'book 2', type: 'book', status: 'pending', personId: ref('person.id') })
          .buildTo(this, done)
      })

      it('should not change readonly properties with updates via a relationship', function() {
        return this.put(`/api/people/${this.person.id}/products/${this.product.id}`)
          .send({
            name: 'updated name',
            status: 'disabled',
          })
          .expect(200)
          .then(res => {
            expect(res.body.name).to.equal('updated name')
            expect(res.body.status).to.equal('pending')
          })
      })
    })
  })
})
