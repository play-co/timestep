let exports = {};

import device from 'device';

import { CONFIG } from 'base';

var _cacheWorker;

function init () {
  return navigator.serviceWorker.register('cache-worker.js', { scope: 'cache-worker.js' })
    .then(function (reg) {
      // try to grab the just-registered worker to send it the cache message
      _cacheWorker = reg.installing || reg.waiting || reg.active;

      if (reg.installing) {
        console.log('cache worker installing...');
      } else if (reg.waiting) {
        console.log(
          'cache worker waiting to activate (close, then reopen app)');
      } else if (reg.active) {
        console.log('cache worker already active!');
      } else {
        console.error('unknown cache worker state?');
      }
    }, function (err) {
      console.log('cache worker failed', err);
    });
}

if (CONFIG.disableServiceWorkers) {
  exports.isEnabled = false;
} else {
  exports.isEnabled = 'serviceWorker' in navigator && !device.isSimulator;
}

import loader from 'ui/resource/loader';

var _onInit;
if (exports.isEnabled) {
  _onInit = init();

  // cache spritesheets after init
  Promise.resolve(_onInit).then(function () {
    // cache spritesheets
    var map = loader.getMap();
    var sheets = {};
    for (var uri in map) {
      if (map[uri].sheet) {
        sheets[map[uri].sheet] = true;
      }
    }

    var urls = Object.keys(sheets);

    // cache the current URL (index.html is cached, but we might be loading /
    // instead)
    urls.unshift(window.location.toString());

    return exports.addToCache(urls);
  }).then(function (res) {
    console.log('spritesheets now available offline');

    if (res && res.failedURLs && res.failedURLs.length > 0) {
      console.error('following spritesheets failed to load:', res.failedURLs);
    }
  });
}

exports.addWhitelistDomain = function (domain) {
  if (!_onInit) {
    return Promise.reject(new Error('cache not available'));
  }

  // block on init
  return Promise.resolve(_onInit).then(function () {
    return sendMessage({
      command: 'addWhitelistDomain',
      domain: domain
    });
  });
};

// Accepts a url or array of urls to cache
// Returns a promise that resolves after caching, with any urls that failed to
// cache
exports.addToCache = function (urls) {
  if (!Array.isArray(urls)) {
    urls = [urls];
  }

  if (!_onInit) {
    return Promise.reject(new Error('cache not available'));
  }

  // block on init
  return Promise.resolve(_onInit).then(function () {
    return sendMessage({
      command: 'addURLs',
      urls: urls
    });
  });
};

// from https://github.com/GoogleChrome/samples/blob/gh-pages/service-worker/post-message/index.html
function sendMessage (message) {
  // This wraps the message posting/response in a promise, which will resolve if the response doesn't
  // contain an error, and reject with the error if it does. If you'd prefer, it's possible to call
  // controller.postMessage() and set up the onmessage handler independently of a promise, but this is
  // a convenient wrapper.
  return new Promise(function (resolve, reject) {
    var messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function (event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    if (!_cacheWorker) {
      reject(new Error('no worker found'));
    }

    // This sends the message data as well as transferring messageChannel.port2 to the service worker.
    // The service worker can then use the transferred port to reply via postMessage(), which
    // will in turn trigger the onmessage handler on messageChannel.port1.
    // See https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
    _cacheWorker.postMessage(message, [messageChannel.port2]);
  });
}

export default exports;
