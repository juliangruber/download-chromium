# download-chromium

Download [Chromium](https://www.chromium.org/)!

Caches executables locally so you never download them twice.

## Usage

```js
const download = require('download-chromium')

const exec = await download()
console.log(`Downloaded Chromium to ${exec}`)
```

## Installation

```bash
$ npm install download-chromium
```

## API

### download({ platform = currentPlatform, revision = '499413' })

Returns a Promise resolving with the Chromium executable path.

## Kudos

This script was based on https://github.com/GoogleChrome/puppeteer/blob/master/utils/ChromiumDownloader.js.

## License

MIT
