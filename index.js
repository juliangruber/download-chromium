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
const cpr = promisify(require('cpr'))
const mkdirp = promisify(require('mkdirp'))

const proxy =
  process.env.HTTPS_PROXY ||
  process.env.npm_config_https_proxy ||
  process.env.npm_config_proxy
const get = url => new Promise(resolve => https.get({ url, proxy }, resolve))

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

const homePath = require('os').homedir()
const cacheRoot = `${homePath}/.chromium-cache`
const installPath = `${__dirname}/.local-chromium`

const getFolderPath = (root, platform, revision) =>
  `${root}/chromium-${platform}-${revision}`

const getExecutablePath = (root, platform, revision) => {
  const folder = getFolderPath(root, platform, revision)
  if (platform === 'mac') {
    return `${folder}/chrome-mac/Chromium.app/Contents/MacOS/Chromium`
  }
  if (platform === 'linux') {
    return `${folder}/chrome-linux/chrome`
  }
  return `${folder}/chrome-win32/chrome.exe`
}

/*
 * - [x] check module cache
 * - [x] if exists, return
 * - [x] check global cache
 * - [x] if exists, copy and return
 * - [x] install into global cache
 * - [x] copy and return
 */

const copyCacheToModule = async (moduleExecutablePath, platform, revision) => {
  await mkdirp(getFolderPath(installPath, platform, revision))
  await cpr(
    getFolderPath(cacheRoot, platform, revision),
    getFolderPath(installPath, platform, revision)
  )
}

module.exports = async ({
  platform: platform = currentPlatform,
  revision: revision = '499413',
  log: log = false
} = {}) => {
  const moduleExecutablePath = getExecutablePath(
    installPath,
    platform,
    revision
  )
  debug('module executable path %s', moduleExecutablePath)
  try {
    await stat(moduleExecutablePath)
    return moduleExecutablePath
  } catch (_) {}

  const globalExecutablePath = getExecutablePath(cacheRoot, platform, revision)
  debug('global executable path %s', globalExecutablePath)
  let exists = false
  try {
    await stat(globalExecutablePath)
    exists = true
  } catch (_) {}

  if (exists) {
    debug('copy cache to module')
    await copyCacheToModule(moduleExecutablePath, platform, revision)
    return moduleExecutablePath
  }

  let url = downloadURLs[platform]
  assert(url, `Unsupported platform: ${platform}`)
  url = format(url, revision)
  debug('download url %s', url)

  try {
    await mkdir(cacheRoot)
  } catch (_) {}
  const folderPath = getFolderPath(cacheRoot, platform, revision)
  const zipPath = `${folderPath}.zip`

  if (log) process.stderr.write(`Downloading Chromium r${revision}...`)
  debug('download')
  await pipe(
    await get(url),
    fs.createWriteStream(zipPath)
  )

  debug('extract')
  await extract(zipPath, { dir: folderPath })

  debug('clean up')
  await unlink(zipPath)

  debug('copy cache to module')
  await copyCacheToModule(moduleExecutablePath, platform, revision)

  if (log) process.stderr.write('Done!\n')
  return moduleExecutablePath
}
