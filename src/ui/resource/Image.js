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
  logger
} from 'base';

import device from 'device';
import PubSub from 'lib/PubSub';
import Callback from 'event/Callback';
import resourceLoader from 'ui/resource/loader';
import filterRenderer from 'ui/backend/canvas/filterRenderer';
import Canvas from 'platforms/browser/Canvas';

var GET_IMAGE_DATA_NOT_SUPPORTED = !GLOBAL.document || !document.createElement;

/**
 * This class models the region of a larger image that this "Image" references.
 */
class ImageMap {
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

// helper canvases for image data, initialized when/if needed
var _imgDataCanvas = null;
var _imgDataCtx = null;

export default class ImageWrapper extends PubSub {
  constructor (opts) {
    super();

    if (!opts) {
      opts = {};
    }

    this._crossOrigin = opts.crossOrigin !== undefined ? opts.crossOrigin : 'use-credentials';

    this._cb = new Callback();
    this._map = new ImageMap(this, 0, 0, -1, -1, 0, 0, 0, 0, opts.url || '');
    this._originalURL = opts.url || '';
    this._scale = opts.scale || 1;
    this._isError = false;
    this._loadRequestID = 0;

    resourceLoader._updateImageMap(this._map, opts.url, opts.sourceX, opts.sourceY,
      opts.sourceW, opts.sourceH);

    // srcImage can be null, then setSrcImg will create one
    // (use the map's URL in case it was updated to a spritesheet)
    this._setSrcImg(opts.srcImage, this._map.url, opts.forceReload);
  }

  _setSrcImg (img, url, forceReload) {
    this._cb.reset();
    this._isError = false;

    this._srcImg = img;
// console.warn('request img', img, url, this._map.url)
    var loadRequestID = ++this._loadRequestID;
    if (img instanceof HTMLCanvasElement || img instanceof Canvas) {
      this._onLoad(img, loadRequestID);
    } else {
      resourceLoader._loadImage(url, img => this._onLoad(img, loadRequestID));
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

      if (cb) {
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
  _onLoad (image, loadRequestID) {
    // if our source image has changed we should ignore this onload callback
    // this can happen if _setSrcImg is called multiple times with different urls/images
    if (loadRequestID !== this._loadRequestID) {
      return;
    }

    if (!image) {
      // TODO: something better?
      this._isError = true;
      this._cb.fire({ NoImage: true });
      return;
    }

    this._srcImg = image;
    this._isError = false;

    var map = this._map;
    if (this._scale !== 1 && (map.width !== -1 || map.height !== -1)) {
      // requested scale & provided a width or height
      if (map.width === -1) {
        // by the above check, this._sourceH should not be -1
        map.width = image.width * map.height / image.height;
      }

      if (map.height === -1) {
        // this._sourceW was initialized above
        map.height = image.height * map.width / image.width;
      }

      // TODO: sourceImage might be shared so we can't actually modify width/height. This is a bug.
      image.width = map.width;
      image.height = map.height;
    } else {
      if (map.width === -1) {
        map.width = image.width;
      }
      if (map.height === -1) {
        map.height = image.height;
      }
    }

    map.url = image.src;
    this._cb.fire(null, this);
  }
  isError () {
    return this._isError;
  }
  isReady () {
    return !this._isError && this._cb.fired();
  }

  /**
   * Easy-to-use 5 param render function that relies on the internal _map
   */
  renderShort (ctx, destX, destY, destW, destH) {
    if (!this.isReady()) { return; }

    var map = this._map;
    var srcX = map.x;
    var srcY = map.y;
    var srcW = map.width;
    var srcH = map.height;
    var scaleX = destW / (map.marginLeft + srcW + map.marginRight);
    var scaleY = destH / (map.marginTop + srcH + map.marginBottom);
    destX += scaleX * map.marginLeft;
    destY += scaleY * map.marginTop;
    destW = scaleX * srcW;
    destH = scaleY * srcH;

    this.render(ctx, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
  }

  /**
   * Optimized, non-polymorphic render, requires all 9 params
   */
  render (ctx, srcX, srcY, srcW, srcH, destX, destY, destW, destH) {
    if (!this.isReady()) { return; }

    var srcImg = this._srcImg;

    if (ctx.filter) {
      var filterImg = filterRenderer.renderFilter(ctx, this, srcX, srcY, srcW, srcH);
      if (filterImg) {
        srcImg = filterImg;
        srcX = 0;
        srcY = 0;
      }
    }

    ctx.drawImage(srcImg, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
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

};

ImageWrapper.prototype.getSource = ImageWrapper.prototype.getSrcImg;
ImageWrapper.prototype.setSource = ImageWrapper.prototype.setSrcImg;

ImageWrapper.prototype.getSourceWidth = ImageWrapper.prototype.getSourceW;
ImageWrapper.prototype.getSourceHeight = ImageWrapper.prototype.getSourceH;
ImageWrapper.prototype.getOrigWidth = ImageWrapper.prototype.getOrigW;
ImageWrapper.prototype.getOrigHeight = ImageWrapper.prototype.getOrigH;

ImageWrapper.prototype.setSourceWidth = ImageWrapper.prototype.setSourceW;
ImageWrapper.prototype.setSourceHeight = ImageWrapper.prototype.setSourceH;

ImageWrapper.prototype.getMap = ImageWrapper.prototype.getBounds;
ImageWrapper.prototype.setMap = ImageWrapper.prototype.setBounds;

ImageWrapper.prototype.isLoaded = ImageWrapper.prototype.isReady;

