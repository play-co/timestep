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

import { GLOBAL, CONFIG, NATIVE, logger } from 'base';

import device from 'device';
import PubSub from 'lib/PubSub';
import Callback from 'event/Callback';
import filterRenderer from 'ui/backend/canvas/filterRenderer';
import i18n from './i18n';


var GET_IMAGE_DATA_NOT_SUPPORTED = !GLOBAL.document || !document.createElement;

/**
 * This class models the region of a larger image that this "Image" references.
 */

var ImageMap = !CONFIG.disableNativeViews && NATIVE.timestep && NATIVE.timestep.ImageMap;

if (!ImageMap) {
  ImageMap = function (parentImage, x, y, width, height, marginTop, marginRight, marginBottom, marginLeft, url = '') {
    this.url = url;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.marginTop = marginTop;
    this.marginRight = marginRight;
    this.marginBottom = marginBottom;
    this.marginLeft = marginLeft;
  };
}

var isNative = GLOBAL.NATIVE && !device.isNativeSimulator;
var Canvas = device.get('Canvas');

// helper canvases for image data, initialized when/if needed
var _imgDataCanvas = null;
var _imgDataCtx = null;

export default class DevkitImage extends PubSub {

  constructor (opts = {}) {
    super();

    this._crossOrigin = opts.crossOrigin !== undefined ? opts.crossOrigin : 'use-credentials';

    this._cb = new Callback();
    this._map = new ImageMap(this, 0, 0, -1, -1, 0, 0, 0, 0, opts.url);
    this._originalURL = opts.url || '';
    this._scale = opts.scale || 1;
    this._isError = false;

    DevkitImage.updateImageMap(this._map, opts.url, opts.sourceX, opts.sourceY, opts.sourceW, opts.sourceH);

    // srcImage can be null, then setSrcImg will create one
    // (use the map's URL in case it was updated to a spritesheet)
    this._setSrcImg(opts.srcImage, this._map.url, opts.forceReload);
  }

  _setSrcImg (img, url, forceReload) {
    this._cb.reset();
    this._isError = false;

    // if we haven't found an image, look in the image cache
    if (!img && url) {
      img = DevkitImage.getRaw(url, forceReload, this._crossOrigin);
      this._map.url = url;
    }

    this._srcImg = img;

    if (img instanceof HTMLCanvasElement || img instanceof Canvas) {
      this._onLoad(false, img);
    } else {
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

        var onReload = evt => {
          srcImg.removeEventListener('reload', onReload, false);
          if (hasFired) {
            this._cb.fire(null, this);
          }
          cb && cb();
        };

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
    DevkitImage.updateImageMap(this._map, url);
    this._setSrcImg(null, this._map.url, forceReload);
  }

  getWidth () {
    var map = this._map;
    return (map.width == -1 ? 0 : map.width + map.marginLeft + map.marginRight) / map.scale;
  }
  getHeight () {
    var map = this._map;
    return (map.height === -1 ? 0 : map.height + map.marginTop + map.marginBottom) / map.scale;
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

DevkitImage.updateImageMap = function (map, url, x, y, w, h) {
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

DevkitImage.RAW_CACHE = {};
DevkitImage.CACHE = {};

DevkitImage.fromURL = function(url, forceReload) {
  var img = forceReload ? null : DevkitImage.CACHE[url];

  if (!img) {
    img = DevkitImage.CACHE[url] = new DevkitImage({ url: url, forceReload: !!forceReload });
  }

  return img;
}

DevkitImage.getRaw = function(url, forceReload = false, crossOrigin = 'use-credentials') {

  if (!url) { throw new Error('Attempted to load image without URL'); }

  if (forceReload) { DevkitImage.removeRawFromCache(url); }

  var img = DevkitImage.RAW_CACHE[url];

  // look up the base64 cache -- if it's been preloaded, we'll get back an image that's already loaded
  // if it has not been preloaded, we'll get back raw base64 in the b64 variable
  if (!img && !forceReload && Image.get) {
    var b64 = Image.get(url);
    if (typeof b64 === 'object') {
      img = DevkitImage.RAW_CACHE[url] = b64;
    } else if (b64) {
      url = b64;
    }
  }

  if (!img) {
    img = DevkitImage.RAW_CACHE[url] = img = new Image();
    img.crossOrigin = crossOrigin;
    img.src = url;
  }

  // if it's already loaded, we call _onLoad immediately. Note that
  // we don't use `.complete` here intentionally since web browsers
  // set `.complete = true` before firing on the load/error
  // callbacks, so we can't actually detect whether there's an error
  // in some cases.
  if (!img.__cb) {
    img.__cb = new Callback();

    img.addEventListener('load', () => DevkitImage.onImageLoad(img, true), false);
    img.addEventListener('error', () => DevkitImage.onImageLoad(img, false), false);

    if (!img.src && url) {
      img.src = url;
    }
  }

  return img;
}

DevkitImage.removeRawFromCache = function (url) {
  var img = DevkitImage.RAW_CACHE[url];
  if (!img || !url) { return; }

  DevkitImage.RAW_CACHE[url] = null;

  if (img.destroy) {
    img.destroy();
  }

  // clear native textures by URL
  if (NATIVE.gl && NATIVE.gl.deleteTexture) {
    NATIVE.gl.deleteTexture(url);
  }
}

/**
 * Callback when images are loaded. This has a failsafe that runs up to a certain
 * threshold asynchronously, attempting to read the image size, before dying.
 */
// `onImageLoad` is called when a DOM image object fires a `load` or `error`
// event.  Fire the internal `cb` with the error status.
DevkitImage.onImageLoad = function (image, success, failCount = 0) {
  if (success && !image.width) {
    // Some browsers fire the load event before the image width is
    // available.  Wait up to 5 frames for the width.  Note that an image
    // with zero-width will be considered an error.
    if (failCount <= 5) {
      setTimeout(() => this.onImageLoad(image, success, failCount + 1), 0);
    } else {
      image.__cb.fire(false);
    }
  } else {
    image.__cb.fire(!success);
  }
}


// -----------------------------------
// Image Maps
// -----------------------------------

DevkitImage._map = {};
DevkitImage._originalMap = {};

DevkitImage.has = function (src) {
  return DevkitImage._map[src];
}

DevkitImage.restoreMap = function () {
  DevkitImage._map = DevkitImage._originalMap;
}

DevkitImage.getMap = function () {
  return DevkitImage._map;
}

DevkitImage.setMap = function (language) {
  DevkitImage.restoreMap();
  if (!language) {
    DevkitImage._map = i18n.localizeResourceMap(DevkitImage._map);
  } else {
    DevkitImage._map = i18n.applyResourceMap(DevkitImage._map, language);
  }
}

DevkitImage.addSheets = function (sheets) {
  Object.keys(sheets).forEach(function (name) {
    var sheet = sheets[name];
    sheet.forEach(function (info) {
      DevkitImage._map[info.f] = {
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
    });
  });
  DevkitImage._originalMap = DevkitImage._map;
}


// TODO: Why are we aliasing all of these? We should deprecate unused APIs.

const ALIAS_MAP = {
  getSource : 'getSrcImg',
  setSource : 'setSrcImg',
  getSourceWidth : 'getSourceW',
  getSourceHeight : 'getSourceH',
  getOrigWidth : 'getOrigW',
  getOrigHeight : 'getOrigH',
  setSourceWidth : 'setSourceW',
  setSourceHeight : 'setSourceH',
  getMap : 'getBounds',
  setMap : 'setBounds',
  isLoaded : 'isReady'
};

for (var alias in ALIAS_MAP) {
  DevkitImage.prototype[alias] = DevkitImage.prototype[ALIAS_MAP[alias]];
}