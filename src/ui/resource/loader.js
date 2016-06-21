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

import .i18n;
import lib.Callback;
import event.Emitter as Emitter;

var _cache = {};

var MIME = {
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

var Loader = Class(Emitter, function () {

  var globalItemsToLoad = 0;
  var globalItemsLoaded = 0;

  this._map = {};

  // save original map
  this._originalMap = {};

  this._audioMap = {};

  Object.defineProperty(this, "progress", {
    get: function() {
      return globalItemsToLoad > 0 ? globalItemsLoaded / globalItemsToLoad : 1
    }
  });

  this.has = function (src) {
    return this._map[src];
  };

  this.restoreMap = function () {
    this._map = this._originalMap;
  };

  this.getMap = function () {
    return this._map;
  };

  // set resources map for the language
  this.setMap = function (language) {
    this.restoreMap();
    if (!language) {
      this._map = i18n.localizeResourceMap(this._map);
    } else {
      this._map = i18n.applyResourceMap(this._map, language);
    }
  };

  // TODO: rename this function...
  this.get = function (file) {
    return 'resources/images/' + file;
  };

  /**
   * Adds spritesheets to the image map
   *
   * @param {Object[]} sheets          an array of spritesheet definitions
   * @param {string}   sheets[].f      sprite filename
   * @param {number}   sheets[].x      sprite position x-coordinate (integer)
   * @param {number}   sheets[].y      sprite position y-coordinate (integer)
   * @param {number}   sheets[].w      sprite content width (without margin) (integer)
   * @param {number}   sheets[].h      sprite content height (without margin) (integer)
   * @param {number}   [sheets[].t=0]  sprite transparent margin top
   * @param {number}   [sheets[].r=0]  sprite transparent margin right
   * @param {number}   [sheets[].b=0]  sprite transparent margin bottom
   * @param {number}   [sheets[].l=0]  sprite transparent margin left
   */
  this.addSheets = function (sheets) {
    Object.keys(sheets).forEach(function (name) {
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
  };


  this.addAudioMap = function (map) {
    Object.keys(map).forEach(function (name) {
      this._audioMap[name] = true;
    }, this);
  };

  /**
   * Preload a given resource or array of resources.
   * You can specify a folder name, or even a partial filename,
   * to preload all resources that begin with that prefix.
   * For instance, in a tree like so:
   *
   * resources
   * └── images
     *     ├── boss
     *     │   ├── enemy1.png
   *     │   └── enemy2.png
     *     └── hero
     *         ├── shield.png
   *         └── sword.png
   *
   * You could preload both enemy images in either of the following
   * ways:
   *
   *     ui.resource.loader.preload("resources/images/boss/");
   *     ui.resource.loader.preload("resources/images/boss/enemy");
   *
   * Pass an array of paths to preload all at once. The callback
   * will be called when all resources have finished loading.
   *
   * This works for both images and sounds.
   */
  this.preload = function (pathPrefix, opts, cb) {
    if (typeof opts == 'function') {
      cb = opts;
      opts = undefined;
    }

    // process an array of items, where cb is run at completion of the final one
    if (isArray(pathPrefix)) {
      var chainCb = new lib.Callback();
      pathPrefix.forEach(function (prefix) {
        if (prefix) {
          this.preload(prefix, opts, chainCb.chain());
        }
      }, this);
      cb && chainCb.run(cb);
      return chainCb;
    } else {
      pathPrefix = pathPrefix.replace(/^\//, ''); // remove leading slash
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

      var callback = this._loadGroup(merge({resources: files}, opts));
      cb && callback.run(cb);
      return callback;
    }
  };

  var _soundManager = null;
  var _soundLoader = null;
  this.getSound = function (src) {
    if (!_soundManager) {
      import AudioManager;
      _soundManager = new AudioManager({ preload: true });
      _soundLoader = _soundManager.getAudioLoader();
    }

    if (GLOBAL.NATIVE && GLOBAL.NATIVE.sound && GLOBAL.NATIVE.sound.preloadSound) {
      return NATIVE.sound.preloadSound(src);
    } else {
      _soundManager.addSound(src);
      //HACK to make the preloader continue in the browser
      return { complete: true, loader: _soundLoader };
    }
  };

  this.getImagePaths = function (prefix) {
    prefix = prefix.replace(/^\//, ''); // remove leading slash
    var images = [];
    var map = this._map;
    for (var uri in map) {
      if (uri.indexOf(prefix) == 0) {
        images.push(uri);
      }
    }
    return images;
  };

  this.getImage = function (src, noWarn) {
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
        logger.warn("Preload Warning:", src, "not properly cached!");
      }
      img.src = src;
    }

    return img;
  };

  /**
   * used internally by timestep.Image to seamlessly convert
   * non-sprited image URLs to sprited images. This is here (rather
   * than in timestep.Image) to keep sprite formats in one consistent place.
   */
  this._updateImageMap = function (map, url, x, y, w, h) {
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
    map.marginRight = Math.max(0, (map.x + map.width) - (info.x + info.w));
    map.marginBottom = Math.max(0, (map.y + map.height) - (info.y + info.h));

    // and re-offset the source map to exclude margins
    map.x += map.marginLeft;
    map.y += map.marginTop;
    map.width -= (map.marginLeft + map.marginRight);
    map.height -= (map.marginTop + map.marginBottom);

    // the scale of the source image, if scaled in a spritesheet
    map.scale = scale;
    map.url = info.sheet;
    return map;
  };

  this._getRaw = function (type, src, copy, noWarn) {
    // always return the cached copy unless specifically requested not to
    if (!copy && _cache[src]) { return _cache[src]; }
    var res = null;
    switch (type) {
      case 'audio':
        res = this.getSound(src);
        break;
      case 'image':
        res = this.getImage(src, noWarn);
        break;
      default:
        logger.error("Preload Error: Unknown Type", type);
    }
    return (_cache[src] = res);
  };

  // The callback is called for each image in the group with the image
  // source that loaded and whether there was an error.
  //
  // function callback(lastSrc, error, isComplete, numCompleted, numTotal)
  //    where error is true or false and isComplete is true when numCompleted == numTotal

  this._requestedResources = [];

  this._loadGroup = function (opts, cb) {
    var timeout = opts.timeout;
    var callback = new lib.Callback();
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
        if (type === 'image' || type === 'audio') {
          requested = { type: type, resource: resources[i] };

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
        logger.warn("Preload Fail: No Loadable Resources Found");
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
    var parallel = Math.min(numResources, opts.parallel || 5); // how many should we try to download at a time?
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
        if (numLoaded >= numResources) { return; }

        // Set stubs for the reload and load events so that code
        // elsewhere can blindly call these without causing problems.
        // An alternative would be to set these to null but not every
        // piece of code that uses this does the right checks.
        res.onreload = res.onload = res.onerror = function() {};

        // The number of loads (success or failure) has increased.
        ++numLoaded;
        ++globalItemsLoaded;

        // REALLY hacky progress tracker
        if (globalItemsLoaded === globalItemsToLoad) { globalItemsLoaded = globalItemsToLoad = 0; }

        // If we have loaded all of the resources,
        if (numLoaded >= numResources) {
          // Call the progress callback with isComplete == true
          cb && cb(src, failed, true, numLoaded, numResources);

          // If a timeout was set, clear it
          if (_timeout) {
            clearTimeout(_timeout);
          }

          // Fire the completion callback chain
          logger.log("Preload Complete:", src.resource);
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
          if (src.type === "image") {
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
      for (var i = 0; i < parallel; ++i) { loadResource(); }

      // register timeout call
      if (timeout) {
        _timeout = setTimeout(function () {
          logger.warn("Preload Timeout: Something Failed to Load");
          callback.fire();
          numLoaded = numResources;
        }, timeout);
      }
    }, 0);
    return callback;
  };

});

Loader.IMAGE_LOADED = "imageLoaded";

exports = new Loader();

exports.IMAGE_LOADED = Loader.IMAGE_LOADED;
