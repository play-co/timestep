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

import setProperty from 'util/setProperty';

// keys map to properties
var BASE_STYLE_PROPS = {
  'x': { value: 0 },
  'y': { value: 0 },
  // translate
  'offsetX': { value: 0 },
  'offsetY': { value: 0 },
  // rotation and scale
  'anchorX': { value: 0 },
  'anchorY': { value: 0 },
  'centerAnchor': { value: false },
  'width': { cb: '_onResize' },
  'height': { cb: '_onResize' },
  'r': { value: 0 },
  'opacity': { value: 1 },
  'zIndex': {
    value: 0,
    cb: '_onZIndex'
  },
  'scale': { value: 1 },
  'scaleX': { value: 1 },
  'scaleY': { value: 1 },
  'flipX': { value: false },
  'flipY': { value: false },
  'visible': { value: true },
  'clip': { value: false },
  'backgroundColor': { value: '' },
  'compositeOperation': { value: '' }
};

export default class BaseBacking {

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
    var copy = {};

    for (var i = 0; i < styleKeyList.length; i++) {
      var key = styleKeyList[i];
      copy[key] = this[key];
    }

    return copy;
  }

  update (style) {
    for (var i = 0; i < styleKeyList.length; i++) {
      var key = styleKeyList[i];
      if (style[key] !== void 0) {
        this[key] = style[key];
      }
    }
    return this;
  }

};

var styleKeys = BaseBacking.prototype.constructor.styleKeys = {};
var styleKeyList = [];

BaseBacking.prototype.constructor.addProperty = function (key, def) {
  styleKeys[key] = true;
  styleKeyList.push(key);
  setProperty(BaseBacking.prototype, key, def);
};

for (var key in BASE_STYLE_PROPS) {
  BaseBacking.prototype.constructor.addProperty(key, BASE_STYLE_PROPS[key]);
}
