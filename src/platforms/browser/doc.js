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

import lib.PubSub;
import lib.Enum as Enum;
import std.js as JS;
from util.browser import $;

import device;

var SCALING = Enum('FIXED', 'RESIZE', 'MANUAL');
var defaultScalingMode = device.isMobileBrowser || device.simulating ? SCALING.RESIZE : SCALING.FIXED;

/**
 * @extends lib.PubSub
 */
var Document = Class(lib.PubSub, function () {
	this.init = function () {
		if (!$) {
			return;
		}
		
		var doc = GLOBAL.document,
			body = doc && doc.body;
		
		this._el = $({
			parent: body,
			style: {
 				position: 'absolute',
				overflow: 'hidden',
				width: '100%',
				height: '100%'
			}
		});
		
		device.screen.subscribe('Resize', this, 'onResize');
		
		if (exports.postCreateHook) { exports.postCreateHook(this); }
		this.setScalingMode(defaultScalingMode);
	}
	
	this.unsubscribeResize = function () {
		device.screen.unsubscribe('Resize', this, 'onResize');
	}
	
	this.setEngine = function (engine) {
		if (engine == this._engine) { return; }
		
		this._engine = engine;
		this._canvas = this._engine.getCanvas();
		this.appendChild(this._canvas);

		if (this._canvas.getContext) {
			var ctx = this._canvas.getContext(window.WebGLRenderingContext ? 'webgl' : '2d');
			if (ctx.setParentNode) {
				ctx.setParentNode(this._el);
			}
		}
	}
	
	this.getElement = function () {
		return this._el;
	};
	
	this.setScalingMode = function (scalingMode, opts) {
		this._scalingMode = scalingMode;
		
		var el = this._el,
			s = el.style;
		
		switch (scalingMode) {
			case SCALING.FIXED:
				opts = merge(opts, {
						width: device.width,
						height: device.height
					});
				s.width = opts.width + 'px';
				s.height = opts.height + 'px';
				break;
			case SCALING.RESIZE:
				opts = merge(opts, {
						resizeCanvas: true
					});
				// fall through:
			case SCALING.MANUAL:
				s.margin = '0px';
				s.width = '100%';
				s.height = '100%';
				break;
		}
		
		this._scalingOpts = opts;
		this.onResize();
		setTimeout(bind(this, 'onResize'), 1000);
	}
	
	this.onResize = function () {
		var el = this._el;
		var s = this._el.style;
		
		el.className = device.screen.orientation;
		logger.log('resize', device.width, device.height);
		
		var width = device.width;
		var height = device.height;
		var mode = this._scalingMode;
		var opts = this._scalingOpts;
		
		if (mode == SCALING.FIXED) {
			width = opts.width;
			height = opts.height;
		}
		
		// enforce maxWidth/maxHeight
		// if maxWidth/maxHeight is met, switch a RESIZE scaling mode to FIXED (center the document on the screen)
		if (opts.maxWidth && width > opts.maxWidth) {
			width = opts.maxWidth;
			if (mode == SCALING.RESIZE) { mode = SCALING.FIXED; }
		}
		
		if (opts.maxHeight && height > opts.maxHeight) {
			height = opts.maxHeight;
			if (mode == SCALING.RESIZE) { mode = SCALING.FIXED; }
		}
		
		switch (mode) {
			case SCALING.MANUAL:
				break; // do nothing
			case SCALING.FIXED:
				// try to center the container
				el.style.top = Math.round(Math.max(0, (window.innerHeight - height) / 2)) + 'px';
				el.style.left = Math.round(Math.max(0, (window.innerWidth - width) / 2)) + 'px';
				
				s.width = width + 'px';
				s.height = height + 'px';
				break;
			case SCALING.RESIZE:
				// if we have a canvas element, scale it
				if (opts.resizeCanvas && this._canvas
						&& (this._canvas.width != width || this._canvas.height != height)) {
					this._canvas.width = width;
					this._canvas.height = height;
				}
				
				s.width = width + 'px';
				s.height = height + 'px';
				break;
		}
		
		// make sure to force a render immediately (should we use needsRepaint instead?)
		this._setDim(width, height);
		if (this._engine) { this._engine.render(); }
	}
	
	this._setDim = function (width, height) {
		if (this.width != width || this.height != height) {
			this.width = width;
			this.height = height;
			this.publish('Resize', width, height);
		}
	}
	
	this.setColors = function (bgColor, engineColor) {
		if (this._el) {
			this._el.style.background = engineColor;
			document.documentElement.style.background = document.body.style.background = bgColor;
		}
	}
	
	this.appendChild = function (el) {
		this._el.appendChild(el);
	}
	
	this.getOffset = function () {
		return {
			x: this._el.offsetLeft,
			y: this._el.offsetTop
		};
	}
});

exports = new Document();
exports.SCALING = SCALING;

exports.setDocStyle = function () {
	var doc = GLOBAL.document,
		body = doc && doc.body;
	
	if (body) {
		var docStyle = {
			height: '100%',
			margin: '0px',
			padding: '0px'
		};
	
		$.style(document.documentElement, docStyle);
		$.style(document.body, docStyle);
	}
}

exports.defaultParent = null;
exports.postCreateHook = null;
