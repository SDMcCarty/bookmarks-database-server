path = require('path')
const express = require('express')
const { isWebUri } = require('valid-url')
xss = require('xss')
const { v4: uuid } = require('uuid')
const { getBookmarkValidationError } = require('./bookmark-validator')

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
    for (const field of ['title', 'url', 'rating']) {
      if (!req.body[field]) {
        logger.error(`${field} is required`)
        return res.status(400).send({
          error: { message: `${field} is required` }
        })
      }
    }

    const { title, url, description, rating } = req.body

    const ratingNum = Number(rating)

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      logger.error(`Invalid rating '${rating}'  supplied`)
      return res.status(400).send({
        error: { message: `'rating' must be a number between 1 and 5`}
      })
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid url '${url}' suppied`)
      return res.status(400).send({
        error: { message: `'url' must be a valid URL` }
      })
    }

    const newBookmark = { title, url, description, rating }

    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        logger.info(`Card with id ${bookmark.id} created`)
        res
          .status(201)
          .location(`/${bookmark.id}`)
          .json(serializeBookmark(bookmark))
      })
      .catch(next)

    // const { title, url, description, rating } = req.body
    // const newId = uuid()
    // const newBookmark = { newId, title, url, description, rating }

    // for(const [key, value] of Object.entries (newBookmark))
    //   if(value == null)
    //     return res.status(400).json({
    //       error: { message: `Missing '${key}' in request body`}
    //     })

    // BookmarksService.insertBookmark(
    //   req.app.get('db'),
    //   newBookmark
    // )
    //   .then(bookmark => {
    //     res
    //       .status(201)
    //       .location(path.posix.join(req.originalUrl + `/${bookmark.id}`))
    //       .json(serializeBookmark(bookmark))
    //   })
    //   .catch(next)
  })

bookmarksRouter
  .route('/:id')
  .all((req, res, next) => {
    const { id } = req.params
    BookmarksService.getById(
      req.app.get('db'),
      id
    )
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${id} not found`)
          return res.status(404).json({
            error: { message: `Bookmark Not Found` }
          })
        }
        res.bookmark = bookmark
        .next()
      })
      .catch(next)
    })
    .get((req, res) => {
      res.json(serializeBookmark(res.bookmark))
    })
    .delete((req, res, next) => {
      const id = req.params
      BookmarksService.deleteBookmark(
        req.app.get('db'),
        id
      )
      .then(numRowsAffected => {
        logger.info(`Bookmark with id ${id} deleted`)
        res.status(204).end()
      })
      .catch(next)
    })
    .patch(bodyParser, (req, res, next) => {
      const { title, url, description, rating } = req.body
      const bookmarkToUpdate = { title, url, description, rating }

      const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
      if(numberOfValues === 0) {
        logger.error(`Invalid update without required fields`)
        return res.status(400).json({
          error: {
            message: `Request body must contatin either 'title', 'url', 'description', or 'rating'`
          }
        })
      }

      const error = getBookmarkValidationError(bookmarkToUpdate)

      if(error) return res.status(400).send(error)

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