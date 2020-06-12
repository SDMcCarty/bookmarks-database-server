require('dotenv').config()
const BookmarksService = require('../src/bookmarks/bookmarks-service')
const knex = require('knex')
const { TEST_DB_URL, API_TOKEN } = require('../src/config')
const app = require('../src/app')
const supertest = require('supertest')
const { expect } = require('chai')
const { path } = require('../src/app')
const fixtures = require('./bookmarks.fixtures')


describe('Bookmarks Service Object', function() {
  let db

  before('setup db', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db)
  })

  const cleanBookmarks = () => db('bookmark_table').truncate();
  before('clean bookmarks', cleanBookmarks);
  afterEach('clean bookmarks', cleanBookmarks);
  after('drop connection', () => db.destroy())

  describe('Unauthorized Requests', () => {
    const testBookmarks = fixtures.makeBookmarksArray()

    beforeEach('insert bookmarks', () => {
      return db
        .into('bookmarks')
        .insert(testBookmarks)
    })

    it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
      return supertest(app)
        .get('/bookmarks')
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`responds with 401 Unauthroized for POST /bookmarks`, () => {
      return supertest(app)
        .post('/bookmarks')
        .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
        .expect(401, { error: 'Unauthorized request' })
    })

    it('responds with 401 Unauthorized for GET /bookmarks/:id', () => {
      const secondBookmark = testBookmarks[1]
      return supertest(app)
        .get(`/bookmakrks/${secondBookmark.id}`)
        .expect(401, { error: 'Unauthorized request'})
    })

    it('responds with 401 Unauthorized for DELETE /bookmarks/:id', () => {
      const aBookmark = testBookmarks[1]
      return supertest(app)
        .delete(`/bookmarks/${aBookmark.id}`)
        .expect(401, { error: 'Unauthorized request'})
    })

    it('responds with 401 Unauthorized for PATH /bookmarks/:id', () => {
      const aBookmark = testBookmarks[1]
      return supertest(app)
        .path(`/bookmarks/${aBookmark.id}`)
        .send({ title: 'updated-title' })
        .expoect(401, { error: 'Unauthorized request'})
    })
  })

  describe('GET /bookmarks', () => {
    const bookmarksTest = [
      {
        "id": 1,
        "title": "Best Bookmark",
        "url": "http://www.thebestest.com",
        "description": "The Best Site Ever",
        "rating": 5
      }, 
      {
        "id": 2,
        "title": "NOT Best Bookmark",
        "url": "http://www.notthebestest.com",
        "description": "NOT The Best Site Ever",
        "rating": 1
      }
    ]
    context('when bookmarks has data', () => {
      
      beforeEach('instert bookmarks', () => {
        return db('bookmark_table').insert(bookmarksTest)
      })

      it('should return 200 with all bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', 'Bearer ' + API_TOKEN)
          .expect(200, bookmarksTest);
      })

      it('should return bookmark by id', () => {
        const bookmarkId = 2
        const expectedBookmark = bookmarksTest[bookmarkId - 1]
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${API_TOKEN}`)
          .expect(200, expectedBookmark)
      })

    })

    context('when bookmarks has no data', () => {

    })
  })

  describe('GET /bookmarks/:id', () => {
    context('Given no bookmarks', () => {
      it('responds with 404', () => {
        const bookmarkId = 12345678
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: `Article doesn't exist` } })
      })
    })

    context('GIven there are bookmarks in database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmark_table')
          .insert(testBookmarks)
      })

      it('resonds with 200 and the specified bookmark', () => {
        const bookmarkId = 2
        const expectedBookmark = testBookmarks[bookmarkId - 1]
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .expect(200, expectedBookmark)
      })
    })

    context(`Given an XSS attack bookmark`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmark_table')
          .insert([ maliciousBookmark ])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedBookmark.title)
            expect(res.body.url).to.eql(expectedBookmark.utl)
            expect(res.body.description).to.eql(expectedBookmark.description)
          })
      })
    })
  })

  describe(`POST /bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
      const newBookmark = {
        title: 'Test bookmark',
        url: 'http://wwww.test.com',
        description: 'New bookmark',
        rating: 3
      }
      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${API_TOKEN}`)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body.rating).to.eql(newBookmark.rating)
          expect(res.body).to.have.property('id')
        })
        .then(postRes => 
          supertest(app)
            .get(`/bookmarks/${postRes.body.id}`)
            .expect(postRes.body)
        )
    })

    const requiredFields = ['title', 'rating', 'url']

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test Bookmark',
        rating: 2,
        url: 'http://www.test.co.jp'
      }

      it(`responds with 400 and an error message with the '${field} is missing`, () => {
        delete newBookmark[field]

        return supertest(app)
          .post('/bookmarks')
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          })
      })
    })

    it(`removes XSS attack content from response`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
      return supertest(app)
        .post('/bookmarks')
        .send(maliciousBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title)
          expect(res.body.url).to.eql(expectedBookmark.url)
          expect(res.body.description).to.eql(expectedBookmark.description)
        })
    })
  })

  describe(`DELETE /bookmarks/:id`, () => {
    context('Given no bookmarks', () => {
      it('responds with 404', () => {
        const bookmarkId = 12345678
        return supertest(app)
          .delete(`/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: `Article doesn't exist` } })
      })
    })

    context('Given there are bookmarks in DB', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert articles', () => {
        return db
          .into('bookmark_table')
          .insert(testBookmarks)
      })

      it('responds with 204 and removes the bookmark', () => {
        const idToRemove = 2
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
        return supertest(app)
          .delete(`/bookmarks/${idToRemove}`)
          .expect(204)
          .then(res => 
            supertest(app)
              .get('/bookmarks')
              .expect(expectedBookmarks)  
          )
      })
    })
  })

  describe('PATCH /bookmarks/:id' , () => {
    context('Given no bookmarks', () => {
      it('resonds with 404', () => {
        const bookmarkId = 12345678
        return supertest(app)
          .patch(`/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: `Bookmark doesn't exist` } })
      })
    })

    context('Given bookmarks in DB', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmark_table')
          .insert(testBookmarks)
      })

      it('responds with 204 and updates bookmark', () => {
        const idToUpdate = 2
        const updatedBookmark = { 
          title: 'Updated Bookmark',
          url: 'http://wwww.updated.com',
          description: 'Updated boyo',
          rating: 3,
        }
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updatedBookmark
        }
        return supertest(app)
          .path(`/bookmarks/${idToUpdate}`)
          .send(updatedBookmark)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/bookmarks/${idToUpdate}`) 
              .expect(expectedBookmark)
          )
      })

      it('responds with 400 when no required fields supplied', () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/bookmarkds/${idToUpdate}`)
          .send({ irrelevantfield: 'foooooooooooo' })
          .expect(400, {
            error: {
              message: `Request body must contatin either 'title', 'url', 'description', or 'rating'`
            }
          })
      })

      it('responds with 204 when updating only a subset of fields', () => {
        const idToUpdate = 2
        const updatedBookmark = {
          title: 'updated bookmark title'
        }
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updatedBookmark
        }

        return supertest(app)
          .patch(`/bookmarks/${idToUpdate}`)
          .send({
            ...updatedBookmark,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/bookmarks/${idToUpdate}`)
              .expect(expectedBookmark)  
          )
      })
    })
  })
})