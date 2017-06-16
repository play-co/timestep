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

export default class BaseBacking {

  constructor () {
    this.x = 0;
    this.y = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.anchorX = 0;
    this.anchorY = 0;
    this.centerAnchor = false;
    this._width = 0;
    this._height = 0;
    this.r = 0;
    this.opacity = 1;
    this._zIndex = 0;
    this.scale = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.flipX = false;
    this.flipY = false;
    this._visible = true;
    this.clip = false;
    this.backgroundColor = '';
    this.compositeOperation = '';
    this._inLayout = true;
    this._aspectRatio = 1;
    this._fixedAspectRatio = false;
  }

  get visible () { return this._visible; }
  set visible (visible) {
    if (this._visible === visible) {
      return;
    }
    this._visible = visible;
    this._onVisible();
  }

  get width () { return this._width;  }
  set width (width) {
    if (this._width === width) {
      return;
    }
    this._width = width;
    this._onResize();
  }

  get height () { return this._height; }
  set height (height) {
    if (this._height === height) {
      return;
    }
    this._height = height;
    this._onResize();
  }


  get zIndex () { return this._zIndex;  }
  set zIndex (zIndex) {
    if (this._zIndex === zIndex) {
      return;
    }
    this._zIndex = zIndex;
    this._onZIndex();
  }

  get inLayout () { return this._inLayout; }
  set inLayout (inLayout) {
    if (inLayout === this._inLayout) {
      return;
    }
    this._inLayout = inLayout;
    this._onInLayout();
  }

  get aspectRatio () { return this._aspectRatio; }
  set aspectRatio (aspectRatio) {
    if (aspectRatio === this._aspectRatio) {
      return;
    }
    this._aspectRatio = aspectRatio;
    this._onLayoutChange();
  }

  get fixedAspectRatio () { return this._fixedAspectRatio; }
  set fixedAspectRatio (fixedAspectRatio) {
    if (fixedAspectRatio === this._fixedAspectRatio) {
      return;
    }
    this._fixedAspectRatio = fixedAspectRatio;
    this._onFixedAspectRatio();
  }

  // Abstract methods
  _onVisible () {}
  _onResize () {}
  _onZIndex () {}
  _onInLayout() {}
  _onLayoutChange () {}
  _onFixedAspectRatio() {}

  localizePoint (pt) {
    pt.x -= this.x + this.anchorX + this.offsetX;
    pt.y -= this.y + this.anchorY + this.offsetY;
    if (this.r) {
      pt.rotate(-this.r);
    }
    pt.scale(1 / this.scale);
    pt.x += this.anchorX;
    pt.y += this.anchorY;
    return pt;
  }

  copy () {
    var copy = {
      x: this.x,
      y: this.y,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      anchorX: this.anchorX,
      anchorY: this.anchorY,
      centerAnchor: this.centerAnchor,
      width: this._width,
      height: this._height,
      r: this.r,
      opacity: this.opacity,
      zIndex: this._zIndex,
      scale: this.scale,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      flipX: this.flipX,
      flipY: this.flipY,
      visible: this._visible,
      clip: this.clip,
      backgroundColor: this.backgroundColor,
      compositeOperation: this.compositeOperation,
      inLayout: this._inLayout,
      fixedAspectRatio: this._fixedAspectRatio,
      aspectRatio: this._aspectRatio
    };

    return copy;
  }

  update (style) {
    for (var key in style) {
      if (this[key] !== void 0) {
        this[key] = style[key];
      }
    }

    return this;
  }

};
