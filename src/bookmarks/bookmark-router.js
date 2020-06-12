path = require('path')
const express = require('express')
const { isWebUri } = require('valid-url')
xss = require('xss')
const { v4: uuid } = require('uuid')

const bookmarksRouter = express.Router()
const bodyParser = express.json()
const logger = require('../logger')
const BookmarksService = require('./bookmarks-service')

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  rating: Number(bookmark.rating),
  title: xss(bookmark.title),
  description: xss(bookmark.description),
  url: bookmark.url
})

bookmarksRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark))
      })
      .catch(next)
  })

  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const newId = uuid()
    const newBookmark = { newId, title, url, description, rating }

    for(const [key, value] of Object.entries (newBookmark))
      if(value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body`}
        })

    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl + `/${bookmark.id}`))
          .json(serializeBookmark(bookmark))
      })
      .catch(next)
  })

bookmarksRouter
  .route('/:id')
  .all((req, res, next) => {
    BookmarksService.getById(
      req.app.get('db'),
      req.paramas.bookmark.id
    )
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
          })
        }
        res.bookmark = bookmark
        .next()
      })
      .catch(next)
    })
    .get((req, res, next) => {
      res.json({
        id: res.bookmark.id,
        rating: res.bookmark.rating,
        title: xss(res.bookmark.title),
        url: xss(res.bookmark.url),
        description: xss(res.bookmark.description)
      })
    })
    .delete((req, res, next) => {
      BookmarksService.deleteBookmark(
        req.app.get('db'),
        req.params.bookmark.id
      )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
    })
    .patch(bodyParser, (req, res, next) => {
      const { title, url, description, rating } = req.body
      const bookmarkToUpdate = { title, content, style }

      const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
      if(numberOfValues === 0) {
        return res.status(400).json({
          error: {
            message: `Request body must contatin either 'title', 'url', 'description', or 'rating'`
          }
        })
      }

      BookmarksService.updateBookmark(
        req.app.get('db'),
        req.params.bookmark.id
      )
        .then(numRowsAffected => {
          res.status(204).end
        })
        .catch(next)
  })

  module.exports = bookmarksRouter