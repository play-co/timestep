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
 * @package ui.backend.canvas.ViewStyle;
 *
 * Models the style object of the canvas View.
 */
import { bind } from 'base';
import Matrix2D from 'platforms/browser/webgl/Matrix2D';

var ADD_COUNTER = 900000;

function compareZOrder (a, b) {
  var zIndexCmp = a._zIndex - b._zIndex;
  if (zIndexCmp !== 0) {
    return zIndexCmp;
  }

  return a._addedAt - b._addedAt;
}

class ViewBacking {

  constructor (view) {
    // style properties
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
    this._tickIffVisible = true;
    this.clip = false;
    this.backgroundColor = '';
    this.compositeOperation = '';
    this._inLayout = true;
    this._aspectRatio = 1;
    this._fixedAspectRatio = false;

    this._globalTransform = new Matrix2D();
    this._cachedRotation = 0;
    this._cachedSin = 0;
    this._cachedCos = 1;
    this.__cachedWidth = null;
    this.__cachedHeight = null;
    this._view = view;
    this._superview = null;

    this._shouldSort = false;
    this._shouldSortVisibleSubviews = false;

    this._subviews = [];
    this._visibleSubviews = [];

    // number of direct or indirect tick methods
    this._hasTick = !!view._tick;
    this._hasRender = !!view._render;
    this._shouldTick = this._hasTick;

    this._subviewsWithTicks = null;
    this._usesSeparateViewport = false;

    this._addedAt = 0;
  }

  get tickIffVisible () { return this._tickIffVisible; }
  set tickIffVisible (tickIffVisible) {
    if (this._tickIffVisible === tickIffVisible) {
      return;
    }

    this._tickIffVisible = tickIffVisible;
    if (this._tickIffVisible && this._visible === false) {
      this._onVisible();
    }
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

  get layout () { return this._view._layoutName; }
  set layout (layoutName) {
    this._view._setLayout(layoutName);
  }

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

  copy (out) {
    if (!out) {
      out = {};
    }

    out.x = this.x;
    out.y = this.y;
    out.offsetX = this.offsetX;
    out.offsetY = this.offsetY;
    out.anchorX = this.anchorX;
    out.anchorY = this.anchorY;
    out.centerAnchor = this.centerAnchor;
    out.width = this._width;
    out.height = this._height;
    out.r = this.r;
    out.opacity = this.opacity;
    out.zIndex = this._zIndex;
    out.scale = this.scale;
    out.scaleX = this.scaleX;
    out.scaleY = this.scaleY;
    out.flipX = this.flipX;
    out.flipY = this.flipY;
    out.visible = this._visible;
    out.tickIffVisible = this._tickIffVisible;
    out.clip = this.clip;
    out.backgroundColor = this.backgroundColor;
    out.compositeOperation = this.compositeOperation;
    out.inLayout = this._inLayout;
    out.fixedAspectRatio = this._fixedAspectRatio;
    out.aspectRatio = this._aspectRatio;

    return out;
  }

  update (style) {
    for (var key in style) {
      if (this[key] !== void 0) {
        this[key] = style[key];
      }
    }

    return this;
  }

  getSuperview () {
    return this._superview;
  }

  getSubviews () {
    if (this._shouldSort) {
      this._shouldSort = false;
      this._subviews.sort(compareZOrder);
    }
    var subviews = [];
    var backings = this._subviews;
    var n = backings.length;
    for (var i = 0; i < n; ++i) {
      subviews[i] = backings[i]._view;
    }

    return subviews;
  }

  onTickAdded () {
    if (this._superview) {
      this._superview.__view.addTickingView(this);
    }

    this._shouldTick = true;
  }

  onTickRemoved () {
    if (this._superview) {
      this._superview.__view.removeTickingView(this);
    }

    this._shouldTick = false;
  }

  addTickingView (backing) {
    if (backing._tickIffVisible && !backing._visible) {
      return;
    }

    if (this._subviewsWithTicks === null) {
      this._subviewsWithTicks = [];
    }

    var idx = this._subviewsWithTicks.indexOf(backing);
    if (idx === -1) {
      this._subviewsWithTicks.push(backing);
      if (!this._hasTick && this._subviewsWithTicks.length === 1) {
        // first time that this view needs to be registered as ticking
        this.onTickAdded();
      }
    }
  }

  removeTickingView (backing) {
    if (this._subviewsWithTicks === null) {
      return;
    }

    var idx = this._subviewsWithTicks.indexOf(backing);
    if (idx !== -1) {
      this._subviewsWithTicks.splice(idx, 1);
      if (!this._hasTick && this._subviewsWithTicks.length === 0) {
        // no more reason to be registered as ticking
        this.onTickRemoved();
      }
    }
  }

  addSubview (view) {
    var backing = view.__view;
    var superview = backing._superview;
    if (superview == this._view || this == backing) {
      return false;
    }
    if (superview) {
      superview.__view.removeSubview(view);
    }

    var n = this._subviews.length;
    this._subviews[n] = backing;

    backing._superview = this._view;
    backing._addedAt = ++ADD_COUNTER;

    if (n && compareZOrder(backing, this._subviews[n - 1]) < 0) {
      this._shouldSort = true;
    }

    if (backing._hasTick || backing._subviewsWithTicks !== null) {
      this.addTickingView(backing);
    }

    if (backing._visible) {
      this.addVisibleSubview(backing);
    }

    return true;
  }

  removeSubview (view) {
    var backing = view.__view;
    if (backing._visible) {
      this.removeVisibleSubview(backing);
    }

    var index = this._subviews.indexOf(backing);
    if (index !== -1) {
      if (backing._hasTick || backing._subviewsWithTicks !== null) {
        this.removeTickingView(backing);
      }

      this._subviews.splice(index, 1);

      // this._view.needsRepaint();
      backing._superview = null;
      return true;
    }

    return false;
  }

  _replaceSubview (subview, newSubview) {
    var subviewIdx = this._subviews.indexOf(subview);
    this._subviews[subviewIdx] = newSubview;
    var visibleSubviewIdx = this._visibleSubviews.indexOf(subview);
    if (visibleSubviewIdx !== -1) {
      this._visibleSubviews[visibleSubviewIdx] = newSubview;
    }
  }

  addVisibleSubview (backing) {
    this._visibleSubviews.push(backing);
    this._shouldSortVisibleSubviews = true;

    if (backing._tickIffVisible && backing._shouldTick) {
      this.addTickingView(backing);
    }
  }

  removeVisibleSubview (backing) {
    var index = this._visibleSubviews.indexOf(backing);
    if (index !== -1) {
      this._visibleSubviews.splice(index, 1);

      if (backing._tickIffVisible && backing._shouldTick) {
        this.removeTickingView(backing);
      }
    }
  }

  wrapTick (dt, app) {
    if (this._hasTick) {
      this._view.tick(dt, app);
    }

    var backings = this._subviewsWithTicks;
    if (backings !== null) {
      for (var i = 0; i < backings.length; ++i) {
        backings[i].wrapTick(dt, app);
      }
    }
  }

  updateGlobalTransform (pgt) {
    var flipX = this.flipX ? -1 : 1;
    var flipY = this.flipY ? -1 : 1;

    var gt = this._globalTransform;
    var sx = this.scaleX * this.scale * flipX;
    var sy = this.scaleY * this.scale * flipY;
    var ax = this.flipX ? this._width - this.anchorX : this.anchorX;
    var ay = this.flipY ? this._height - this.anchorY : this.anchorY;
    var tx = this.x + this.offsetX + this.anchorX;
    var ty = this.y + this.offsetY + this.anchorY;

    if (this.r === 0) {
      tx -= ax * sx;
      ty -= ay * sy;
      gt.a = pgt.a * sx;
      gt.b = pgt.b * sx;
      gt.c = pgt.c * sy;
      gt.d = pgt.d * sy;
      gt.tx = tx * pgt.a + ty * pgt.c + pgt.tx;
      gt.ty = tx * pgt.b + ty * pgt.d + pgt.ty;
    } else {
      if (this.r !== this._cachedRotation) {
        this._cachedRotation = this.r;
        this._cachedSin = Math.sin(this.r);
        this._cachedCos = Math.cos(this.r);
      }
      var a = this._cachedCos * sx;
      var b = this._cachedSin * sx;
      var c = -this._cachedSin * sy;
      var d = this._cachedCos * sy;

      if (ax || ay) {
        tx -= a * ax + c * ay;
        ty -= b * ax + d * ay;
      }

      gt.a = a * pgt.a + b * pgt.c;
      gt.b = a * pgt.b + b * pgt.d;
      gt.c = c * pgt.a + d * pgt.c;
      gt.d = c * pgt.b + d * pgt.d;
      gt.tx = tx * pgt.a + ty * pgt.c + pgt.tx;
      gt.ty = tx * pgt.b + ty * pgt.d + pgt.ty;
    }
  }

  wrapRender (ctx, parentTransform, parentOpacity) {
    if (this._shouldSortVisibleSubviews) {
      this._shouldSortVisibleSubviews = false;
      this._visibleSubviews.sort(compareZOrder);
    }

    var width = this._width;
    var height = this._height;
    if (width < 0 || height < 0) {
      return;
    }

    var saveContext = this.clip || this.compositeOperation || !this._view.__parent;
    if (saveContext) {
      ctx.save();
    }

    this.updateGlobalTransform(parentTransform);
    var gt = this._globalTransform;
    ctx.setTransform(gt.a, gt.b, gt.c, gt.d, gt.tx, gt.ty);

    var globalAlpha = this.opacity * parentOpacity;
    ctx.globalAlpha = globalAlpha;

    if (this.clip) {
      ctx.clipRect(0, 0, width, height);
    }

    var filter = this._view.getFilter();
    if (filter) {
      ctx.setFilter(filter);
    } else {
      ctx.clearFilter();
    }

    if (this.compositeOperation) {
      ctx.globalCompositeOperation = this.compositeOperation;
    }

    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }


    if (!this._view._loaded) {
      // works for now because all assets are cached forever!
      // TODO: implement a more performant and sustainable solution
      this._view._forceLoad();
    }

    if (this._hasRender) {
      this._view._render(ctx, gt, globalAlpha);
    }

    var subviews = this._visibleSubviews;
    for (var i = 0; i < subviews.length; i++) {
      subviews[i].wrapRender(ctx, gt, globalAlpha);
    }

    if (this._usesSeparateViewport) {
      this._view.popViewport();
    }

    ctx.clearFilter();

    if (saveContext) {
      ctx.restore();
    }
  }

  _onResize () {
    this._onLayoutChange();

    // enforce center anchor on width / height change
    var s = this._view.style;
    if (s.centerAnchor) {
      s.anchorX = (s._width || 0) / 2;
      s.anchorY = (s._height || 0) / 2;
    }
  }

  _onZIndex () {
    this._view.needsRepaint();

    var superview = this._view.getSuperview();
    if (superview) {
      superview.__view._shouldSort = true;
      superview.__view._shouldSortVisibleSubviews = true;
    }
  }

  _onVisible () {
    if (this._superview === null) {
      return;
    }

    if (this._visible) {
      this._superview.__view.addVisibleSubview(this);
    } else {
      this._superview.__view.removeVisibleSubview(this);
    }
  }

  _onInLayout () {
    var layout = this._superview && this._superview._layout;
    if (layout) {
      if (this._inLayout) {
        layout.add(this._view);
      } else {
        layout.remove(this._view);
        this._view.needsReflow();
      }
    }
  }

  // trigger a reflow, optionally of the parent if the parent has layout too
  _onLayoutChange () {
    if (this._inLayout) {
      var superview = this.getSuperview();
      if (superview && superview._layout) {
        superview.needsReflow();
      }
    }

    // child view properties might be invalidated
    this._view.needsReflow();
  }

  _onOffsetX (n) {
    this.offsetX = n * this.width / 100;
  }

  _onOffsetY (n) {
    this.offsetY = n * this.height / 100;
  }

  updateAspectRatio (width, height) {
    this.aspectRatio = (width || this.width) / (height || this.height);
  }

  _onFixedAspectRatio () {
    if (this._fixedAspectRatio) {
      this.updateAspectRatio();
    }
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
      if (parent.style.width) {
        iw = parent.style.width;
        ih = iw / this.aspectRatio;
      } else if (parent.style.height) {
        ih = parent.style.height;
        iw = ih * this.aspectRatio;
      } else if (!isTimeout) {
        setTimeout(bind(this, 'enforceAspectRatio', iw, ih, true), 0);
      }
    }
    this.width = iw;
    this.height = ih;
  }

}

let defaultExports = ViewBacking;

/// #if IS_DEVELOPMENT
import debugViewBacking from './DebugViewBacking';
defaultExports = debugViewBacking(ViewBacking);
/// #endif

export default defaultExports;
