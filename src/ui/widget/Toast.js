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
 * @class ui.widget.Toast
 *
 * @doc http://doc.gameclosure.com/api/ui-widget-toast.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/widget/toast.md
 */

import animate;
import ui.ImageView as ImageView;
import ui.TextView as TextView;

exports = Class(ImageView, function (supr) {

	var defaults = {
		position: 'bottom',
		layout: 'box',
		debug: false,
		visible: false,
		autoSize: true,
		fixedAspectRatio: true,
		canHandleEvents: false
	};

	var positions = {
		top: {
			vertical: true,
			negFirst: false,
			style: {
				x: 0,
				bottom: undefined,
				layoutWidth: '100%'
			}
		},
		bottom: {
			vertical: true,
			negFirst: true,
			style: {
				x: 0,
				bottom: undefined,
				layoutWidth: '100%'
			}
		},
		topright: {
			vertical: false,
			negFirst: true,
			style: {
				y: 0,
				bottom: undefined,
				layoutWidth: undefined
			}
		},
		bottomright: {
			vertical: false,
			negFirst: true,
			style: {
				y: undefined,
				bottom: 0,
				layoutWidth: undefined
			}
		},
		topleft: {
			vertical: false,
			negFirst: false,
			style: {
				y: 0,
				bottom: undefined,
				layoutWidth: undefined
			}
		},
		bottomleft: {
			vertical: false,
			negFirst: false,
			style: {
				y: undefined,
				bottom: 0,
				layoutWidth: undefined
			}
		}
	};

	this.init = function (opts) {
		if (opts.debug) {
			opts.backgroundColor = 'red';
		}
		opts = merge(opts, defaults);
		supr(this, 'init', [opts]);
		this.text = new TextView({
			superview: this,
			layout: 'box',
			layoutWidth: '80%',
			layoutHeight: '60%',
			centerX: true,
			centerY: true
		});
		this.setImages(opts.images);
		this.setPosition(opts.position);
		opts.txt && this.text.setText(opts.txt);
	};

	this.setImages = function(imgs) {
		this._images = imgs || {};
		this.position && this.setImage(this._images[this.position]);
	};

	this.setPosition = function (pos) {
		for (var k in positions[pos].style) {
			this.style[k] = positions[pos].style[k];
		}
		this.position = pos;
		this.setImage(this._images[this.position]);
	};

	this.pop = function (text, position) {
		position && this.setPosition(position);
		if (!this._images[this.position]) {
			throw new Error("Toast " + this.uid + " doesn't have an image for position: " + this.position);
		}
		this.text.setText(text);
		var sv = this.getSuperview(),
			pos = positions[this.position],
			prop = pos.vertical ? 'y': 'x',
			dim = pos.vertical ? 'height' : 'width',
			inAnim = {}, outAnim = {};
		inAnim['d'+prop] = pos.negFirst ? -this.style[dim] : this.style[dim];
		outAnim['d'+prop] = pos.negFirst ? this.style[dim] : -this.style[dim];
		this.style[prop] = pos.negFirst ? sv.style[dim] : -this.style[dim];
		this.style.visible = true;
		animate(this).now(inAnim).wait(1000).then(outAnim);
	};
});