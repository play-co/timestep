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

import ui.View as View;

/**
 * @class ui.ViewPool;
 * facilitates easy view re-use
 */
exports = Class('ViewPool', function () {
  /**
   * opts.ctor (function) constructor function for the class you want to pool,
   * must inherit from View
   *
   * opts.initCount (integer) pre-initialize this many views,
   * for optimal performance, avoid view instantiation during gameplay
   *
   * opts.initOpts (object) opts object used only to pre-initialize views
   */
  this.init = function (opts) {
    var initCount = opts.initCount || 0;
    this._initOpts = opts.initOpts || {};

    this._ctor = opts.ctor || View;
    this._freshViewIndex = 0;
    this._views = [];
    this._logViewCreation = initCount > 0;

    for (var i = 0; i < initCount; i++) {
      var view = this._createView(merge({}, this._initOpts));
      view.style.visible = false;
    }
  };

  /**
   * opts (object) view options applied to the obtained view
   *
   * returns a view from the pool
   */
  this.obtainView = function (opts) {
    var views = this._views;
    if (this._freshViewIndex < views.length) {
      // re-use an existing view if we can
      var view = views[this._freshViewIndex];
      opts && view.updateOpts(opts);
    } else {
      // create a new view, ideally this never happens during gameplay
      var view = this._createView(opts);
      if (this._logViewCreation) {
        logger.warn("ViewPool created View:", view.getTag());
      }
    }
    view._obtainedFromPool = true;
    view.style.visible = true;
    this._freshViewIndex++;
    return view;
  };

  /**
   * view (instance of this._ctor) to be recycled into the pool
   *
   * returns a boolean, whether the view was actually released
   */
  this.releaseView = function (view) {
    var views = this._views;
    var released = false;
    if (view._obtainedFromPool) {
      released = true;
      view._obtainedFromPool = false;
      view.style.visible = false;
      var temp = views[this._freshViewIndex - 1];
      views[this._freshViewIndex - 1] = view;
      views[view._poolIndex] = temp;
      var tempIndex = temp._poolIndex;
      temp._poolIndex = view._poolIndex;
      view._poolIndex = tempIndex;
      this._freshViewIndex--;
    }
    return released;
  };

  /**
   * release all views to the pool
   */
  this.releaseAllViews = function () {
    var views = this._views;
    for (var i = 0, len = views.length; i < len; i++) {
      var view = views[i];
      view._obtainedFromPool = false;
      view.style.visible = false;
    }
    this._freshViewIndex = 0;
  };

  /**
   * fn (function) called for each obtained view, takes params: view, index
   *
   * ctx (object) the context on which fn should be called
   *
   * like Array.forEach, call a function for each obtained view
   */
  this.forEachActiveView = function(fn, ctx) {
    var views = this._views;
    for (var i = this._freshViewIndex - 1; i >= 0; i--) {
      fn.call(ctx, views[i], i);
    }
  };

  /**
   * internal-use-only: populates view pool with new instances of this._ctor
   */
  this._createView = function (opts) {
    var views = this._views;
    var view = new this._ctor(merge(opts, this._initOpts));
    view._poolIndex = views.length;
    views.push(view);
    return view;
  };

});
