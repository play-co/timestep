let exports = {};

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
import {
  isArray,
  merge,
  GLOBAL,
  CACHE,
  NATIVE,
  logger,
  bind
} from 'base';

import i18n from './i18n';
import Callback from 'lib/Callback';
import Emitter from 'event/Emitter';
import AudioManager from 'AudioManager';
import userAgent from 'userAgent';

var LOW_RES_KEY = 'low_res_';
var LOW_RES_ENABLED = false;
if (userAgent.OS_TYPE === 'Android') {
  LOW_RES_ENABLED = CONFIG.android.enableLowRes;
} else if (userAgent.OS_TYPE === 'iPhone OS') {
  LOW_RES_ENABLED = CONFIG.ios.enableLowRes;
}

var _cache = {};

var MIME = {
  '.js': 'text',
  '.png': 'image',
  '.jpg': 'image',
  '.bmp': 'image',
  '.css': 'css',
  '.html': 'html',
  '.mp3': 'audio',
  '.ogg': 'audio',
  '.mp4': 'audio',
  '.3gp': 'audio',
  '.m4a': 'audio',
  '.aac': 'audio',
  '.flac': 'audio',
  '.mkv': 'audio',
  '.wav': 'audio'
};

var globalItemsToLoad = 0;
var globalItemsLoaded = 0;

var _soundManager = null;
var _soundLoader = null;



class Loader extends Emitter {

  get progress () {
    return globalItemsToLoad > 0 ? globalItemsLoaded / globalItemsToLoad : 1;
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

  get (file) {
    return 'resources/images/' + file;
  }

  addSheets (sheets) {
    Object.keys(sheets).forEach(function (name) {
      // exclude sheets of the resolution not in use
      var isLowRes = name.indexOf(LOW_RES_KEY) >= 0;
      if (LOW_RES_ENABLED !== isLowRes) { return; }

      var sheet = sheets[name];
      sheet.forEach(function (info) {
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
      }, this);
    }, this);

    this._originalMap = this._map;
  }

  addAudioMap (map) {
    Object.keys(map).forEach(function (name) {
      this._audioMap[name] = true;
    }, this);
  }

  preload (pathPrefix, opts, cb) {
    if (typeof opts == 'function') {
      cb = opts;
      opts = undefined;
    }

    // process an array of items, where cb is run at completion of the final one
    if (isArray(pathPrefix)) {
      var chainCb = new Callback();
      pathPrefix.forEach(function (prefix) {
        if (prefix) {
          this.preload(prefix, opts, chainCb.chain());
        }
      }, this);
      cb && chainCb.run(cb);
      return chainCb;
    } else {
      pathPrefix = pathPrefix.replace(/^\//, '');
      // remove leading slash
      // if an item is found in the map, add that item's sheet to the group.
      // If there is no sheet in the map (i.e. for sounds), load that file directly.
      var preloadSheets = {};
      var map = this._map;
      for (var uri in map) {
        if (uri.indexOf(pathPrefix) === 0) {
          // sprites have sheet; sounds are just by the filename key itself
          preloadSheets[map[uri] && map[uri].sheet || uri] = true;
        }
      }

      var audioMap = this._audioMap;
      var audioToLoad = {};
      for (var uri in audioMap) {
        if (uri.indexOf(pathPrefix) === 0) {
          audioToLoad[uri] = true;
        }
      }
      var files = Object.keys(preloadSheets);
      files = files.concat(Object.keys(audioToLoad));
      // If no files were specified by the preload command,
      if (files.length == 0) {
        files = [pathPrefix];
      }

      var callback = this._loadGroup(merge({ resources: files }, opts));
      cb && callback.run(cb);
      return callback;
    }
  }

  getSound (src) {
    if (!_soundManager) {
      _soundManager = new AudioManager({ preload: true });
      _soundLoader = _soundManager.getAudioLoader();
    }

    if (GLOBAL.NATIVE && GLOBAL.NATIVE.sound && GLOBAL.NATIVE.sound.preloadSound) {
      return NATIVE.sound.preloadSound(src);
    } else {
      _soundManager.addSound(src);
      // HACK to make the preloader continue in the browser
      return {
        complete: true,
        loader: _soundLoader
      };
    }
  }

  getText(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (this.readyState === 4 && this.status === 200) {
        CACHE[url] = this.responseText;
      }
    };
    xhr.send();
    return xhr;
  }

  getImagePaths (prefix) {
    prefix = prefix.replace(/^\//, '');
    // remove leading slash
    var images = [];
    var map = this._map;
    for (var uri in map) {
      if (uri.indexOf(prefix) == 0) {
        images.push(uri);
      }
    }
    return images;
  }

  getImage (src, noWarn) {
    // create the image
    var img = new Image();
    img.crossOrigin = 'use-credentials';

    // find the base64 image if it exists
    if (Image.get) {
      var b64 = Image.get(src);
      if (b64 instanceof Image) {
        return b64;
      }
    }

    if (b64) {
      img.src = b64;
      Image.set(src, img);
    } else {
      if (!noWarn) {
        logger.warn('Preload Warning:', src, 'not properly cached!');
      }
      img.src = src;
    }

    return img;
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

  _getRaw (type, src, copy, noWarn) {
    // always return the cached copy unless specifically requested not to
    if (!copy && _cache[src]) {
      return _cache[src];
    }
    var res = null;

    switch (type) {

      case 'audio':
        res = this.getSound(src);
        break;

      case 'image':
        res = this.getImage(src, noWarn);
        break;

      case 'text':
        res = this.getText(src);
        break;

      default:
        logger.error('Preload Error: Unknown Type', type);
    }
    return _cache[src] = res;
  }

  _loadGroup (opts, cb) {
    var timeout = opts.timeout;
    var callback = new Callback();
    var that = this;

    // compute a list of images using file extensions
    var resources = opts.resources || [];
    var n = resources.length || 0;
    var loadableResources = [];

    for (var i = 0; i < n; ++i) {
      var ext = resources[i].substring(resources[i].lastIndexOf('.')).split('|')[0];
      var type = MIME[ext];
      var found = false;
      var foundCount = 0;

      var requested;

      for (var j = 0; j < this._requestedResources.length; j++) {
        requested = this._requestedResources[j];

        if (requested.type === type && requested.resource === resources[i]) {
          found = true;
          foundCount++;
          break;
        }
      }

      if (!found) {
        if (type === 'image' || type === 'audio' || type === 'text') {
          requested = {
            type: type,
            resource: resources[i]
          };

          loadableResources.push(requested);

          this._requestedResources.push(requested);
        }

        if (type == 'image' && GLOBAL.NATIVE && NATIVE.gl) {
          NATIVE.gl.touchTexture(resources[i]);
        }
      }
    }

    // If no resources were loadable...
    if (!loadableResources.length) {
      if (!foundCount) {
        logger.warn('Preload Fail: No Loadable Resources Found');
      }

      if (cb) {
        callback.run(cb);
      }

      callback.fire();

      return callback;
    }

    // do the preload asynchronously (note that base64 is synchronous, only downloads are asynchronous)
    var nextIndexToLoad = 0;
    var numResources = loadableResources.length;
    globalItemsToLoad += numResources;
    var parallel = Math.min(numResources, opts.parallel || 5);
    // how many should we try to download at a time?
    var numLoaded = 0;

    var loadResource = bind(this, function () {
      var currentIndex = nextIndexToLoad++;
      var src = loadableResources[currentIndex];
      var res;
      if (src) {
        res = this._getRaw(src.type, src.resource, false, true);
      } else {
        // End of resource list, done!
        return;
      }

      var next = function (failed) {
        // If already complete, stub this out
        if (numLoaded >= numResources) {
          return;
        }

        // Set stubs for the reload and load events so that code
        // elsewhere can blindly call these without causing problems.
        // An alternative would be to set these to null but not every
        // piece of code that uses this does the right checks.
        res.onreload = res.onload = res.onerror = function () {};

        // The number of loads (success or failure) has increased.
        ++numLoaded;
        ++globalItemsLoaded;

        // REALLY hacky progress tracker
        if (globalItemsLoaded === globalItemsToLoad) {
          globalItemsLoaded = globalItemsToLoad = 0;
        }

        // If we have loaded all of the resources,
        if (numLoaded >= numResources) {
          // Call the progress callback with isComplete == true
          cb && cb(src, failed, true, numLoaded, numResources);

          // If a timeout was set, clear it
          if (_timeout) {
            clearTimeout(_timeout);
          }

          // Fire the completion callback chain
          logger.log('Preload Complete:', src.resource);
          callback.fire();
        } else {
          // Call the progress callback with the current progress
          cb && cb(src, failed, false, numLoaded, numResources);

          // Restart on next image in list
          setTimeout(loadResource, 0);
        }
      };

      // IF this is the type of resource that has a reload method,
      if (res.reload && res.complete) {
        // Use the magic of closures to create a chain of onreload
        // completion callbacks.  This is really important because
        // we can be be preloading the same resource twice, and we can
        // also be simultaneously preloading two groups at once.
        var prevOnLoad = res.onreload;
        var prevOnError = res.onerror;

        // When the resource completes loading, either with success
        // or failure:
        res.onreload = function () {
          // If previous callback exists, run it first in a chain
          prevOnLoad && prevOnLoad();

          // React to successful load of this resource
          next(false);
        };

        res.onerror = function () {
          // If previous callback exists, run it first in a chain
          prevOnError && prevOnError();

          // React to failed load of this resource
          next(true);
        };

        // Start it reloading
        res.reload();
      } else if (res.complete) {
        if (res.loader) {
          // real sound loading with AudioContext ...
          res.loader.load([src.resource], next);
        } else {
          // Let subscribers know an image was loaded
          if (src.type === 'image') {
            that.emit(Loader.IMAGE_LOADED, res, src);
          }
          // Since the resource has already completed loading, go
          // ahead and invoke the next callback indicating the previous
          // success or failure.
          next(res.failed === true);
        }
      } else {
        // The comments above about onreload callback chaining equally
        // apply here.  See above.
        var prevOnLoad = res.onload;
        var prevOnError = res.onerror;

        // When the resource completes loading, either with success
        // or failure:
        res.onload = function () {
          // If previous callback exists, run it first in a chain
          prevOnLoad && prevOnLoad();

          // Reset fail flag
          res.failed = false;

          // Let subscribers know an image was loaded
          if (src.type === 'image') {
            that.emit(Loader.IMAGE_LOADED, res, src);
          }

          // React to successful load of this resource
          next(false);
        };

        res.onerror = function () {
          // If previous callback exists, run it first in a chain
          prevOnError && prevOnError();

          // Set fail flag
          res.failed = true;

          // React to failed load of this resource
          next(true);
        };
      }
    });

    var _timeout = null;
    setTimeout(function () {
      // spin up n simultaneous loaders!
      for (var i = 0; i < parallel; ++i) {
        loadResource();
      }

      // register timeout call
      if (timeout) {
        _timeout = setTimeout(function () {
          logger.warn('Preload Timeout: Something Failed to Load');
          callback.fire();
          numLoaded = numResources;
        }, timeout);
      }
    }, 0);
    return callback;
  }

}



Loader.prototype._map = {};
Loader.prototype._originalMap = {};
Loader.prototype._audioMap = {};
Loader.prototype._requestedResources = [];
Loader.IMAGE_LOADED = 'imageLoaded';

exports = new Loader();

exports.IMAGE_LOADED = Loader.IMAGE_LOADED;
exports.LOW_RES_ENABLED = LOW_RES_ENABLED;
exports.LOW_RES_KEY = LOW_RES_KEY;

export default exports;
