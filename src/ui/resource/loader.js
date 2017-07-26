/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

import i18n from './i18n';
import Emitter from 'event/Emitter';
import userAgent from 'userAgent';
import loaders from 'ui/resource/primitiveLoaders';
import { isArray } from 'base';

var LOW_RES_KEY = 'low_res_';
var LOW_RES_ENABLED = false;
if (userAgent.OS_TYPE === 'Android') {
  LOW_RES_ENABLED = CONFIG.android.enableLowRes;
} else if (userAgent.OS_TYPE === 'iPhone OS') {
  LOW_RES_ENABLED = CONFIG.ios.enableLowRes;
}

// special application resolution settings
var RES_KEY = CONFIG.appID + '.resolution';
var _resolution = '';

try {
  _resolution = localStorage.getItem(RES_KEY) || '';
} catch (e) {}

if (_resolution === 'LOW') {
  LOW_RES_ENABLED = true;
} else if (_resolution === 'HIGH') {
  LOW_RES_ENABLED = false;
}

// TODO: add http2 detection (following piece of code only works in chrome apparently)
// Detection for HTTP2 client support
// We suppose that server will provide assets over HTTP2
// see https://stackoverflow.com/questions/36041204/detect-connection-protocol-http-2-spdy-from-javascript
// var IS_HTTP2 = false;
// if (performance && performance.timing) {
//   IS_HTTP2 = performance.timing.nextHopProtocol === 'h2';
// }
// if (!IS_HTTP2 && chrome && chrome.loadTimes) {
//   IS_HTTP2 = chrome.loadTimes().connectionInfo === 'h2';
// }


var PRIORITY_LOW = 1;
var PRIORITY_MEDIUM = 2;
// TODO: implement high priority assets?
// var PRIORITY_HIGH = 3;

var MAX_PARALLEL_LOADINGS = 7;

class LoadRequest {
  constructor (url, loadMethod, cb, priority, isExplicit, index) {
    this.url = url;
    this.loadMethod = loadMethod;
    this.cb = cb;
    this.index = index;
    this.isExplicit = isExplicit;
  }
}

class LoadRequestGroup {
  constructor (loader, cb, blockImplicitRequests, priority) {
    this.loader = loader;
    this.urls = [];
    this.loadMethods = [];
    this.cb = cb;
    this.priority = priority;
    this.blockImplicitRequests = blockImplicitRequests;
  }

  addAsset (url) {
    var priority;
    var loadMethod;
    var blockImplicitRequests;
    // TODO: refactor this logic ?
    // type checking => method not fully optimized
    if (typeof url !== 'string') {
      priority = url.priority;
      blockImplicitRequests = url.blockImplicitRequests;
      loadMethod = url.loadMethod;
      url = url.url;
    }

    if (priority === undefined) { priority = this.priority; }
    if (blockImplicitRequests === undefined) { blockImplicitRequests = this.blockImplicitRequests; }
    if (!loadMethod) { loadMethod = this.loader._getLoadMethod(url); }

    if (loadMethod === loadImage) {
      url = this.loader._getImageURL(url);
    }

    this.urls.push(url);
    this.loadMethods.push(loadMethod);

    if (blockImplicitRequests) {
      this.loader._waitForExplicitRequest[url] = true;
    }

    return url;
  }

  removeAsset (url) {
    // TODO: optimize, bad algorithm complexity
    var idx = this.urls.indexOf(url);
    if (idx !== -1) {
      this.urls.splice(idx, 1);
      this.loadMethods.splice(idx, 1);
    }
  }

  load (cb) {
    this.loader._loadAssets(this.urls, this.loadMethods, () => {
      if (this.cb) { this.cb(); }
      return cb && cb();
    }, this.priority, true);
  }
}

var loadFile = loaders.loadFile;
var loadJSON = loaders.loadJSON;
var loadImage = loaders.loadImage;
var loadSound = loaders.loadSound;
var loadMethodsByExtension = {
  '.js': loadFile,
  '.json': loadJSON,
  '.png': loadImage,
  '.jpg': loadImage,
  '.bmp': loadImage,
  '.mp3': loadSound,
  '.ogg': loadSound,
  '.mp4': loadSound,
  '.3gp': loadSound,
  '.m4a': loadSound,
  '.aac': loadSound,
  '.flac': loadSound,
  '.mkv': loadSound,
  '.wav': loadSound,
  // untested
  '.css': loadFile,
  '.html': loadFile
};

var implicitRequests = [];

class Loader extends Emitter {
  constructor () {
    super();

    this._crossOrigin = undefined;

    this._user = null;
    this._password = null;

    this._loadRequests = {}; // Loading informations of all the assets that were required to load
    this._requestBacklog = []; // Assets waiting to start loading
    this._lowPriorityBackLog = [];
    this._nbAssetsLoading = 0; // Number of assets currently being loaded

    this._map = {};
    this._originalMap = {};
    this._audioMap = {};
    this._waitForExplicitRequest = {};

    this._nbRequestedResources = 0;
    this._currentRequests = {};
  }

  get nextProgress () {
    // returns progress that will be achieve once next asset is loaded
    var nbAssets = this._nbRequestedResources;
    if (nbAssets === 0) {
      return 1;
    }

    var nbAssetsRemaining = this._lowPriorityBackLog.length + this._requestBacklog.length + this._nbAssetsLoading;
    if (nbAssetsRemaining === 0) {
      return 1;
    }

    return (nbAssets - nbAssetsRemaining + 1) / nbAssets;
  }

  get progress () {
    var nbAssets = this._nbRequestedResources;
    if (nbAssets === 0) {
      return 1;
    }

    var nbAssetsRemaining = this._lowPriorityBackLog.length + this._requestBacklog.length + this._nbAssetsLoading;
    return (nbAssets - nbAssetsRemaining) / nbAssets;
  }

  addAudioMap (map) {
    for (var name in map) {
      this._audioMap[name] = true;
    }
  }

  has (src) {
    return this._map[src];
  }

  restoreMap () {
    this._map = this._originalMap;
  }

  getMap () {
    return this._map;
  }

  setMap (language) {
    this.restoreMap();
    if (!language) {
      this._map = i18n.localizeResourceMap(this._map);
    } else {
      this._map = i18n.applyResourceMap(this._map, language);
    }
  }

  addSheets (sheets) {
    for (var name in sheets) {
      var isLowRes = name.indexOf(LOW_RES_KEY) >= 0;
      if (LOW_RES_ENABLED !== isLowRes) { continue; }

      var sheet = sheets[name];
      for (var i = 0; i < sheet.length; i += 1) {
        var info = sheet[i];
        this._map[info.f] = {
          sheet: name,
          x: info.x || 0,
          y: info.y || 0,
          w: info.w || 0,
          h: info.h || 0,
          scale: info.s || 1,
          marginTop: info.t || 0,
          marginRight: info.r || 0,
          marginBottom: info.b || 0,
          marginLeft: info.l || 0
        };
      }
    }

    this._originalMap = this._map;
  }

  _updateImageMap (map, url, x, y, w, h) {
    x = x || 0;
    y = y || 0;
    w = w == undefined ? -1 : w;
    h = h == undefined ? -1 : h;

    var info = this._map[url];
    if (!info || !info.sheet) {
      map.x = x;
      map.y = y;
      map.width = w;
      map.height = h;
      map.scale = 1;
      map.url = url;
      return;
    }

    var scale = info.scale || 1;

    // calculate the source rectangle, with margins added to the edges
    // (disregarding the fact that they may fall off the edge of the sheet)
    map.x = info.x - info.marginLeft;
    map.y = info.y - info.marginTop;
    map.width = info.w + info.marginLeft + info.marginRight;
    map.height = info.h + info.marginTop + info.marginBottom;

    // Add in any source map options passed in to get the actual offsets
    map.x += x * scale;
    map.y += y * scale;
    if (w > 0) {
      map.width = w * scale;
    }
    if (h > 0) {
      map.height = h * scale;
    }

    // now updatea the margins to account for the new source map
    map.marginLeft = Math.max(0, info.x - map.x);
    map.marginTop = Math.max(0, info.y - map.y);
    map.marginRight = Math.max(0, map.x + map.width - (info.x + info.w));
    map.marginBottom = Math.max(0, map.y + map.height - (info.y + info.h));

    // and re-offset the source map to exclude margins
    map.x += map.marginLeft;
    map.y += map.marginTop;
    map.width -= map.marginLeft + map.marginRight;
    map.height -= map.marginTop + map.marginBottom;

    // the scale of the source image, if scaled in a spritesheet
    map.scale = scale;
    map.url = info.sheet;
    return map;
  }

  _onAssetLoaded (asset, url, cache) {
    // Adding asset to cache
    if (cache) {
      cache[url] = asset;
    }

    var requestsData = this._loadRequests[url];
    for (var a = 0; a < requestsData.length; a += 1) {
      var requestData = requestsData[a];
      var cb  = requestData.cb;
      if (cb) {
        cb(asset, requestData.index);
      }
    }

    // Deleting reference to assets data
    delete this._loadRequests[url];
    delete this._currentRequests[url];

    // One less asset loading
    this._nbAssetsLoading -= 1;

    // Assets might be waiting to start loading
    this._initiateAssetsLoading();
  }

  _initiateAssetLoading (loadRequest) {
    var url = loadRequest.url;
    var loadMethod = loadRequest.loadMethod;
    var cache = loadMethod.cache;
    var priority = loadMethod.prioirty;
    var isExplicit = loadMethod.isExplicit;
// console.error('LOADING', url)
    loadMethod(url, (asset) => this._onAssetLoaded(asset, url, cache), this, priority, isExplicit);
  }

  _initiateAssetsLoading () {
    while (this._nbAssetsLoading < MAX_PARALLEL_LOADINGS && this._requestBacklog.length > 0) {
      // getting the element that was inserted first
      this._nbAssetsLoading += 1;
      this._initiateAssetLoading(this._requestBacklog.shift());
    }

    // TODO: implement mechanism to take advantage of HTTP2
    // if HTTP2:
    // the idea is to always have one (and only one) low priority asset loading
    // if the limit on the number of concurrent assets loading allows it
    // if HTTP1:
    // only load low priority assets if nothing else is loading

    if (this._nbAssetsLoading === 0 && this._lowPriorityBackLog.length > 0) {
      this._nbAssetsLoading += 1;
      this._initiateAssetLoading(this._lowPriorityBackLog.shift());
    }
  }

  _loadAsset (url, loadMethod, cb, priority, isExplicit, index) {
    if (!url) {
      return cb && cb(null, index);
    }

    var cache = loadMethod.cache;
    if (cache) {
      var asset = cache[url];
      if (asset) {
// console.error('HITTING CACHE', url)
        return cb && cb(asset, index);
      }
    }
// console.warn('REQUESTING', url, priority)

    var loadRequest = new LoadRequest(url, loadMethod, cb, priority, isExplicit, index);
    if (this._loadRequests[url]) {
      this._loadRequests[url].push(loadRequest);
    } else {
      this._loadRequests[url] = [loadRequest];
    }

    if (!isExplicit && this._waitForExplicitRequest[url]) {
      return;
    }

    if (!isExplicit) {
      implicitRequests.push(url);
console.warn('Asset lazy loading:', url)
    }

    if (!this._currentRequests[url]) {
      // Asset not requested yet
      this._nbRequestedResources += 1;
      this._currentRequests[url] = true;

      if (priority === PRIORITY_LOW) {
        // low priority assets can start loading only if nothing else is loading
        if (this._nbAssetsLoading === 0) {
          this._nbAssetsLoading += 1;
          this._initiateAssetLoading(loadRequest);
        } else {
          this._lowPriorityBackLog.push(loadRequest);
        }
      } else {
        if (this._nbAssetsLoading < MAX_PARALLEL_LOADINGS) {
          this._nbAssetsLoading += 1;
          this._initiateAssetLoading(loadRequest);
        } else {
          this._requestBacklog.push(loadRequest);
        }
      }

    }
  }

  _loadAssets (urls, loadMethod, cb, priority, isExplicit) {
    var assets = [];
    if (urls.length === 0) {
      return cb && cb(assets);
    }

    var nbRequestsSatisfied = 0;
    var nbRequests = urls.length;
    function onRequestSatisfied(asset, index) {
      assets[index] = asset;
      nbRequestsSatisfied += 1;
      if (nbRequestsSatisfied === nbRequests) {
        return cb && cb(assets);
      }
    }

    if (loadMethod instanceof Array) {
      for (var u = 0; u < urls.length; u += 1) {
        this._loadAsset(urls[u], loadMethod[u], onRequestSatisfied, priority, isExplicit, u);
      }
    } else {
      for (var u = 0; u < urls.length; u += 1) {
        this._loadAsset(urls[u], loadMethod, onRequestSatisfied, priority, isExplicit, u);
      }
    }
  }

  _loadSound (url, cb, priority, isExplicit) {
    this._loadAsset(url, loadSound, cb, priority, isExplicit);
  }

  loadSound (url, cb, priority) {
    this._loadSound(url, cb, priority, true);
  }

  _loadImage (url, cb, priority, isExplicit) {
    url = this._getImageURL(url);
    this._loadAsset(url, loadImage, cb, priority, isExplicit);
  }

  loadImage (url, cb, priority) {
    this._loadImage(url, cb, priority, true);
  }

  _loadSounds (urls, cb, priority, isExplicit) {
    this._loadAssets(urls, loadSound, cb, priority, isExplicit);
  }

  loadSounds (urls, cb, priority) {
    this._loadSounds(urls, cb, priority, true);
  }

  _loadImages (urls, cb, priority, isExplicit) {
    var imageURLs = new Array(urls.length);
    for (var u = 0; u < urls.length; u += 1) {
      imageURLs[u] = this._getImageURL(urls[u]);
    }
    this._loadAssets(imageURLs, loadImage, cb, priority, isExplicit);
  }

  loadImages (urls, cb, priority, isExplicit) {
    this._loadImages(urls, cb, priority, true);
  }

  _getLoadMethod (url) {
    // Resolving loading method using extension
    // N.B only works for file types listed in loadMethods
    var extension = url.substring(url.lastIndexOf('.')).split('|')[0];
    return loadMethodsByExtension[extension];
  }

  loadAsset (url, cb, priority) {
    var loadMethod = this._getLoadMethod(url);
    if (loadMethod === loadImage) {
      url = this._getImageURL(url);
    }
    this._loadAsset(url, loadMethod, cb, priority, true);
  }

  loadAssets (urls, cb, priority) {
    var assetURLs = new Array(urls.length);
    var loadMethods = new Array(urls.length);
    for (var u = 0; u < urls.length; u += 1) {
      var url = urls[u];
      var loadMethod = this._getLoadMethod(url);
      assetURLs[u] = (loadMethod === loadImage) ? this._getImageURL(url) : url;
      loadMethods[u] = loadMethod;
    }
    this._loadAssets(assetURLs, loadMethods, cb, priority, true);
  }

  createGroup (urls, cb, blockImplicitRequests, priority) {
    var group = new LoadRequestGroup(this, cb, blockImplicitRequests, priority);

    for (var u = 0; u < urls.length; u += 1) {
      group.addAsset(urls[u]);
    }

    return group;
  }

  _getImageURL (id) {
    var spritesheet = this._map[id];
    if (spritesheet) {
      var sheet = spritesheet.sheet;
      if (sheet) {
        return sheet;
      }
    }

    return id;
  }

  constructURLs (pathPrefix) {
    var urls;
    if (isArray(pathPrefix)) {
      urls = [];
      for (var p = 0; p < pathPrefix.length; p += 1) {
        Array.prototype.push.apply(urls, this.constructURLs(pathPrefix[p]));
      }
      return urls;
    }

    var urlsMap = {};

    // remove leading slash
    pathPrefix = pathPrefix.replace(/^\//, '');

    // if an item is found in the map, add that item's sheet to the list of urls.
    // If there is no sheet in the map (i.e. for sounds), add that file directly.

    // sprites have sheet
    var imageMap = this._map;
    for (var uri in imageMap) {
      if (uri.indexOf(pathPrefix) === 0) {
        var url = this._getImageURL(uri);
        if (!urlsMap[url]) {
          urlsMap[url] = true;
        }
      }
    }

    // sounds are just by the filename key itself
    var audioMap = this._audioMap;
    for (var uri in audioMap) {
      if (uri.indexOf(pathPrefix) === 0) {
        if (!urlsMap[uri]) {
          urlsMap[uri] = true;
        }
      }
    }

    urls = Object.keys(urlsMap);
    if (urls.length === 0) {
      return [pathPrefix];
    }

    return urls;
  }

  preload (pathPrefix, cb) {
    var urls = this.constructURLs(pathPrefix);
    this.loadAssets(urls, cb);
  }

  setCrossOrigin (value) {
    this._crossOrigin = value;
  }

  setCredentials (user, password) {
    this._user = user;
    this._password = password || null;
  }

  getImplicitRequests () {
    return implicitRequests;
  }
}

Loader.prototype.IMAGE_LOADED = 'imageLoaded';
Loader.prototype.PRIORITY_LOW = PRIORITY_LOW;
Loader.prototype.PRIORITY_MEDIUM = PRIORITY_MEDIUM;
// Loader.prototype.PRIORITY_HIGH = PRIORITY_HIGH;

var loadMethods = {};
loadMethods.loadImage = loadImage;
loadMethods.loadJSON = loadJSON;
loadMethods.loadSound = loadSound;
loadMethods.loadFile = loadFile;
Loader.prototype.loadMethods = loadMethods;

export default new Loader();
