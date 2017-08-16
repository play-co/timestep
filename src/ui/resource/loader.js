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
import { isArray, logger } from 'base';

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

class AssetCallback {
  constructor (cb, index) {
    this.cb = cb;
    this.index = index;
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

class Loader extends Emitter {
  constructor () {
    super();

    this._crossOrigin = undefined;

    this._user = null;
    this._password = null;

    this._map = {};
    this._originalMap = {};
    this._audioMap = {};
    this._priorities = {};

    this._nbRequestedResources = 0;
    this._currentRequests = {};
    this._assetCallbacks = {};
    this._assetCrossOrigins = {};

    this._logRequests = false;

  }

  setAssetCrossOrigin (url, crossOrigin) {
    this._assetCrossOrigins[url] = crossOrigin;
  }

  toggleRequests () {
    this._logRequests = !this._logRequests;
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
        var assetID = info.f;
        this._map[assetID] = {
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

    if (this._logRequests) {
      logger.warn('Asset Loaded:', url);
    }

    var callbacksData = this._assetCallbacks[url];
    if (callbacksData) {
      for (var c = 0; c < callbacksData.length; c += 1) {
        var callbackData = callbacksData[c];
        callbackData.cb(asset, callbackData.index);
      }
      delete this._assetCallbacks[url];
    }

    // Asset no longer a request
    delete this._currentRequests[url];

  }

  _loadAsset (url, loadMethod, cb, priority, isExplicit, index) {
    if (!url) {
      logger.warn('loader: The image url is empty.');
      return cb && cb(null, index);
    }

    var cache = loadMethod.cache;
    if (cache) {
      var asset = cache[url];
      if (asset) {
        return cb && cb(asset, index);
      }
    }

    if (priority === null || priority === undefined) {
      priority = this._priorities[url];
    }

    if (this._logRequests) {
      logger.warn('Asset Requested:', url);
    }

    if (cb) {
      var callbackData = new AssetCallback(cb, index);
      var assetRequests = this._assetCallbacks[url];
      if (assetRequests) {
        assetRequests.push(callbackData);
      } else {
        this._assetCallbacks[url] = [callbackData];
      }
    }

    if (!isExplicit) {
      // Only explicit load requests go through
      return;
    }

    if (this._logRequests) {
      logger.warn('Asset Request went through:', url);
    }

    if (!this._currentRequests[url]) {
      this._currentRequests[url] = true;
      this._nbRequestedResources += 1;
      loadMethod(url, (asset) => this._onAssetLoaded(asset, url, cache), this, priority, isExplicit);
    }
  }

  _loadAssets (urls, loadMethod, cb, priority, isExplicit, onAssetLoaded) {
    var assets = [];
    if (urls.length === 0) {
      return cb && cb(assets);
    }

    var nbRequestsSatisfied = 0;
    var nbRequests = urls.length;
    function onRequestSatisfied(asset, index) {
      assets[index] = asset;
      nbRequestsSatisfied += 1;
      if (onAssetLoaded) {
        onAssetLoaded(asset, index);
      }

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
    var extension = url.substring(url.lastIndexOf('.')).split('?')[0];
    var loadMethod = loadMethodsByExtension[extension];
    return loadMethod;
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

  setLowResEnabled (value) {
    LOW_RES_ENABLED = value;
    Loader.prototype.LOW_RES_ENABLED = value;
  }

}

Loader.prototype.IMAGE_LOADED = 'imageLoaded';
Loader.prototype.PRIORITY_LOW = loaders.PRIORITY_LOW;
Loader.prototype.PRIORITY_MEDIUM = loaders.PRIORITY_MEDIUM;
// Loader.prototype.PRIORITY_HIGH = loaders.PRIORITY_HIGH;

Loader.prototype.LOW_RES_ENABLED = LOW_RES_ENABLED;

var loadMethods = {};
loadMethods.loadImage = loadImage;
loadMethods.loadJSON = loadJSON;
loadMethods.loadSound = loadSound;
loadMethods.loadFile = loadFile;
Loader.prototype.loadMethods = loadMethods;

export default new Loader();
