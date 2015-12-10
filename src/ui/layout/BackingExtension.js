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

import ..View;
import ..backend.strPad as strPad;
import ..backend.BaseBacking;
import .BoxLayout;
import .LinearLayout;
import .Padding;

import util.setProperty;

var layoutProps = {
    'layout': {value: false, cb: '_onSetLayout'},
    'inLayout': {value: true, cb: '_onInLayout'},
    'order': {value: 0, cb: '_onOrder'},
    'direction': {value: 'vertical', cb: '_onLayoutChange'},
    'flex': {value: 0, cb: '_onLayoutChange'},
    'justifyContent': {value: 'start', cb: '_onLayoutChange'},

    'centerX': {value: false, cb: '_onLayoutChange'},
    'centerY': {value: false, cb: '_onLayoutChange'},

    'top': {value: undefined, cb: '_onLayoutChange'},
    'right': {value: undefined, cb: '_onLayoutChange'},
    'bottom': {value: undefined, cb: '_onLayoutChange'},
    'left': {value: undefined, cb: '_onLayoutChange'},

    'minWidth': {value: undefined, cb: '_onBoundsChange'},
    'minHeight': {value: undefined, cb: '_onBoundsChange'},
    'maxWidth': {value: undefined, cb: '_onBoundsChange'},
    'maxHeight': {value: undefined, cb: '_onBoundsChange'},

    'layoutWidth': {value: undefined, cb: '_onLayoutWidth'},
    'layoutHeight': {value: undefined, cb: '_onLayoutHeight'},

    'fixedAspectRatio': {value: false, cb: '_onFixedAspectRatio'},
    'aspectRatio': {value: null, cb: '_onLayoutChange'},

    'margin': {value: null, cb: '_onMarginChange'},
    'padding': {
      get: function () {
        return this._padding || (this._padding = new Padding());
      },
      set: function (value) {
        if (this._padding) {
          this._padding.update(value);
        } else {
          this._padding = new Padding(value);
        }

        this._onLayoutChange();
      }
    }
  };

for (var key in layoutProps) {
  backend.BaseBacking.addProperty(key, layoutProps[key]);
}

View.addExtension({
  extend: function (ViewBacking) {

    var proto = ViewBacking.prototype;

    proto._sortOrder = strPad.initialValue;
    proto._onOrder = function (_, order) {
      this._sortOrder = strPad.pad(order);
      this._onLayoutChange();
    };

    proto._onMarginChange = function (key, value) {
      if (this._cachedMargin) {
        this._cachedMargin.update(value);
      } else {
        this._cachedMargin = new Padding(value);
      }

      this.top = this._cachedMargin.top;
      this.bottom = this._cachedMargin.bottom;
      this.left = this._cachedMargin.left;
      this.right = this._cachedMargin.right;

      this._onLayoutChange();
    }

    proto._onFixedAspectRatio = function (key, value) {
      if (value) {
        this.updateAspectRatio();
      }
    }

    proto.updateAspectRatio = function (width, height) {
      this.aspectRatio = (width || this.width) / (height || this.height);
    }

    proto.enforceAspectRatio = function(iw, ih, isTimeout) {
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
      }
      else if (opts.height) {
        ih = opts.height;
        iw = opts.height * this.aspectRatio;
      }
      else if (parent) {
        if (this.layoutWidth && parent.style.width) {
          iw = parent.style.width * parseFloat(this.layoutWidth) / 100;
          ih = iw / this.aspectRatio;
        }
        else if (this.layoutHeight && parent.style.height) {
          ih = parent.style.height * parseFloat(this.layoutHeight) / 100;
          iw = ih * this.aspectRatio;
        }
        else if (this.flex && parent.style.direction == 'horizontal' && this.width) {
          iw = this.width;
          ih = iw / this.aspectRatio;
        }
        else if (this.flex && parent.style.direction == 'vertical' && this.height) {
          ih = this.height;
          iw = ih * this.aspectRatio;
        }
        else if (!isTimeout) {
          setTimeout(bind(this, 'enforceAspectRatio', iw, ih, true), 0);
        }
      }
      this.width = iw;
      this.height = ih;
    };

    var layouts = {
      'linear': LinearLayout,
      'box': BoxLayout
    };

    proto._onSetLayout = function (key, which) {
      var view = this._view;
      var LayoutCtor = layouts[which];
      if (LayoutCtor) {
        view.__layout = new LayoutCtor({view: view});
        this.addResizeListeners();
      } else {
        this._layout = false;
      }
    };

    proto.addResizeListeners = function () {
      if (!this._hasResizeListeners) {
        this._hasResizeListeners = true;
        util.setProperty(this, 'width', {cb: '_onWidth', value: this.width, configurable: true});
        util.setProperty(this, 'height', {cb: '_onHeight', value: this.height, configurable: true});
      }
    }

    proto._onWidth = function(prop, value, prevValue) {
      // local properties are invalidated
      // this._cache = null;

      if (typeof this.maxWidth == 'number') {
        this._width = Math.min(this.maxWidth, value || 0);
      }

      if (typeof this.minWidth == 'number') {
        this._width = Math.max(this.minWidth, value || 0);
      }

      if (this._aspectRatio) {
        this._height = this._width / this._aspectRatio;
      }

      this._onLayoutChange();
    }

    proto._onHeight = function(prop, value, prevValue) {
      // local properties are invalidated
      // this._cache = null;

      if (typeof this.maxHeight == 'number') {
        this._height = Math.min(this.maxHeight, value || 0);
      }

      if (typeof this.minHeight == 'number') {
        this._height = Math.max(this.minHeight, value || 0);
      }

      if (this._aspectRatio) {
        this._width = this._height * this._aspectRatio;
      }

      this._onLayoutChange();
    }

    proto._onInLayout = function (key, value) {
      var layout = this._superview && this._superview.__layout;
      if (layout) {
        if (value) {
          layout.add(this._view);
        } else {
          layout.remove(this._view);
          this._view.needsReflow();
        }
      }
    }

    proto._onLayoutWidth = function (key, value) {
      if (value.charAt(value.length - 1) == '%') {
        this._layoutWidthValue = parseFloat(value) / 100;
        this._layoutWidthIsPercent = true;
      } else {
        this._layoutWidthValue = 0;
        this._layoutWidthIsPercent = false;
      }

      this._onLayoutChange();
    }

    proto._onLayoutHeight = function (key, value) {
      if (value.charAt(value.length - 1) == '%') {
        this._layoutHeightValue = parseFloat(value) / 100;
        this._layoutHeightIsPercent = true;
      } else {
        this._layoutHeightValue = 0;
        this._layoutHeightIsPercent = false;
      }

      this._onLayoutChange();
    }

    proto._onBoundsChange = function () {
      this.addResizeListeners();
      this._onLayoutChange();
    }

    // trigger a reflow, optionally of the parent if the parent has layout too
    proto._onLayoutChange = function () {
      var superview = this.getSuperview();
      if (superview && superview.__layout) {
        superview.needsReflow();
      }

      this._view.needsReflow();
    }
  }
});
