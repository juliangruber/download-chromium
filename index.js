'use strict'

const os = require('os')
const { format, promisify } = require('util')
const fs = require('fs')
const mkdir = promisify(fs.mkdir)
const stat = promisify(fs.stat)
const unlink = promisify(fs.unlink)
const assert = require('assert')
const pipe = require('promisepipe')
const got = require('got')
const extract = promisify(require('extract-zip'))
const debug = require('debug')('download-chromium')
const cpr = promisify(require('cpr'))
const mkdirp = promisify(require('mkdirp'))
const { getProxyForUrl } = require('proxy-from-env')
const ProxyAgent = require('proxy-agent')

// Windows archive name changed at r591479.
const revisionChange = 591479
const get = (url, onProgress) => {
  const proxy = getProxyForUrl(url)
  const agent = proxy ? new ProxyAgent(proxy) : undefined
  const result = got.stream(url, { agent })
  if (onProgress) {
    result.on('downloadProgress', onProgress)
  }
  return result
}

const downloadURLs = {
  linux:
    'https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/%d/%s.zip',
  mac:
    'https://storage.googleapis.com/chromium-browser-snapshots/Mac/%d/%s.zip',
  win32:
    'https://storage.googleapis.com/chromium-browser-snapshots/Win/%d/%s.zip',
  win64:
    'https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/%d/%s.zip'
}

const archiveName = (platform, revision) => {
  if (platform === 'linux') return 'chrome-linux'
  if (platform === 'mac') return 'chrome-mac'
  if (platform === 'win32' || platform === 'win64') {
    return revision > revisionChange ? 'chrome-win' : 'chrome-win32'
  }
  return null
}

const downloadURL = (platform, revision) => {
  return format(
    downloadURLs[platform],
    revision,
    archiveName(platform, revision)
  )
}

const currentPlatform = (p => {
  if (p === 'darwin') return 'mac'
  if (p === 'linux') return 'linux'
  if (p === 'win32') return os.arch() === 'x64' ? 'win64' : 'win32'
  return ''
})(os.platform())

const cacheRoot = `${os.homedir()}/.chromium-cache`
const getFolderPath = (root, platform, revision) =>
  `${root}/${platform}-${revision}`

const getExecutablePath = (root, platform, revision) => {
  const folder = getFolderPath(root, platform, revision)
  const archiveFolder = archiveName(platform, revision)

  if (platform === 'mac') {
    return `${folder}/${archiveFolder}/Chromium.app/Contents/MacOS/Chromium`
  }
  if (platform === 'linux') {
    return `${folder}/${archiveFolder}/chrome`
  }

  return `${folder}/${archiveFolder}/chrome.exe`
}

/*
 * - [x] check module cache
 * - [x] if exists, return
 * - [x] check global cache
 * - [x] if exists, copy and return
 * - [x] install into global cache
 * - [x] copy and return
 */

const copyCacheToModule = async (
  moduleExecutablePath,
  platform,
  revision,
  installPath
) => {
  await mkdirp(getFolderPath(installPath, platform, revision))
  await cpr(
    getFolderPath(cacheRoot, platform, revision),
    getFolderPath(installPath, platform, revision)
  )
}

module.exports = async ({
  platform: platform = currentPlatform,
  revision: revision = '499413',
  log: log = false,
  installPath: installPath = `${__dirname}/.local-chromium`,
  onProgress
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
    await copyCacheToModule(
      moduleExecutablePath,
      platform,
      revision,
      installPath
    )
    return moduleExecutablePath
  }

  let url = downloadURL(platform, revision)
  assert(downloadURLs[platform], `Unsupported platform: ${platform}`)
  debug('download url %s', url)

  try {
    await mkdir(cacheRoot)
  } catch (_) {}
  const folderPath = getFolderPath(cacheRoot, platform, revision)
  const zipPath = `${folderPath}.zip`

  if (log) process.stderr.write(`Downloading Chromium r${revision}...`)
  debug('download')
  await pipe(
    await get(url, onProgress),
    fs.createWriteStream(zipPath)
  )

  debug('extract')
  await extract(zipPath, { dir: folderPath })

  debug('clean up')
  await unlink(zipPath)

  debug('copy cache to module')
  await copyCacheToModule(moduleExecutablePath, platform, revision, installPath)

  if (log) process.stderr.write('Done!\n')
  return moduleExecutablePath
}
