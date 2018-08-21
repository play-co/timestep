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
import {
  merge,
  logger
} from 'base';

import View from 'ui/View';

/**
 * @class ui.ViewPool;
 * facilitates easy view re-use
 */
export default class ViewPool {
  constructor (opts) {
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
  }
  obtainView (opts) {
    var view, views = this._views;
    if (this._freshViewIndex < views.length) {
      // re-use an existing view if we can
      view = views[this._freshViewIndex];
      opts && view.updateOpts(opts);
    } else {
      // create a new view, ideally this never happens during gameplay
      view = this._createView(opts);
      if (this._logViewCreation) {
        logger.warn('ViewPool created View:', view.getTag());
      }
    }

    view._obtainedFromPool = true;
    view.style.visible = true;
    this._freshViewIndex++;
    return view;
  }
  releaseView (view) {
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
  }
  releaseAllViews () {
    var views = this._views;
    for (var i = 0, len = views.length; i < len; i++) {
      var view = views[i];
      view._obtainedFromPool = false;
      view.style.visible = false;
    }
    this._freshViewIndex = 0;
  }
  forEachActiveView (fn, ctx) {
    var views = this._views;
    for (var i = this._freshViewIndex - 1; i >= 0; i--) {
      fn.call(ctx, views[i], i);
    }
  }
  _createView (opts) {
    var views = this._views;
    var view = new this._ctor(merge(opts, this._initOpts));
    view._poolIndex = views.length;
    views.push(view);
    return view;
  }
}
