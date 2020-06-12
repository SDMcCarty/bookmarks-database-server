const BookmarksService = {
  getAllBookmarks(knex) {
    return knex.select('*').from('bookmark_table')
  },

  getById(knex, id) {
    return knex
      .from('bookmark_table')
      .select('*')
      .where('id', id)
      .first()
  },

  insertBookmark(knex, newBookmark) {
    return knex
      .insert(newBookmark)
      .into('bookmark_table')
      .returning('*')
      .then(rows => {
        return rows[0]
      })
    },

    deleteBookmark(knex, id) {
      return knex('bookmark_table')
        .where({ id })
        .delete()
    },

    updateBookmark(knex, id, newBookmarkFields) {
      return knex('bookmark_table')
        .where({ id })
        .update(newBookmarkFields)
    },


}

module.exports = BookmarksService