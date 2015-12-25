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

var DEBUG_REFLOW = false;
var DEBUG_TIME = false;
if (DEBUG_REFLOW || DEBUG_TIME) {
  var _debug = {
    space: '',
    stepIn: function () { this.space += ' '; return true; },
    stepOut: function () { this.space = this.space.slice(0, this.space.length - 1); return true; },
    log: function () { logger.log.apply(logger, [this.space].concat(Array.prototype.slice.call(arguments, 0))); return true; }
  };
  logger.log('===== CREATING REFLOW MANAGER');
}

// max reflows for any view in a given tick
var MAX_REFLOW_THRESHOLD = 20;

var _pool = new (Class(function () {
  this._pool = [];

  this.recycle = function (item) {
    item.view = null;
    this._pool.push(item);
  };

  this.get = function (view) {
    var item = this._pool.pop() || {};
    item.view = view;
    item.count = 0;
    item.needsReflow = false;
    return item;
  };
}));

/**
 * The ReflowManager is the controller for view layout.  It hooks into
 * the render cycle in two places:
 *  1. at the start of a render to reflow any views that we know
 *     need layout.  This is signalled by calling calls to needsReflow
 *     on a view between render cycles that result in a call to
 *     `ReflowMgr.add`.
 *  2. during render, if the view hasn't ever been rendered, the
 *     ReflowManager is notified to initiate the buildView call
 *     and handle any reflow logic before the view's first render.
 * The ReflowManager uses a queue-like structure to resolve the reflow
 * constraints. Views notify the ReflowManager through the add(view)
 * method, which then adds the view to the queue.  During a reflow cycle,
 * the ReflowManager tracks how many iterations through the queue each
 * view actually gets reflowed.  If the number of reflows exceeds the
 * MAX_REFLOW_THRESHOLD, reflow stops for that view, preventing infinite
 * loops when reflow cycles occur.
 */

var ReflowManager = exports = Class(function () {
  this.init = function () {
    this._pending = {};
    this._iter = 0;
    this._pendingCount = 0;
  };

  this.add = function (view) {
    if (!view.style.layout) { return; }

    var uid = view.uid;
    var item = this._pending[uid] || (this._pending[uid] = _pool.get(view));

    if (!item.needsReflow) {
      ++this._pendingCount;
      item.needsReflow = true;

      DEBUG_REFLOW && _debug.log('adding ' + view + ' (' + view.uid + ')' + (' ' + view.style.layout || '') + ':',
        (view.style.width === undefined ? '?' : view.style.width)
          + 'x'
          + (view.style.height === undefined ? '?' : view.style.height));
    }

    // increment count once per reflow iteration
    if (item.iter != this._iter) {
      item.iter = this._iter;
    }
  };

  this.reflow = function (view) {
    if (view.style.__cachedWidth === undefined) {
      view.style.__cachedWidth = view.style.width;
    }

    if (view.style.__cachedHeight === undefined) {
      view.style.__cachedHeight = view.style.height;
    }

    var item = this._pending[view.uid];
    if (item && item.needsReflow) {
      item.needsReflow = false;
      --this._pendingCount;
    }

    if (view.__layout) {
      view.__layout.reflow();
    }

    view.reflow && view.reflow();

    // always reflow children if a layout changes sizes
    if (view.__layout) {
      var style = view.style;
      if (style.__cachedWidth != style.width || style.__cachedHeight != style.height) {
        var subviews = view.getSubviews();
        for (var i = 0, n = subviews.length; i < n; ++i) {
          this.add(subviews[i]);
        }
      }
    }
  };

  this.reflowViews = function (_ctx) {
    if (!this._pendingCount) { return; }

    this._iter = 0;

    var count;
    var uid;

    DEBUG_REFLOW && _debug.stepIn();
    if (DEBUG_TIME) {
      var startTime = Date.now();
    }

    // outer loop manages batched resize events
    // inner loop manages recursive reflow
    while (this._pendingCount) {

      // as long as we reflowed some views, keep looping
      while (this._pendingCount) {
        ++this._iter; // what iteration are we on? only increment a view's count once per iteration

        count = 0;
        for (uid in this._pending) {
          DEBUG_REFLOW && count == 0 && this._iter == 1 && console.log(' == beginning reflow == ');

          var item = this._pending[uid];
          if (item.count > MAX_REFLOW_THRESHOLD) {
            logger.warn('reflow loop detected for view', item.view.uid);
            this.cleanUp();
            break;
          }

          if (item.needsReflow) {
            ++item.count;
            DEBUG_REFLOW && _debug.log('-- reflow view', item.view.uid, '(' + item.count + ' times)') && _debug.stepIn();
            this.reflow(item.view);
            DEBUG_REFLOW && _debug.stepOut();
            ++count;
          }
        }

        DEBUG_REFLOW && count && _debug.log('***** iteration', this._iter, 'reflowed', count, 'views');
      }

      for (uid in this._pending) {
        var view = this._pending[uid].view;
        if (view.hasListeners('resize')) {
          var style = view.style;
          var w = style.width;
          var h = style.height;
          if (style.__cachedWidth != w || style.__cachedHeight != h) {
            DEBUG_REFLOW && _debug.log('view', view.uid, 'resize event firing', w + 'x' + h, '(prev: ' + style.__cachedWidth + 'x' + style.__cachedHeight + ')');
            style.__cachedWidth = w;
            style.__cachedHeight = h;
            view.emit('resize');
          }
        }
      }
    }

    this.cleanUp();

    if (DEBUG_REFLOW) {
      _debug.stepOut();
    }

    if (DEBUG_TIME && this._iter) {
      var now = Date.now();
      _debug.log('total reflow time:', now - startTime);
    }
  };


  this.cleanUp = function () {
    // recyle items
    for (var uid in this._pending) {
      _pool.recycle(this._pending[uid]);
      delete this._pending[uid];
    }

    this._pendingCount = 0;
  };
});

var _instance = null;
exports.get = function () {
  return (_instance || (_instance = new ReflowManager()));
};
