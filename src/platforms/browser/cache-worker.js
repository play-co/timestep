// jshint service-worker globals:
/* global caches: false, self: false, fetch: false, Cache: false, CacheStorage:
 false, importScripts: false, Request: false */
// --- POLYFILL
// https://raw.githubusercontent.com/coonsta/cache-polyfill/master/dist/serviceworker-cache-polyfill.js
if (!Cache.prototype.add) {
  Cache.prototype.add = function add (request) {
    return this.addAll([request]);
  };
}

if (!Cache.prototype.addAll) {
  Cache.prototype.addAll = function addAll (requests) {
    var cache = this;

    // Since DOMExceptions are not constructable:
    function NetworkError (message) {
      this.name = 'NetworkError';
      this.code = 19;
      this.message = message;
    }
    NetworkError.prototype = Object.create(Error.prototype);

    return Promise.resolve().then(function () {
      if (arguments.length < 1)
        { throw new TypeError(); }

      requests = requests.map(function (request) {
        if (request instanceof Request) {
          return request;
        } else {
          return String(request);
        }
      });

      // may throw TypeError
      return Promise.all(requests.map(function (request) {
        if (typeof request === 'string') {
          request = new Request(request);
        }

        var scheme = new URL(request.url).protocol;

        if (scheme !== 'http:' && scheme !== 'https:') {
          throw new NetworkError('Invalid scheme');
        }

        return fetch(request.clone());
      }));
    }).then(function (responses) {
      // TODO: check that requests don't overwrite one another
      // (don't think this is possible to polyfill due to opaque responses)
      return Promise.all(responses.map(function (response, i) {
        return cache.put(requests[i], response);
      }));
    }).then(function () {
      return undefined;
    });
  };
}

if (!CacheStorage.prototype.match) {
  // This is probably vulnerable to race conditions (removing caches etc)
  CacheStorage.prototype.match = function match (request, opts) {
    var caches = this;

    return this.keys().then(function (cacheNames) {
      var match;

      return cacheNames.reduce(function (chain, cacheName) {
        return chain.then(function () {
          return match || caches.open(cacheName).then(function (
            cache) {
            return cache.match(request, opts);
          }).then(function (response) {
            match = response;
            return match;
          });
        });
      }, Promise.resolve());
    });
  };
}

// --- END POLYFILL
console.log('cache-worker starting at', location.toString());

// devkit app data
var APP_ID = 'INSERT:APP_ID';

var APP_VERSION = 'INSERT:APP_VERSION';

var ALLOW_MULTIPLE_APPS_PER_DOMAIN = 'INSERT:ALLOW_MULTIPLE_APPS_PER_DOMAIN';

// per-origin-cache, if hosting multiple games from the same domain this might
// get large?
var CACHE_NAME_PREFIX = 'devkit-game-';
var CACHE_NAME_APP_PREFIX = CACHE_NAME_PREFIX + APP_ID + '-';
var CACHE_NAME = CACHE_NAME_APP_PREFIX + APP_VERSION;

// these are URLs we've already loaded by the time the worker is running, just
// cache these explicitly
var BASE_URLS = ['INSERT:BASE_URLS'];

var hostURL = location;

var whitelistOrigins = [];
var blacklistURLs = [];

function addToList (list, pattern) {
  if (!list._patterns) {
    list._patterns = {};
  }

  if (pattern in list._patterns) {
    return;
  }

  list._patterns[pattern] = true;
  list.push(convertToRegexp(pattern));
}

function convertToRegexp (pattern) {
  if (typeof pattern == 'string') {
    return new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*'));
  }

  return pattern;
}

// don't cache anything that looks like an api
addToList(blacklistURLs, /\/api\//);

// cache everything on this domain
addToList(whitelistOrigins, location.origin);

self.addEventListener('install', function (event) {
  // Take over immediately from old service-worker if we're the new version. by
  // default install finishes, then activate runs and tabs need to be
  // closed/reopened before the new version takes over.
  if (event.replace) {
    event.replace();
  }

  console.log('installing...');

  // init new cache with base urls
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    console.log('[install] caching:\n', BASE_URLS.join('\n '));
    return cache.addAll(BASE_URLS);
  }).then(function () {
    console.log('[install] finished');
  }).catch(function (e) {
    console.error('error installing:', e);
  }));
});

self.addEventListener('activate', function (event) {
  console.log('activating...');

  // remove old caches
  event.waitUntil(caches.keys().then(function (cacheNames) {
    return Promise.all(cacheNames.map(function (cacheName) {
      // if multiple apps are allowed, only older versions of cache for this
      // app id, else remove all devkit-app caches except this one
      var prefix = ALLOW_MULTIPLE_APPS_PER_DOMAIN ?
        CACHE_NAME_APP_PREFIX : CACHE_NAME_PREFIX;

      if (cacheName.indexOf(prefix) === 0 && cacheName !==
        CACHE_NAME) {
        console.error('[activate] removing cache', cacheName);
        return caches.delete(cacheName);
      } else {
        console.error('[activate] keeping cache', cacheName);
      }
    }));
  }).then(function () {
    console.log('[activate] finished');
  }));
});

function skipCache (request) {
  var origin = new URL(request.url).origin;

  for (var i = 0, n = blacklistURLs.length; i < n; ++i) {
    if (blacklistURLs[i].test(origin)) {
      return false;
    }
  }

  for (var i = 0, n = whitelistOrigins.length; i < n; ++i) {
    if (whitelistOrigins[i].test(origin)) {
      return false;
    }
  }

  return true;
}

// handle cache
self.addEventListener('fetch', function (event) {
  var request = event.request;

  // var client = event.client;
  // all other requests hit cache first, then if not in the cache, make the
  // request and cache the response
  event.respondWith(caches.match(event.request).then(function (response) {
    // Cache hit - return response
    if (response) {
      return response;
    }

    // requests that don't get cached
    if (skipCache(request)) {
      console.log('skipping cache for', request.url);
      return fetch(request);
    }

    // requests that only check cache (fail if not in cache)
    if (request.headers.get('Accept') == 'x-cache/only') {
      console.log('cache lookup failed for', request.url);
      return;
    }

    return Promise.all([
      fetch(request.clone()),
      caches.open(CACHE_NAME)
    ]).then(function (results) {
      var response = results[0];
      var cache = results[1];
      cache.put(request, response.clone()).then(function () {
        console.log('cached', request.url);
      }, function (e) {
        console.error('could not cache', request.url, e);
      });
      return response;
    });
  }));
});

// handle cache events
self.addEventListener('message', function (event) {
  console.log(event.waitUntil);
  console.log('received command', event.data.command);
  switch (event.data.command) {
    case 'addURLs':
      var urls = event.data.urls;
      console.log('[add] adding', urls.length, 'urls to cache');
      cacheURLs(urls).then(function (res) {
        console.log('[add] completed');
        event.ports[0].postMessage({
          status: 'complete',
          failedURLs: res.failedURLs
        });
      });
      break;
    case 'addWhitelistDomain':
      console.log('[add] whitelist domain:', event.data.domain);
      addToList(whitelistOrigins, event.data.domain);
      break;
    default:
      console.error('command unknown:', event.data.command);
      break;
  }
});

// cache a list of URLs, returning a promise that resolves to an
// object:
// {
//   failedURLs: [ list of urls that couldn't be cached ]
// }
function cacheURLs (urls) {
  return new Promise(function (resolve, reject) {
    var failedURLs = [];
    var index = 0;
    cacheNext();

    function cacheNext () {
      // tried to cache all URLs, resolve the promise
      if (index >= urls.length) {
        return resolve({ failedURLs: failedURLs });
      }

      // no-cors lets us cache cross-origin URLs
      var url = urls[index];
      var request = new Request(url, { mode: 'no-cors' });
      ++index;

      // look in cache first, then fetch and track errors
      caches.match(request).then(function (response) {
        if (response) {
          cacheNext();
        } else {
          caches.open(CACHE_NAME).then(function (cache) {
            return cache.add(request);
          }).then(cacheNext, function onCacheFail (e) {
            console.error('failed to cache', url, e);
            failedURLs.push(url);
            cacheNext();
          });
        }
      });
    }
  });
}
