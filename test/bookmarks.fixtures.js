function makeBookmarksArray() {
  return[
    {
      id: 1,
      title:'Bookmark First',
      url: 'http://wwww.firsts.com',
      description: 'The firsts',
      rating: 5
    },
    {
      id: 2,
      title: 'Second is arguably the best',
      url: 'http://wwww.seconds.com',
      description: 'But is it really?',
      rating: 5
    },
    {
      id: 3,
      title: 'third',
      url: 'http://wwww.third.com',
      description: 'third',
      rating: 3
    },
    {
      id: 4,
      title: 'Lasts',
      url: 'http://wwww.cominginlast.com',
      description: 'Is like coming in first, but fourth',
      rating: 4
    }
  ];
}

function makeMaliciousBookmark() {
  const maliciousBookmark = {
    id: 911,
    url: 'http://www.bad.com',
    rating: 1,
    title: 'Naughty naughty very naughty <script>alert("xss");</script>',
    description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
  }
  const expectedBookmark = {
    ...maliciousArticle,
    title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  }
  return {
    maliciousBookmark,
    expectedBookmark,
  }
}

module.exports = {
  makeBookmarksArray,
  makeMaliciousBookmark,
}