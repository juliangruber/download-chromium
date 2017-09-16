'use strict'

const download = require('.')

download()
  .then(exec => console.log(`Downloaded Chromium to ${exec}`))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
