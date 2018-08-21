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
 * @class ui.ScrollView;
 *
 * @doc http://doc.gameclosure.com/api/ui-scrollview.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/scrollview.md
 */
import { merge } from 'base';

import animate from 'animate';
import device from 'device';

import input from 'event/input/dispatch';

import Rect from 'math/geom/Rect';
import Point from 'math/geom/Point';

import View from 'ui/View';

function getBoundingRectangle (pos) {
  if (!pos.r) {
    return;
  }

  var w = pos.width;
  var h = pos.height;
  var cr = Math.cos(pos.r);
  var sr = Math.sin(pos.r);

  var x1 = pos.x;
  var y1 = pos.y;

  var x = w;
  var y = 0;

  var x2 = x1 + x * cr - y * sr;
  var y2 = y1 + x * sr + y * cr;

  y += h;

  var x3 = x1 + x * cr - y * sr;
  var y3 = y1 + x * sr + y * cr;

  x -= w;

  var x4 = x1 + x * cr - y * sr;
  var y4 = y1 + x * sr + y * cr;

  pos.x = Math.min(x1, x2, x3, x4);
  pos.y = Math.min(y1, y2, y3, y4);

  pos.width = Math.max(x1, x2, x3, x4) - pos.x;
  pos.height = Math.max(y1, y2, y3, y4) - pos.y;
  pos.r = 0;
}

function viewportIntersect (viewport, prevViewport) {
  var pos = viewport.src.getPosition(prevViewport.src);

  pos.x = (prevViewport.x - pos.x) / pos.scale;
  pos.y = (prevViewport.y - pos.y) / pos.scale;
  pos.width = prevViewport.width / pos.scale;
  pos.height = prevViewport.height / pos.scale;
  pos.r = -pos.r;

  getBoundingRectangle(pos);

  viewport.intersectRect(pos);
}

var defaults = {
  offsetX: 0,
  offsetY: 0,
  scrollX: true,
  scrollY: true,
  clip: true,
  drag: true,
  dragRadius: Math.min(device.width, device.height) / 32,
  layout: 'box'
};

var viewportStack = [];

var CORRECTION = 0.65;
var PULL = 0.45;

/**
 * @extends ui.View
 */
export default class ScrollView extends View {

  constructor (opts) {
    opts = merge(opts, defaults);

    super(opts);

    this.style._usesSeparateViewport = true;

    this._scrollDeceleration = 0.92;
    this._scrollSpeed = { x: 0, y: 0 };
    // Virtual position of the scroll when out of bounds
    // corresponds to where the scroll would be without bound restrictions
    this._virtualPosition = { x: 0, y: 0 };

    this._contentView = new View({
      x: opts.offsetX,
      y: opts.offsetY,
      infinite: true,
      tag: 'ContentView',
      layout: 'box',
      layoutWidth: '100%',
      layoutHeight: '100%'
    });

    this._scrollBounds = {
      minX: -Number.MAX_VALUE,
      minY: -Number.MAX_VALUE,
      maxX: Number.MAX_VALUE,
      maxY: Number.MAX_VALUE
    };

    this._styleBounds = {
      minX: -Number.MAX_VALUE,
      minY: -Number.MAX_VALUE,
      maxX: Number.MAX_VALUE,
      maxY: Number.MAX_VALUE
    };

    this._viewport = new Rect();
    this._viewport.src = this._contentView;
    this._viewportChanged = false;

    this._justDragged = false;

    super.addSubview(this._contentView);

    this.__initCompleteScrollView = true;
    this.updateOpts(opts);
  }

  updateOpts (opts) {
    if (!this.__initCompleteScrollView) {
      return;
    }

    super.updateOpts(opts);

    if (opts.useContentBounds !== undefined) {
      if (opts.useContentBounds !== null) {
        this._contentView.style.layoutHeight = 'wrapContent';
        this._contentView.style.layoutWidth = 'wrapContent';
        this._contentView.subscribe('resize', this, '_updateContentBounds');
        this._updateContentBounds();
      } else {
        this._contentView.unsubscribe('resize', this,
          '_updateContentBounds');
      }
    }

    this.setScrollBounds(opts.scrollBounds);

    return opts;
  }

  _updateContentBounds () {
    if (!this._opts.useContentBounds) {
      return;
    }

    var bounds = this._scrollBounds;
    var s = this._contentView.style;
    var padding = this.style.padding || {};

    bounds.minX = 0;
    bounds.maxX = s.width + (padding.right || 0);
    bounds.minY = 0;
    bounds.maxY = s.height + (padding.bottom || 0);
  }

  addSubview (view) {
    this._contentView.addSubview(view);
    this._updateContentBounds();
  }

  removeSubview (view) {
    this._contentView.removeSubview(view);
    this._updateContentBounds();
  }

  removeAllSubviews () {
    this._contentView.removeAllSubviews();
  }

  addFixedView (view) {
    return super.addSubview(view);
  }

  removeFixedView (view) {
    return super.removeSubview(view);
  }

  getStyleBounds () {
    var bounds = this._scrollBounds;
    var minY = -bounds.maxY;
    var minX = -bounds.maxX;
    var maxY = -bounds.minY < minY ? minY : -bounds.minY;
    var maxX = -bounds.minX < minX ? minX : -bounds.minX;
    this._styleBounds.minX = Math.min(minX + this.style.width, maxX);
    this._styleBounds.minY = Math.min(minY + this.style.height, maxY);
    this._styleBounds.maxX = maxX;
    this._styleBounds.maxY = maxY;
    return this._styleBounds;
  }

  getOffset () {
    return new Point(this._contentView.style);
  }

  getOffsetX () {
    return this._contentView.style.x;
  }

  getOffsetY () {
    return this._contentView.style.y;
  }

  getScrollY () {
    return this._opts.scrollY;
  }

  setOffset (x, y) {
    this._scrollSpeed.x = 0;
    this._scrollSpeed.y = 0;
    this._setOffset(x, y);
  }

  _setOffset (x, y) {
    var bounds = this.getStyleBounds();

    this._virtualPosition.x = x;
    this._virtualPosition.y = y;

    var dx = Math.max(bounds.minX, Math.min(bounds.maxX, x)) - x;
    var dy = Math.max(bounds.minY, Math.min(bounds.maxY, y)) - y;

    if (dx !== 0) {
      var signX = dx > 0 ? 1 : -1;
      x += dx - signX * Math.pow(signX * dx, 0.76);
    }

    if (dy !== 0) {
      var signY = dy > 0 ? 1 : -1;
      y += dy - signY * Math.pow(signY * dy, 0.76);
    }

    var cvs = this._contentView.style;
    var delta = {
      x: x - cvs.x,
      y: y - cvs.y
    };

    cvs.x = x;
    cvs.y = y;

    this.publish('Scrolled', delta);
  }

  isScrolling () {
    return this.isDragging() ||
    this._scrollSpeed.x !== 0 ||
    this._scrollSpeed.y !== 0 ||
    this._virtualPosition.x !== this._contentView.style.x ||
    this._virtualPosition.y !== this._contentView.style.y;
  }

  stopScrolling () {}

  onInputStart (evt) {
    if (this._opts.drag && (this._opts.scrollX || this._opts.scrollY)) {
      this.startDrag({ radius: this._opts.dragRadius });

      evt.cancel();
    }
  }

  onDragStart (dragEvt) {
    input.clearOverState(dragEvt.id);
    this._contentView.getInput().blockEvents = true;
  }

  onDrag (dragEvt, moveEvt, delta) {
    var dx = this._opts.scrollX ? delta.x : 0;
    var dy = this._opts.scrollY ? delta.y : 0;

    this._scrollSpeed.x = dx * (1 - CORRECTION) + this._scrollSpeed.x * CORRECTION;
    this._scrollSpeed.y = dy * (1 - CORRECTION) + this._scrollSpeed.y * CORRECTION;

    this._justDragged = true;

    this._setOffset(this._virtualPosition.x + dx, this._virtualPosition.y + dy);
    moveEvt.cancel();
  }

  onDragStop () {
    this._contentView.getInput().blockEvents = false;
  }

  setScrollBounds (bounds) {
    if (bounds) {
      this._scrollBounds.minX = bounds.minX || 0;
      this._scrollBounds.minY = bounds.minY || 0;
      this._scrollBounds.maxX = bounds.maxX || 0;
      this._scrollBounds.maxY = bounds.maxY || 0;
    }
  }

  getScrollBounds () {
    return this._scrollBounds;
  }

  addOffset (x, y) {
    this.setOffset(x != undefined && x != null && this._contentView.style.x +
      x, y != undefined && y != null && this._contentView.style.y + y);
  }

  getContentView () {
    return this._contentView;
  }

  getFullWidth () {
    return this._contentView.style.width;
  }

  getFullHeight () {
    return this._contentView.style.height;
  }

  getCurrentViewport () {
    return viewportStack[viewportStack.length - 1];
  }

  popViewport () {
    viewportStack.pop();
  }

  render () {
    var s = this.style;
    var cvs = this._contentView.style;

    var viewport = this._viewport;

    var x = viewport.x;
    var y = viewport.y;
    var width = viewport.width;
    var height = viewport.height;

    viewport.x = -cvs.x;
    viewport.y = -cvs.y;

    viewport.width = Math.ceil(s.width * s.scale);
    viewport.height = Math.ceil(s.height * s.scale);

    var currentViewPort = this.getCurrentViewport();
    if (currentViewPort) {
      viewportIntersect(viewport, currentViewPort);
    }

    this._viewportChanged = viewport.x != x || viewport.y != y ||
        viewport.width != width || viewport.height != height;

    viewportStack.push(viewport);
  }

  tick (dt) {
    var isDragging = this.isDragging();
    var isScrolling = isDragging ||
      this._scrollSpeed.x !== 0 ||
      this._scrollSpeed.y !== 0 ||
      this._virtualPosition.x !== this._contentView.style.x ||
      this._virtualPosition.y !== this._contentView.style.y;

    if (!isScrolling) {
      return;
    }

    // Adjusting constants to detla time
    var a = dt * 60 / 1000;
    var correction = Math.pow(CORRECTION, a);
    var scrollDeceleration = Math.pow(this._scrollDeceleration, a);
    var pull = Math.pow(PULL, a);

    if (isDragging) {
      if (this._justDragged) {
        this._justDragged = false;
      } else {
        this._scrollSpeed.x *= correction;
        this._scrollSpeed.y *= correction;
      }
    } else {
      if (this._scrollSpeed.x !== 0 || this._scrollSpeed.y !== 0) {
        this._scrollSpeed.x *= scrollDeceleration;
        this._scrollSpeed.y *= scrollDeceleration;
      }

      var cvs = this._contentView.style;

      var vx = this._virtualPosition.x;
      var x = cvs.x;
      if (x !== vx) {
        var dx = cvs.x - vx;
        this._scrollSpeed.x *= scrollDeceleration;
        this._virtualPosition.x += dx * pull;
      }

      var vy = this._virtualPosition.y;
      var y = cvs.y;
      if (y !== vy) {
        var dy = cvs.y - vy;
        this._scrollSpeed.y *= scrollDeceleration;
        this._virtualPosition.y += dy * pull;
      }

      if (Math.abs(this._scrollSpeed.x) < 0.05) {
        this._scrollSpeed.x = 0;
        this._virtualPosition.x = x;
      }

      if (Math.abs(this._scrollSpeed.y) < 0.05) {
        this._scrollSpeed.y = 0;
        this._virtualPosition.y = y;
      }

      this._setOffset(this._virtualPosition.x + this._scrollSpeed.x, this._virtualPosition.y + this._scrollSpeed.y);
    }
  }

  onInputScroll (evt) {
    var style = this._contentView.style;
    var x = style.x;
    var y = style.y;

    if (this._opts.scrollY && evt.scrollAxis == input.VERTICAL_AXIS) {
      this.addOffset(undefined, evt.scrollDelta * 40);
    } else if (this._opts.scrollX) {
      this.addOffset(evt.scrollDelta * 40);
    }

    if (style.y != y || style.x != x) {
      evt.cancel();
    }
  }

  scrollTo (x, y, opts, cb) {
    var bounds = this.getStyleBounds();
    var cvs = this._contentView.style;

    x = x == null ? cvs.x : -x;
    y = y == null ? cvs.y : -y;

    x = x < bounds.minX ? bounds.minX : x;
    x = x > bounds.maxX ? bounds.maxX : x;
    y = y < bounds.minY ? bounds.minY : y;
    y = y > bounds.maxY ? bounds.maxY : y;

    var duration;
    if (typeof opts == 'number') {
      // legacy api
      duration = opts;
    } else {
      if (opts.duration) {
        duration = opts.duration;
      } else if (opts.speed) {
        var dx = x - cvs.x;
        var dy = y - cvs.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        duration = distance / opts.speed * 1000;
      } else {
        duration = 500;
      }

      if (opts.maxDuration) {
        duration = Math.min(duration, opts.maxDuration);
      }
    }

    if (duration) {
      var anim = animate(this._contentView).now({
        x: x,
        y: y
      }, duration, animate.easeOut);
      if (cb) {
        anim.then(cb);
      }
    } else {
      cvs.x = x;
      cvs.y = y;
      cb && cb();
    }
  }
}

ScrollView.prototype.tag = 'ScrollView';
