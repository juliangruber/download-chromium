'use strict'

const os = require('os')
const { format, promisify } = require('util')
const fs = require('fs')
const mkdir = promisify(fs.mkdir)
const stat = promisify(fs.stat)
const unlink = promisify(fs.unlink)
const assert = require('assert')
const pipe = require('promisepipe')
const https = require('https')
const extract = promisify(require('extract-zip'))
const debug = require('debug')('download-chromium')

const get = url => new Promise(resolve => https.get(url, resolve))

const downloadURLs = {
  linux:
    'https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/%d/chrome-linux.zip',
  mac:
    'https://storage.googleapis.com/chromium-browser-snapshots/Mac/%d/chrome-mac.zip',
  win32:
    'https://storage.googleapis.com/chromium-browser-snapshots/Win/%d/chrome-win32.zip',
  win64:
    'https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/%d/chrome-win32.zip'
}

const currentPlatform = (p => {
  if (p === 'darwin') return 'mac'
  if (p === 'linux') return 'linux'
  if (p === 'win32') return os.arch() === 'x64' ? 'win64' : 'win32'
  return ''
})(os.platform())

const cacheRoot = process.env.NOW
  ? '.'
  : `${process.env.HOME}/.chromium-cache`

const getFolderPath = (platform, revision) =>
  `${cacheRoot}/chromium-${platform}-${revision}`

const getExecutablePath = (platform, revision) => {
  const folder = getFolderPath(platform, revision)
  if (platform === 'mac') {
    return `${folder}/chrome-mac/Chromium.app/Contents/MacOS/Chromium`
  }
  if (platform === 'linux') {
    return `${folder}/chrome-linux/chrome`
  }
  return `${folder}/chrome-win32/chrome.exe`
}

module.exports = async (
  {
    platform: platform = currentPlatform,
    revision: revision = '499413',
    log: log = false
  } = {}
) => {
  const executablePath = getExecutablePath(platform, revision)
  debug('executable path %s', executablePath)
  try {
    await stat(executablePath)
    return executablePath
  } catch (_) {}

  let url = downloadURLs[platform]
  assert(url, `Unsupported platform: ${platform}`)
  url = format(url, revision)
  debug('download url %s', url)

  try {
    await mkdir(cacheRoot)
  } catch (_) {}
  const folderPath = getFolderPath(platform, revision)
  const zipPath = `${folderPath}.zip`

  if (log) process.stderr.write(`Downloading Chromium r${revision}...`)
  debug('download')
  await pipe(await get(url), fs.createWriteStream(zipPath))

  debug('extract')
  await extract(zipPath, { dir: folderPath })

  debug('clean up')
  await unlink(zipPath)

  if (log) process.stderr.write('Done!\n')
  return executablePath
}
