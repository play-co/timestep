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
 * package timestep.env.browser.TextBox;
 *
 * A textbox for inputting user data.
 */
import {
  merge,
  logger
} from 'base';

import browser from 'util/browser';
let $ = browser.$;

var defaultStyle = {
  padding: 0,
  lineHeight: 1.4,
  border: 'none',
  display: 'none',
  textAlign: 'center',
  verticalAlign: 'middle',
  fontSize: 16,
  fontFamily: null,
  fontWeight: '',
  opacity: 1,
  position: 'absolute',
  backgroundColor: 'transparent',
  top: 0,
  left: 0
};

exports = class {
  constructor (opts) {
    opts = merge(opts, {
      color: 'black',
      height: 20
    });

    var style = merge({}, defaultStyle);
    if (opts.color) {
      style.color = opts.color;
    }

    this._el = $({
      tag: opts.multiLine ? 'textarea' : 'input',
      attrs: { type: 'text' },
      style: style
    });

    $.onEvent(this._el, 'blur', this, 'onBlur');
    $.onEvent(this._el, 'focus', this, 'onFocus');
    $.onEvent(this._el, 'change', this, 'onChange');
    $.onEvent(this._el, 'click', this, 'onClick');
  }
  onClick () {}
  destroy () {
    $.remove(this._el);
    this._el = null;
  }
  setApp (app) {
    if (app != this._app || !this._el.parentNode) {
      this._app = app;
      var canvas = app._ctx.canvas;
      logger.log('setting parent', this._el);
      canvas.parentNode.appendChild(this._el);
    }
  }
  change () {}
  click () {}
  selectAll () {
    this._el.focus();
    this._el.select();
  }
  show () {
    $.show(this._el);
  }
  hide () {
    $.hide(this._el);
  }
  setValue (value) {
    this._el.value = value;
    return this;
  }
  setOpacity (o) {
    this._el.style.opacity = o;
    return this;
  }
  setType (type) {
    this._el.type = type;
    return this;
  }
  setVisible (isVisible) {
    return this[isVisible ? 'show' : ' hide']();
  }
  getX () {
    return parseInt(this._el.style.left);
  }
  getY () {
    return parseInt(this._el.style.top);
  }
  getWidth () {
    return this._el.offsetWidth;
  }
  getHeight () {
    return this._el.offsetHeight;
  }
  getValue () {
    return this._el.value;
  }
  getOpacity () {
    return this._el.style.opacity;
  }
  getType () {
    return this._el.type;
  }
  getVisible () {
    return this._el.parentNode && this._el.style.display == 'block';
  }
  setPosition (p) {
    this._el.style.top = p.y + 'px';
    this._el.style.left = p.x + 'px';
  }
  getPosition () {
    return {
      x: this.getX(),
      y: this.getY()
    };
  }
  setDimensions (d) {
    this._el.style.width = d.width + 'px';
    this._el.style.height = d.height + 'px';
    return this;
  }
  getDimensions () {
    return {
      width: this.getWidth(),
      height: this.getHeight()
    };
  }
};

exports.prototype.onBlur = exports.prototype.onClick;
exports.prototype.onFocus = exports.prototype.onClick;
exports.prototype.onChange = exports.prototype.onClick;

export default exports;
