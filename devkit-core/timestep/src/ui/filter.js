let exports = {};

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
import Color from 'ui/Color';

import DEFAULT_IMAGE from 'ui/resource/Image';

import WebGLContext2D from 'platforms/browser/webgl/WebGLContext2D';

var Image;

exports.Filter = class {
  constructor (type, shader) {
    this._type = type || '';
    this._views = [];

    this.shader = shader || WebGLContext2D.defaultShader;
  }
  getType () {
    return this._type;
  }
  update () {
  }
  setView (view) {
    var views = this._views;
    if (views.indexOf(view) === -1) {
      views.push(view);
    }
  }
  removeView (view) {
    var views = this._views;
    var i = views.indexOf(view);
    if (i !== -1) {
      views.splice(i, 1);
    }
  }
};

exports.ColorFilter = class extends exports.Filter {
  constructor (color, type, shader) {
    super(type, shader);
    this._color = new Color(color);
  }
  update (color) {
    this._color.update(color);
  }

  set color (value) {
    this._color.update(value);
  }

  get color () {
    return this._color;
  }
};

var ColorFilter = exports.ColorFilter;
var Filter = exports.Filter;

/**
 * Linear add (lighten) filter.
 */
exports.LinearAddFilter = class extends ColorFilter {
  constructor (color) {
    super(color, 'LinearAdd', WebGLContext2D.linearAddShader);
  }
};

/**
 * Tint (averaging) filter.
 */
exports.TintFilter = class extends ColorFilter {
  constructor (color) {
    super(color, 'Tint', WebGLContext2D.tintShader);
  }
};

/**
 * Multiply filter.
 */
exports.MultiplyFilter = class extends ColorFilter {
  constructor (color) {
    super(color, 'Multiply', WebGLContext2D.multiplyShader);
  }
};

/**
 * Positive masking.
 */
exports.PositiveMaskFilter = class extends Filter {
  constructor (opts) {
    super('PositiveMask');
    if (opts.image) {
      Image = Image || DEFAULT_IMAGE;
      this._mask = new Image({ url: opts.image });
    }
  }
  getMask () {
    return this._mask;
  }
};

/**
 * Negative masking.
 */
exports.NegativeMaskFilter = class extends Filter {
  constructor (opts) {
    super('NegativeMask');
    if (opts.image) {
      Image = Image || DEFAULT_IMAGE;
      this._mask = new Image({ url: opts.image });
    }
  }
  getMask () {
    return this._mask;
  }
};

/**
 * @class CustomFilter;
 * Custom filter class.
 *
 * Usage guide:
 * Step 1 - Create custom shader class extending from DefaultShader class.
 * Step 2 - Add the filter to desired view like this:
 *
 * @example
 * this.background.setFilter(new filter.CustomFilter(new WavyShader()));
 *
 * @example
 * // A custom shader example
 * import Shaders from 'platforms/browser/webgl/Shaders';
 * import WebGLContext2D from 'platforms/browser/webgl/WebGLContext2D';
 *
 * export default class WavyShader extends Shaders.DefaultShader {
 *  constructor (opts) {
 *   opts = opts || {};
 *   opts.gl = WebGLContext2D.gl;
 *   opts.vertexSrc = ...;
 *   opts.fragmentSrc = ...;
 *   opts.uniforms = { ..., uCustomValue: 0, ... };
 *   super(opts);
 *
 *   this.customValue = 0;
 *  }
 *
 *  // Override to use custom shader uniforms
 *  useProgram (ctx) {
 *   super.useProgram(ctx);
 *   var gl = this._gl;
 *   gl.uniform1f(this.uniforms.uCustomValue, this.customValue);
 *  }
 * }
}
 */
exports.CustomFilter = class extends Filter {
  /**
   * @constructor
   * @param {Shader} shader - Custom shader object to use when rendering the view.
   */
  constructor (shader) {
    super('Custom', shader);
  }
};

export default exports;
