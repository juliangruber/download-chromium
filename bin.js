#!/usr/bin/env node
'use strict'

const download = require('.')

function onProgress ({ percent, transferred, total }) {
  console.log(
    `progress: ${Math.round(
      percent * 100
    )}% (transferred ${transferred} out of ${total})`
  )
}
download({
  log: true,
  onProgress
})
  .then(exec => console.log(exec))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
