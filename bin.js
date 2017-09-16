#!/usr/bin/env node
'use strict'

const download = require('.')

download()
  .then(exec => console.log(exec))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
