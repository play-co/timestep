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

"use import";

/**
 * package timestep.env.browser.TextBox;
 *
 * A textbox for inputting user data.
 */

from util.browser import $;

exports = Class(function () {
	
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
		position: "absolute",
		backgroundColor: "transparent",
		top: 0,
		left: 0
	};
	
	this.init = function (opts) {
		opts = merge(opts, {
			color: 'black',
			height: 20
		});

		var style = merge({}, defaultStyle);
		if (opts.color) { style.color = opts.color; }
		
		this._el = $({
			tag: opts.multiLine ? "textarea" : "input",
			attrs: {type: "text"}, 
			style: style
		});

		$.onEvent(this._el, 'blur', this, 'onBlur');
		$.onEvent(this._el, 'focus', this, 'onFocus');
		$.onEvent(this._el, 'change', this, 'onChange');
		$.onEvent(this._el, 'click', this, 'onClick');
	}
	
	this.onBlur = 
	this.onFocus =
	this.onChange =
	this.onClick = function () {}
	
	this.destroy = function () {
		$.remove(this._el);
		this._el = null;
	}
	
	this.setApp = function (app) {
		if (app != this._app || !this._el.parentNode) {
			this._app = app;
			var canvas = app._ctx.canvas;
			logger.log('setting parent', this._el);
			canvas.parentNode.appendChild(this._el);
		}
	}
	
	this.change = function () {
		
	}
	
	this.click = function () {
	}
	
	this.selectAll = function () {
		this._el.focus();
		this._el.select();
	}
	
	this.show = function () { $.show(this._el); }
	this.hide = function () { $.hide(this._el); }
	
	this.setValue = function (value) { this._el.value = value; return this; }
	this.setOpacity = function (o) { this._el.style.opacity = o; return this; }
	this.setType = function (type) { this._el.type = type; return this; }
	this.setVisible = function (isVisible) { return this[isVisible ? 'show': ' hide'](); }
	this.getX = function () { return parseInt(this._el.style.left); }
	this.getY = function () { return parseInt(this._el.style.top); }
	this.getWidth = function () { return this._el.offsetWidth; }
	this.getHeight = function () { return this._el.offsetHeight; }
	this.getValue = function () { return this._el.value; }
	this.getOpacity = function () { return this._el.style.opacity; }
	this.getType = function () { return this._el.type; }
	this.getVisible = function () { return this._el.parentNode && this._el.style.display == 'block'; }
	
	this.setPosition = function (p) { this._el.style.top = p.y + 'px'; this._el.style.left = p.x + 'px'; }
	this.getPosition = function () { return {x: this.getX(), y: this.getY()}; }
	
	this.setDimensions = function (d) { this._el.style.width = d.width + 'px'; this._el.style.height = d.height + 'px'; return this; }
	this.getDimensions = function () { return {width: this.getWidth(), height: this.getHeight()}; }
});
