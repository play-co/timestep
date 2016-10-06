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


function getter(name) {
  return (function () {
    return this._ctxShim[name];
  });
}

function setter(name) {
  return (function (val) {
    this._ctxShim[name] = val;
  });
}

function wrap(name) {
  return function () {};
}

exports = Class(function () {
  this.init = function () {
    this._ctxShim = {};
  }

  this.getViewport = function (targetView) {
    if (this._viewport) {
      var viewport = new math2D.Rect(this._viewport),
        src = this._viewport.src,
        v = targetView,
        trace = [targetView];

      while(v != src) {
        v = v._superview;
        if (!v) { return null; }
        trace.push(v);
      }

      // TODO: finish this - translate viewport to local coordinates?
      // should use a modified View::getAbsolutePos(relativeTo)
      while((v = trace.pop())) {
        //viewport.
      }

      return viewport;
    }
  }

  this.swap = function () {}

  this.reset = function () {
    this._buffer = [];
  }

  this.hide = function () { throw 'abstract'; }

  this.fillCircle = function (x, y, radius, fillStyle) {
    this._buffer.push(['beginPath']);
    this._buffer.push(['arc', [x, y, radius, 0, 2 * Math.PI, true]]);
    this._buffer.push(['fill']);
  }
});


exports.prototype.drawImage = wrap('drawImage');
exports.prototype.putImageData = wrap('putImageData');

exports.prototype.fillRect = wrap('fillRect');


exports.prototype.fillText = wrap('fillText');
exports.prototype.measureText = wrap('measureText');
exports.prototype.strokeText = wrap('strokeText');
exports.prototype.beginPath = wrap('beginPath');
exports.prototype.moveTo = wrap('moveTo');
exports.prototype.closePath = wrap('closePath');
exports.prototype.lineTo = wrap('lineTo');

exports.prototype.arc = wrap('arc');
exports.prototype.quadraticCurveTo = wrap('quadraticCurveTo');

exports.prototype.rect = wrap('rect');
exports.prototype.fillRect = wrap('fillRect');
exports.prototype.strokeRect = wrap('strokeRect');

exports.prototype.save = wrap('save');
exports.prototype.restore = wrap('restore');

exports.prototype.clip = wrap('clip');
exports.prototype.stroke = wrap('stroke');
exports.prototype.fill = wrap('fill');

exports.prototype.translate = wrap('translate');
exports.prototype.rotate = wrap('rotate');
exports.prototype.scale = wrap('scale');


exports.prototype.show = exports.prototype.hide;
