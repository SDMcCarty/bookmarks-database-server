const { isWebUri } = require('valid-url')
const logger = require('../logger')

const NO_ERRORS = null

function getBookmarkValidationError({ url, rating }) {
  if (rating &&
    (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      logger.error(`Invalid rating '${rating}' supplied`)
      return {
        error: {
          message: `'rating' must be a number between 1 and 5`
        }
      }
    }
  
  if (url && !isWebUri(url)) {
    logger.error(`Invalid url '${url}' supplied`)
    return {
      error: {
        message: `'url' must be a valid URL`
      }
    }
  }

  return NO_ERRORS
}

module.exports = {
  getBookmarkValidationError,
}