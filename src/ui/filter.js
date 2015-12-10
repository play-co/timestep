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
 * @module ui.filter;
 *
 * A namespace for graphical filters used in games. These are attached using
 * View functions and applied using the Image class. This class is purely informational.
 *
 * If this is a namespace, the file name should be lower-case!
 *
 * Resources:
 *  http://jswidget.com/blog/2011/03/11/image-blending-algorithmpart-i/
 *  http://jswidget.com/blog/2011/03/11/image-blending-algorithmpart-ii/
 *
 * @doc http://doc.gameclosure.com/api/ui-filter.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/filter.md
 */

import ui.Color as Color;

var Image;

var Filter = exports.Filter = Class(function () {

  this.init = function (opts) {
    this._color = new Color(opts);
    this._type = opts.type || '';
    this._views = [];
  };

  this.get = function () {
    var opts = this._color.get();
    opts.type = this._type;
    opts.priority = 0;
    return opts;
  };

  this.getType = function () {
    return this._type;
  };

  this.update = function (opts) {
    opts = opts || this.get();
    this._color.update(opts);
    this._type = opts.type !== undefined ? opts.type : this._type;

    var views = this._views;
    for (var i = 0, len = views.length; i < len; i++) {
      var view = views[i];
      view.__view.filterColor = this.getColorString();
      view.__view.filterType = Filter.TYPES[this.getType()] || 0;
    }
  };

  this.setView = function (view) {
    var views = this._views;
    if (views.indexOf(view) === -1) {
      views.push(view);
    }
  };

  this.removeView = function (view) {
    var views = this._views;
    var i = views.indexOf(view);
    if (i !== -1) {
      views.splice(i, 1);
    }
  };

  this.getColorString = function () {
    return this._color.toString();
  };

});

Filter.TYPES = {
  "None": 0,
  "LinearAdd": 1,
  "Multiply": 2,
  "Tint": 3
};

/**
 * Linear add (lighten) filter.
 */

exports.LinearAddFilter = Class(Filter, function (supr) {
  this.init = function (opts) {
    supr(this, 'init', arguments);
    this._type = 'LinearAdd';
  };
});

/**
 * Tint (averaging) filter.
 */

exports.TintFilter = Class(Filter, function (supr) {
  this.init = function (opts) {
    supr(this, 'init', arguments);
    this._type = 'Tint';
  };
});

/**
 * Multiply filter.
 */

exports.MultiplyFilter = Class(Filter, function (supr) {
  this.init = function (opts) {
    supr(this, 'init', arguments);
    this._type = 'Multiply';
  };
});

/**
 * Positive masking.
 */

exports.PositiveMaskFilter = Class(Filter, function (supr) {
  this.init = function (opts) {
    supr(this, 'init', arguments);
    this._type = 'PositiveMask';
    if (opts.image) {
      Image = Image || jsio('import ui.resource.Image');
      this._mask = new Image({ url: opts.image });
    }
  };

  this.getMask = function () {
    return this._mask;
  };
});

/**
 * Negative masking.
 */

exports.NegativeMaskFilter = Class(Filter, function (supr) {
  this.init = function (opts) {
    supr(this, 'init', arguments);
    this._type = 'NegativeMask';
    if (opts.image) {
      Image = Image || jsio('import ui.resource.Image');
      this._mask = new Image({ url: opts.image });
    }
  };

  this.getMask = function () {
    return this._mask;
  };
});
