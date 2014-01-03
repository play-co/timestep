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
 * @package ui.backend.dom.ImageView;
 *
 * Renders an image in a View for canvas.
 */

import ui.View as View;
import ui.resource.Image as Image;

/**
 * @extends timestep.View
 */
exports = Class(View, function (supr) {

	this.init = function (opts) {
		opts = merge(opts, {
			image: null,
			autoSize: false
		});

		supr(this, "init", [opts]);

		var s = this.__view._node.style;
		s.webkitBackgroundClip = s.backgroundClip = 'content-box';

		if (opts.image) {
			this.setImage(opts.image, opts);
		}
	};

	this.updateOpts = function (opts) {
		var opts = supr(this, 'updateOpts', arguments);

		if ('autoSize' in opts) {
			this._autoSize = !!opts.autoSize;
		}

		if (opts.image) {
			this.setImage(opts.image);
		} else {
			this.needsReflow();
		}

		return opts;
	}

	this.autoSize = function () {
		if (this._img) {
			this.style.width = this._img.getWidth();
			this.style.height = this._img.getHeight();

			if (this.style.fixedAspectRatio) {
				this.style.updateAspectRatio();
			}
		}
	}

	this._imgCache = {};

	this.getImage = function () { return this._img; }
	this.setImage = function (img, opts) {
		if (typeof img == 'string') {
			// Cache image requests to avoid heavy performance penalties at the
			// expense of a small amount of additional JS memory usage.
			var name = img;
			img = this._imgCache[name];
			if (!img) {
				this._imgCache[name] = img = new Image({url: name});
			}
		}

		if (img != this._img) {
			if (this._img) {
				this._img.unsubscribe('changeBounds', this);
			}

			this._img = img;

			if (img) {
				// use subscribe/unsubscribe to avoid warnings about 'possible memory leak detected' in EventEmitter API
				img.subscribe('changeBounds', this, 'updateImage');
				this._autoSize = (opts && ('autoSize' in opts)) ? opts.autoSize : this._autoSize;
				if (this._autoSize) {
					// sprited resources will know their dimensions immediately
					if (img.getWidth() > 0 && img.getHeight() > 0) {
						this.autoSize();
					} else {
						// non-sprited resources need to load first
						img.doOnLoad(this, 'autoSize');
					}
				}

				img.doOnLoad(this, 'updateImage');
			} else {
				this.updateImage();
			}
		}
	}

	this.reflow = function () {
		this.updateImage();
	}

	this._getBackgroundNode = function (imageURL) {
		// When a css background-image is set that has an etag and no max-age
		// (as when developing using the browser simulator in debug mode),
		// Chrome sends an HTTP request for images to check for a 304
		// response, causing the background image to flicker.  When using a
		// sprite-view updating every frame, this causes tons of http requests
		// and flickering.  To get around this, we add a separate DOM node for
		// each unique sprite sheet that an image can show
		// (opts['dom:multipleImageNodes'] == true).  The SpriteView (subclass
		// of ImageView) enables this option by default when we're in debug
		// mode.
		if (!this._bgNodes) {
			this._bgNodes = {};
		}

		var el = this._bgNodes[imageURL];
		if (!el) {
			// create a background node for this URL if we don't
			// already have one
			this._bgNodes[imageURL] = el = document.createElement('div');
			el.style.cssText =
				  '-webkit-background-clip:content-box;'
				+ 'background-clip:content-box;'
				+ 'z-index:-1;'
				+ 'position:absolute;'
				+ 'top:0;'
				+ 'left:0;'
				+ 'bottom:0;'
				+ 'right:0;'
				+ 'background-image:' + imageURL + ';';

			this.__view._node.appendChild(el);
		}

		if (el != this._currentBgNode) {
			// hide the previous background node
			if (this._currentBgNode) {
				this._currentBgNode.style.visibility = 'hidden';
			}

			// show the current background node
			this._currentBgNode = el;
			el.style.visibility = 'visible';
		}

		return el;
	}

	this._canvasRender = function (ctx, opts) {
		var canvas = this._img.getSource();
		ctx.drawImage(canvas,
				0, 0, canvas.width, canvas.height,
				0, 0, this.style.width, this.style.height);
	}

	// sets the CSS background-image for this node
	this.updateImage = function () {
		var img = this._img;
		var multipleImageNodes = this._opts['dom:multipleImageNodes'];

		if (img && img.getSource() instanceof HTMLCanvasElement) {
			this.render = this._canvasRender;
			this.needsRepaint();
		} else {
			// clear the background image if necessary
			if (!img || !img.isReady()) {
				if (multipleImageNodes && this._currentBgNode) {
					this._currentBgNode.style.visibility = 'hidden';
				} else {
					this.__view._node.style.backgroundImage = 'none';
				}
			} else {
				var imageURL = 'url("' + img.getSource().src + '")';
				var sheetWidth = img.getSourceWidth();
				var sheetHeight = img.getSourceHeight();
				var scaleX = this.style.width / img.getWidth();
				var scaleY = this.style.height / img.getHeight();

				var s;
				if (multipleImageNodes) {
					s = this._getBackgroundNode(imageURL).style;
				} else {
					s = this.__view._node.style;
					if (this._cacheImageURL != imageURL) {
						this._cacheImageURL = imageURL;
						s.backgroundImage = imageURL;
					}
				}

				var bounds = img.getBounds();
				s.padding = scaleY * bounds.marginTop + 'px '
					+ scaleX * bounds.marginRight + 'px '
					+ scaleY * bounds.marginBottom + 'px '
					+ scaleX * bounds.marginLeft + 'px';
				s.backgroundPositionX = scaleX * (-bounds.x + bounds.marginLeft) + 'px';
				s.backgroundPositionY = scaleY * (-bounds.y + bounds.marginTop) + 'px';
				s.backgroundSize = sheetWidth * scaleX + 'px ' + sheetHeight * scaleY + 'px';
			}
		}
	}

	this.getOrigWidth = this.getOrigW = function () { return this._img.getOrigW(); }
	this.getOrigHeight = this.getOrigH = function () { return this._img.getOrigH(); }

	this.doOnLoad = function () {
		if (arguments.length == 1) {
			this._img.doOnLoad(this, arguments[0]);
		} else {
			this._img.doOnLoad.apply(this._img, arguments);
		}
		return this;
	}

});
