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
import { bind } from 'base';

import strPad from '../backend/strPad';
import ViewBacking from '../backend/canvas/ViewBacking';
import Padding from './Padding';

export default class LayoutViewBacking extends ViewBacking {

  constructor (view) {
    super(view);

    this._order = 0;
    this._direction = 'vertical';
    this._flex = 0;
    this._justifyContent = 'start';
    this._centerX = false;
    this._centerY = false;

    this._top = undefined;
    this._right = undefined;
    this._bottom = undefined;
    this._left = undefined;

    this._minWidth = undefined;
    this._minHeight = undefined;
    this._maxWidth = undefined;
    this._maxHeight = undefined;

    this._layoutWidth = undefined;
    this._layoutHeight = undefined;

    this._padding = undefined;
    this._margin = null;

    this._sortOrder = strPad.initialValue;

    this._layoutWidthValue = 0;
    this._layoutWidthIsPercent = false;

    this._layoutHeightValue = 0;
    this._layoutHeightIsPercent = false;
  }

  get direction () { return this._direction; }
  set direction (direction) {
    if (direction === this._direction) {
      return;
    }
    this._direction = direction;
    this._onLayoutChange();
  }

  get flex () { return this._flex; }
  set flex (flex) {
    if (flex === this._flex) {
      return;
    }
    this._flex = flex;
    this._onLayoutChange();
  }

  get justifyContent () { return this._justifyContent; }
  set justifyContent (justifyContent) {
    if (justifyContent === this._justifyContent) {
      return;
    }
    this._justifyContent = justifyContent;
    this._onLayoutChange();
  }

  get centerX () { return this._centerX; }
  set centerX (centerX) {
    if (centerX === this._centerX) {
      return;
    }
    this._centerX = centerX;
    this._onLayoutChange();
  }

  get centerY () { return this._centerY; }
  set centerY (centerY) {
    if (centerY === this._centerY) {
      return;
    }
    this._centerY = centerY;
    this._onLayoutChange();
  }

  get top () { return this._top; }
  set top (top) {
    if (top === this._top) {
      return;
    }
    this._top = top;
    this._onLayoutChange();
  }

  get right () { return this._right; }
  set right (right) {
    if (right === this._right) {
      return;
    }
    this._right = right;
    this._onLayoutChange();
  }

  get bottom () { return this._bottom; }
  set bottom (bottom) {
    if (bottom === this._bottom) {
      return;
    }
    this._bottom = bottom;
    this._onLayoutChange();
  }

  get left () { return this._left; }
  set left (left) {
    if (left === this._left) {
      return;
    }
    this._left = left;
    this._onLayoutChange();
  }

  get minWidth () { return this._minWidth; }
  set minWidth (minWidth) {
    if (minWidth === this._minWidth) {
      return;
    }
    this._minWidth = minWidth;
    this._onLayoutChange();
  }

  get minHeight () { return this._minHeight; }
  set minHeight (minHeight) {
    if (minHeight === this._minHeight) {
      return;
    }
    this._minHeight = minHeight;
    this._onLayoutChange();
  }

  get maxWidth () { return this._maxWidth; }
  set maxWidth (maxWidth) {
    if (maxWidth === this._maxWidth) {
      return;
    }
    this._maxWidth = maxWidth;
    this._onLayoutChange();
  }

  get maxHeight () { return this._maxHeight; }
  set maxHeight (maxHeight) {
    if (maxHeight === this._maxHeight) {
      return;
    }
    this._maxHeight = maxHeight;
    this._onLayoutChange();
  }

  get layoutWidth () { return this._layoutWidth; }
  set layoutWidth (layoutWidth) {
    if (layoutWidth === this._layoutWidth) {
      return;
    }
    this._layoutWidth = layoutWidth;
    this._onLayoutWidth();
  }

  get layoutHeight () { return this._layoutHeight; }
  set layoutHeight (layoutHeight) {
    if (layoutHeight === this._layoutHeight) {
      return;
    }
    this._layoutHeight = layoutHeight;
    this._onLayoutHeight();
  }

  get margin () { return this._margin; }
  set margin (margin) {
    if (margin === this._margin) {
      return;
    }
    this._margin = margin;
    this._onMarginChange();
  }

  get padding () {
      return this._padding || (this._padding = new Padding());
  }
  set padding (padding) {
    if (this._padding) {
      this._padding.update(padding);
    } else {
      this._padding = new Padding(padding);
    }

    this._onLayoutChange();
  }

  copy (out) {
    out = super.copy(out);

    out.order = this._order;
    out.direction = this._direction;
    out.flex = this._flex;
    out.justifyContent = this._justifyContent;
    out.centerX = this._centerX;
    out.centerY = this._centerY;
    out.top = this._top;
    out.right = this._right;
    out.bottom = this._bottom;
    out.left = this._left;
    out.minWidth = this._minWidth;
    out.minHeight = this._minHeight;
    out.maxWidth = this._maxWidth;
    out.maxHeight = this._maxHeight;
    out.layoutWidth = this._layoutWidth;
    out.layoutHeight = this._layoutHeight;
    out.margin = this._margin;
    out.padding = this._padding;

    out._sortOrder = this._sortOrder.initialValue;

    out.layoutWidthValue = this._layoutWidthValue;
    out.layoutWidthIsPercent = this._layoutWidthIsPercent;

    out.layoutHeightValue = this._layoutHeightValue;
    out.layoutHeightIsPercent = this._layoutHeightIsPercent;

    return out;
  }

  update (style) {
    super.update(style);

    // updating properties that are initialized as undefined
    // they need to be checked manually
    if (style.top !== undefined) { this.top = style.top; }
    if (style.right !== undefined) { this.right = style.right; }
    if (style.bottom !== undefined) { this.bottom = style.bottom; }
    if (style.left !== undefined) { this.left = style.left; }

    if (style.minWidth !== undefined) { this.minWidth = style.minWidth; }
    if (style.minHeight !== undefined) { this.minHeight = style.minHeight; }
    if (style.maxWidth !== undefined) { this.maxWidth = style.maxWidth; }
    if (style.maxHeight !== undefined) { this.maxHeight = style.maxHeight; }

    if (style.layoutWidth !== undefined) { this.layoutWidth = style.layoutWidth; }
    if (style.layoutHeight !== undefined) { this.layoutHeight = style.layoutHeight; }

    if (style.padding !== undefined) { this.padding = style.padding; }

    return this;
  }

  _onOrder () {
    this._sortOrder = strPad.pad(this._order);
    this._onLayoutChange();
  }

  _onMarginChange () {
    if (this._cachedMargin) {
      this._cachedMargin.update(this._margin);
    } else {
      this._cachedMargin = new Padding(this._margin);
    }

    this.top = this._cachedMargin.top;
    this.bottom = this._cachedMargin.bottom;
    this.left = this._cachedMargin.left;
    this.right = this._cachedMargin.right;

    this._onLayoutChange();
  }

  enforceAspectRatio (iw, ih, isTimeout) {
    if (iw && ih) {
      this.updateAspectRatio(iw, ih);
    }
    var parent = this._view.getSuperview();
    var opts = this._view._opts;
    iw = iw || opts.width;
    ih = ih || opts.height;
    if (opts.width) {
      iw = opts.width;
      ih = opts.width / this.aspectRatio;
    } else if (opts.height) {
      ih = opts.height;
      iw = opts.height * this.aspectRatio;
    } else if (parent) {
      if (this.layoutWidth && parent.style.width) {
        iw = parent.style.width * parseFloat(this.layoutWidth) / 100;
        ih = iw / this.aspectRatio;
      } else if (this.layoutHeight && parent.style.height) {
        ih = parent.style.height * parseFloat(this.layoutHeight) / 100;
        iw = ih * this.aspectRatio;
      } else if (this.flex && parent.style.direction === 'horizontal' && this.width) {
        iw = this.width;
        ih = iw / this.aspectRatio;
      } else if (this.flex && parent.style.direction === 'vertical' && this.height) {
        ih = this.height;
        iw = ih * this.aspectRatio;
      } else if (!isTimeout) {
        setTimeout(bind(this, 'enforceAspectRatio', iw, ih, true), 0);
      }
    }
    this.width = iw;
    this.height = ih;
  }

  _onResize () {
    if (this._maxWidth !== undefined) { this._width = Math.min(this._maxWidth, this._width); }
    if (this._minWidth !== undefined) { this._width = Math.max(this._minWidth, this._width); }
    if (this._maxHeight !== undefined) { this._height = Math.min(this._maxHeight, this._height); }
    if (this._minHeight !== undefined) { this._height = Math.max(this._minHeight, this._height); }

    super._onResize();
  }

  _onLayoutWidth () {
    if (this._layoutWidth.charAt(this._layoutWidth.length - 1) === '%') {
      this._layoutWidthValue = parseFloat(this._layoutWidth) / 100;
      this._layoutWidthIsPercent = true;
    } else {
      this._layoutWidthValue = 0;
      this._layoutWidthIsPercent = false;
    }

    this._onLayoutChange();
  }

  _onLayoutHeight () {
    if (this._layoutHeight.charAt(this._layoutHeight.length - 1) === '%') {
      this._layoutHeightValue = parseFloat(this._layoutHeight) / 100;
      this._layoutHeightIsPercent = true;
    } else {
      this._layoutHeightValue = 0;
      this._layoutHeightIsPercent = false;
    }

    this._onLayoutChange();
  }
}
