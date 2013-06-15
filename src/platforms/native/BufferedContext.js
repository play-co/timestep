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
	
	this.show = this.hide = function () { throw 'abstract'; }

	this.drawImage = wrap('drawImage');
	this.putImageData = wrap('putImageData');
	
	this.fillRect = wrap('fillRect');
	this.fillCircle = function (x, y, radius, fillStyle) {
		this._buffer.push(['beginPath']);
		this._buffer.push(['arc', [x, y, radius, 0, 2 * Math.PI, true]]);
		this._buffer.push(['fill']);
	}
	
	this.fillText = wrap('fillText');
	this.measureText = wrap('measureText');
	this.strokeText = wrap('strokeText');
	this.beginPath = wrap('beginPath');
	this.moveTo = wrap('moveTo');
	this.closePath = wrap('closePath');
	this.lineTo = wrap('lineTo');

	this.arc = wrap('arc');
	this.quadraticCurveTo = wrap('quadraticCurveTo');
	
	this.rect = wrap('rect');
	this.fillRect = wrap('fillRect');
	this.strokeRect = wrap('strokeRect');

	this.save = wrap('save');
	this.restore = wrap('restore');
	
	this.clip = wrap('clip');
	this.stroke = wrap('stroke');
	this.fill = wrap('fill');
	
	this.translate = wrap('translate');
	this.rotate = wrap('rotate');
	this.scale = wrap('scale');

});
