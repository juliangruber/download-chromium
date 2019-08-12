# download-chromium

[![Build Status](https://travis-ci.org/juliangruber/download-chromium.svg?branch=master)](https://travis-ci.org/juliangruber/download-chromium)

Download [Chromium](https://www.chromium.org/)!

Caches executables locally so you never download them twice.

Comes with a convenient CLI, so you can do things like this:

```bash
$ $(download-chromium) --headless --screenshot --disable-gpu https://twitter.com/
```

## Usage

Use the CLI:

```bash
$ download-chromium
Downloading Chromium r499413...Done!
/Users/julian/.chromium-cache/chromium-mac-499413/chrome-mac/Chromium.app/Contents/MacOS/Chromium
```

Or use the JavaScript API:

```js
const download = require('download-chromium')

const exec = await download()
console.log(`Downloaded Chromium to ${exec}`)
```

```bash
$ node example.js
Downloaded Chromium to /Users/julian/.chromium-cache/chromium-mac-499413/chrome-mac/Chromium.app/Contents/MacOS/Chromium
```

## Installation

```bash
# for the CLI

$ npm install -g download-chromium

# for the API

$ npm install download-chromium
```

## API

### download
```
download({ 
	platform = currentPlatform, 
	revision = '499413', 
	log = false, 
	onProgress = undefined, 
	installPath = '{__dirname}/.local-chromium' })
```
Returns a Promise resolving with the Chromium executable path.

* `installPath`: set the install path if you can't write to your `node_modules`, eg from within an `electron` packaged app (`installPath: require('electron').app.getPath('userData')`)
* `onProgress`: track download progress. `onProgress` receives one argument `{ percent, transferred, total }` 

## Kudos

This script was based on https://github.com/GoogleChrome/puppeteer/blob/master/utils/ChromiumDownloader.js.

## License

MIT
