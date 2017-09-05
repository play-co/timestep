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
 * package ui.ImageView;
 *
 * canvas.ImageView implementation.
 */

import path from 'util/path';
import URI from 'std/uri';

import View from 'ui/View';
import ImageViewCache from 'ui/resource/ImageViewCache';

var _loc = window.location.toString();
var _host = window.location.hostname;



/**
 * @extends ui.View
 */

export default class ImageView extends View {

  _forceLoad () {
    if (this._img) {
      this._img._forceLoad();
      this._loaded = true;
    }
  }

  _addAssetsToList (assetURLs) {
    if (this._img) {
      this._img._addAssetsToList(assetURLs);
    }
  }

  getImage () {
    return this._img;
  }

  getImageFromCache (url, forceReload) {
    return ImageViewCache.getImage(url, forceReload);
  }

  updateOpts (opts) {
    opts = super.updateOpts(opts);

    if (opts.autoSize !== void 0) {
      this._autoSize = opts.autoSize;
    }

    if (opts.image) {
      this.setImage(opts.image);
    } else {
      this.needsReflow();
    }

    return opts;
  }

  setImage (img, opts) {
    this._loaded = false;

    var forceReload = opts && opts.forceReload;
    if (typeof img === 'string') {
      img = ImageViewCache.getImage(img, forceReload);
    } else if (forceReload) {
      img.reload();
    }

    this._img = img;

    if (this._img) {
      if (opts && opts.autoSize !== void 0) {
        this._autoSize = opts.autoSize;
      }

      if (this._autoSize) {
        // sprited resources will know their dimensions immediately
        if (this._img.getWidth() > 0 && this._img.getHeight() > 0) {
          this.autoSize();
        } else {
          // non-sprited resources need to load first
          this._img.doOnLoad(this, 'autoSize');
        }
      }

      this._img.doOnLoad(this, 'needsRepaint');
    }
  }

  doOnLoad () {
    if (arguments.length === 1) {
      this._img.doOnLoad(this, arguments[0]);
    } else {
      this._img.doOnLoad.apply(this._img, arguments);
    }
    return this;
  }

  autoSize () {
    if (this._img) {
      this.style.width = this._img.getWidth();
      this.style.height = this._img.getHeight();

      if (this.style.fixedAspectRatio) {
        this.style.enforceAspectRatio(this.style.width, this.style.height);
      }
    }
  }

  getOrigW () {
    return this._img.getOrigW();
  }

  getOrigH () {
    return this._img.getOrigH();
  }

  render (ctx) {
    if (!this._img) { return; }

    var s = this.style;
    this._img.renderShort(ctx, 0, 0, s.width, s.height);
  }

  getTag () {
    var tag;
    if (this._img) {
      var url = this._img.getOriginalURL();
      if (this._cachedTag && url === this._cachedTag.url) {
        tag = this._cachedTag.tag;
      } else {
        var uri = URI.relativeTo(url, _loc);
        var host = uri.getHost();
        tag = path.splitExt(uri.getFile()).basename + (host && host !==
          _host ? ':' + host : '');

        this._cachedTag = {
          url: url,
          tag: tag
        };
      }
    };

    return (tag || '') + ':ImageView' + this.uid;
  }

};



ImageView.prototype.getOrigWidth = ImageView.prototype.getOrigW;
ImageView.prototype.getOrigHeight = ImageView.prototype.getOrigH;
