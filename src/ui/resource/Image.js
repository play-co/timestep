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
/**
 * @class ui.resource.Image;
 * Model an Image for rendering. Supports taking a subset of images, to support
 * extracting from compacted sprite sheets. Also supports applying filters to
 * an image, usually by the View class.
 *
 * @doc http://doc.gameclosure.com/api/ui-imageview.html#class-ui.resource.image
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/imageview.md
 */
import {
  GLOBAL,
  bind,
  CONFIG,
  NATIVE,
  logger
} from 'base';

import device from 'device';
import PubSub from 'lib/PubSub';
import Callback from 'event/Callback';
import resourceLoader from 'ui/resource/loader';
import filterRenderer from 'ui/backend/canvas/filterRenderer';

var ImageCache = {};

var GET_IMAGE_DATA_NOT_SUPPORTED = !GLOBAL.document || !document.createElement;

/**
 * Callback when images are loaded. This has a failsafe that runs up to a certain
 * threshold asynchronously, attempting to read the image size, before dying.
 */
// `imageOnLoad` is called when a DOM image object fires a `load` or `error`
// event.  Fire the internal `cb` with the error status.
function imageOnLoad (success, evt, failCount) {
  if (success && !this.width) {
    // Some browsers fire the load event before the image width is
    // available.  Wait up to 3 frames for the width.  Note that an image
    // with zero-width will be considered an error.
    if (failCount <= 3) {
      setTimeout(bind(this, imageOnLoad, success, evt, (failCount || 0) + 1), 0);
    } else {
      this.__cb.fire(false);
    }
  } else {
    this.__cb.fire(!success);
  }
}

// Listen for preloaded images and add them to cache
resourceLoader.on(resourceLoader.IMAGE_LOADED, function (image, src) {
  ImageCache[src.resource] = image;
  image.__cb = new Callback();
  imageOnLoad.call(image, true);
});

/**
 * This class models the region of a larger image that this "Image" references.
 */
var ImageMap = !CONFIG.disableNativeViews && NATIVE.timestep && NATIVE.timestep
  .ImageMap;
if (!ImageMap) {
  ImageMap = class {
    constructor (parentImage, x, y, width, height, marginTop, marginRight,
      marginBottom, marginLeft, url) {
      this.url = url;
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.marginTop = marginTop;
      this.marginRight = marginRight;
      this.marginBottom = marginBottom;
      this.marginLeft = marginLeft;
    }
  };
}

var isNative = GLOBAL.NATIVE && !device.isNativeSimulator;
var Canvas = device.get('Canvas');

// helper canvases for image data, initialized when/if needed
var _imgDataCanvas = null;
var _imgDataCtx = null;

exports = class extends PubSub {
  constructor (opts) {
    super();

    if (!opts) {
      opts = {};
    }

    this._crossOrigin = opts.useCredentials ? 'use-credentials' : 'anonymous';

    this._cb = new Callback();
    this._map = new ImageMap(this, 0, 0, -1, -1, 0, 0, 0, 0, opts.url || '');
    this._originalURL = opts.url || '';
    this._scale = opts.scale || 1;
    this._isError = false;

    resourceLoader._updateImageMap(this._map, opts.url, opts.sourceX, opts.sourceY,
      opts.sourceW, opts.sourceH);

    // srcImage can be null, then setSrcImg will create one
    // (use the map's URL in case it was updated to a spritesheet)
    this._setSrcImg(opts.srcImage, this._map.url, opts.forceReload);
  }

  _setSrcImg (img, url, forceReload) {
    this._cb.reset();
    this._isError = false;

    // if we haven't found an image, look in the image cache
    if (!img && url && !forceReload && ImageCache[url]) {
      img = ImageCache[url];
    }

    // look up the base64 cache -- if it's been preloaded, we'll get back an image that's already loaded
    // if it has not been preloaded, we'll get back raw base64 in the b64 variable
    if (!img && !forceReload && Image.get) {
      var b64 = Image.get(url);
      if (typeof b64 === 'object') {
        img = b64;
      } else if (b64) {
        url = b64;
      }
    }

    if (forceReload) {
      // clear native texture in an image object
      if (img && img.destroy) {
        img.destroy();
      }

      // clear native textures by URL
      if (url && NATIVE.gl && NATIVE.gl.deleteTexture) {
        NATIVE.gl.deleteTexture(url);
      }
    }

    // create an image if we don't have one
    if (!img) {
      img = new Image();
      img.crossOrigin = this._crossOrigin;
    }

    this._srcImg = img;

    if (img instanceof HTMLCanvasElement || img instanceof Canvas) {
      this._onLoad(false, img);
    } else
    // no error
    {
      // if it's already loaded, we call _onLoad immediately. Note that
      // we don't use `.complete` here intentionally since web browsers
      // set `.complete = true` before firing on the load/error
      // callbacks, so we can't actually detect whether there's an error
      // in some cases.
      if (!img.__cb) {
        img.__cb = new Callback();
        img.addEventListener('load', bind(img, imageOnLoad, true), false);
        img.addEventListener('error', bind(img, imageOnLoad, false), false);

        if (url) {
          ImageCache[url] = img;
        }

        if (!img.src && url) {
          img.src = this._map.url = url;
        }
      }

      img.__cb.run(this, function (err) {
        this._onLoad(err, img);
      });
    }
  }
  getSrcImg () {
    return this._srcImg;
  }
  setSrcImg (srcImg) {
    this._setSrcImg(srcImg);
  }
  reload (cb) {
    var srcImg = this._srcImg;
    if (srcImg) {
      // if passed a lib.Callback, chain it
      if (cb && cb.chain) {
        cb = cb.chain();
      }

      var hasFired = this._cb.fired();

      // GC native has a reload method to force reload
      if (srcImg.reload) {
        var onReload = bind(this, function () {
          srcImg.removeEventListener('reload', onReload, false);
          if (hasFired) {
            this._cb.fire(null, this);
          }
          cb && cb();
        });
        srcImg.addEventListener('reload', onReload, false);
        srcImg.reload();

        if (hasFired) {
          this._cb.reset();
        }
      } else if (cb) {
        if (this._cb.fired()) {
          // always wait a frame before calling the callback
          setTimeout(cb, 0);
        } else {
          this._cb.run(cb);
        }
      }
    }
  }
  getURL () {
    return this._map.url;
  }
  getOriginalURL () {
    return this._originalURL;
  }
  getSourceX () {
    return this._map.x;
  }
  getSourceY () {
    return this._map.y;
  }
  getSourceW () {
    return this._map.width;
  }
  getSourceH () {
    return this._map.height;
  }
  getOrigW () {
    return this._srcImg.width;
  }
  getOrigH () {
    return this._srcImg.height;
  }
  setSourceX (x) {
    this._map.x = x;
  }
  setSourceY (y) {
    this._map.y = y;
  }
  setSourceW (w) {
    this._map.width = w;
  }
  setSourceH (h) {
    this._map.height = h;
  }
  setMarginTop (n) {
    this._map.marginTop = n;
  }
  setMarginRight (n) {
    this._map.marginRight = n;
  }
  setMarginBottom (n) {
    this._map.marginBottom = n;
  }
  setMarginLeft (n) {
    this._map.marginLeft = n;
  }
  setURL (url, forceReload) {
    resourceLoader._updateImageMap(this._map, url);
    this._setSrcImg(null, this._map.url, forceReload);
  }
  getWidth () {
    var map = this._map;
    return (map.width == -1 ? 0 : map.width + map.marginLeft + map.marginRight) /
      map.scale;
  }
  getHeight () {
    var map = this._map;
    return (map.height === -1 ? 0 : map.height + map.marginTop + map.marginBottom) /
      map.scale;
  }
  getBounds () {
    return this._map;
  }
  setBounds (x, y, w, h, marginTop, marginRight, marginBottom, marginLeft) {
    var map = this._map;
    map.x = x;
    map.y = y;
    map.width = w;
    map.height = h;
    map.marginTop = marginTop || 0;
    map.marginRight = marginRight || 0;
    map.marginBottom = marginBottom || 0;
    map.marginLeft = marginLeft || 0;
    this.emit('changeBounds');
  }
  doOnLoad () {
    this._cb.forward(arguments);
    return this;
  }
  _onLoad (err, img) {
    var map = this._map;
    var srcImg = this._srcImg;
    // if our source image has changed we should ignore this onload callback
    // this can happen if _setSrcImg is called multiple times with different urls/images
    if (img && img !== srcImg) {
      return;
    }

    if (err) {
      // TODO: something better?
      logger.error('Image failed to load:', map.url);
      this._isError = true;
      this._cb.fire({ NoImage: true });
      return;
    }

    this._isError = false;

    if (srcImg.width === 0) {
      logger.warn('Image has no width', this._url);
    }

    if (this._scale !== 1 && (map.width !== -1 || map.height !== -1)) {
      // requested scale & provided a width or height
      if (map.width === -1) {
        // by the above check, this._sourceH should not be -1
        map.width = srcImg.width * map.height / srcImg.height;
      }

      if (map.height === -1) {
        // this._sourceW was initialized above
        map.height = srcImg.height * map.width / srcImg.width;
      }

      // TODO: sourceImage might be shared so we can't actually modify width/height. This is a bug.
      srcImg.width = map.width;
      srcImg.height = map.height;
    } else {
      if (map.width === -1) {
        map.width = srcImg.width;
      }
      if (map.height === -1) {
        map.height = srcImg.height;
      }
    }

    map.url = srcImg.src;
    this._cb.fire(null, this);
  }
  isError () {
    return this._isError;
  }
  isReady () {
    return !this._isError && this._cb.fired();
  }
  render (ctx) {
    if (!this._cb.fired() || this._isError) {
      return;
    }

    var argumentCount = arguments.length;
    var map = this._map;
    var srcImg = this._srcImg;
    var srcX = map.x;
    var srcY = map.y;
    var srcW = map.width;
    var srcH = map.height;
    var destX = argumentCount > 5 ? arguments[5] : arguments[1] || 0;
    var destY = argumentCount > 6 ? arguments[6] : arguments[2] || 0;
    var destW = argumentCount > 7 ? arguments[7] : arguments[3] || 0;
    var destH = argumentCount > 8 ? arguments[8] : arguments[4] || 0;

    if (argumentCount < 9) {
      var scaleX = destW / (map.marginLeft + map.width + map.marginRight);
      var scaleY = destH / (map.marginTop + map.height + map.marginBottom);
      destX += scaleX * map.marginLeft;
      destY += scaleY * map.marginTop;
      destW = scaleX * map.width;
      destH = scaleY * map.height;
    } else {
      srcX = arguments[1];
      srcY = arguments[2];
      srcW = arguments[3];
      srcH = arguments[4];
    }

    if (!isNative && ctx.filter) {
      var filterImg = filterRenderer.renderFilter(ctx, this, srcX, srcY,
        srcW, srcH);
      if (filterImg) {
        srcImg = filterImg;
        srcX = 0;
        srcY = 0;
      }
    }

    ctx.drawImage(srcImg, srcX, srcY, srcW, srcH, destX, destY, destW,
      destH);
  }
  getImageData (x, y, width, height) {
    // initialize a shared imgDataCanvas when/if needed
    if (_imgDataCanvas === null) {
      _imgDataCanvas = new Canvas();
      _imgDataCtx = _imgDataCanvas.getContext('2d');
    }

    var map = this._map;
    if (GET_IMAGE_DATA_NOT_SUPPORTED) {
      throw 'Not supported';
    }
    if (!map.width || !map.height) {
      throw 'Not loaded';
    }

    x = x || 0;
    y = y || 0;
    width = width || map.width;
    height = height || map.height;
    _imgDataCanvas.width = width;
    _imgDataCanvas.height = height;

    _imgDataCtx.clear();
    this.render(_imgDataCtx, x, y, width, height, 0, 0, width, height);
    return _imgDataCtx.getImageData(0, 0, width, height);
  }
  setImageData (data) {}
  destroy () {
    this._srcImg.destroy && this._srcImg.destroy();
  }
};

exports.__clearCache__ = function () {
  ImageCache = {};
};

exports.prototype.getSource = exports.prototype.getSrcImg;
exports.prototype.setSource = exports.prototype.setSrcImg;

exports.prototype.getSourceWidth = exports.prototype.getSourceW;
exports.prototype.getSourceHeight = exports.prototype.getSourceH;
exports.prototype.getOrigWidth = exports.prototype.getOrigW;
exports.prototype.getOrigHeight = exports.prototype.getOrigH;

exports.prototype.setSourceWidth = exports.prototype.setSourceW;
exports.prototype.setSourceHeight = exports.prototype.setSourceH;

exports.prototype.getMap = exports.prototype.getBounds;
exports.prototype.setMap = exports.prototype.setBounds;

exports.prototype.isLoaded = exports.prototype.isReady;

export default exports;
