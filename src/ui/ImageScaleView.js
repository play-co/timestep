/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @class ui.ImageScaleView
 *
 * @doc http://doc.gameclosure.com/api/ui-imageview.html#class-ui.imagescaleview
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/imageview.md
 */

import ui.View;
import ui.resource.Image as Image;

exports = Class(ui.View, function (supr) {

	var defaults = {
		image: null,
		autoSize: false,
		scaleMethod: 'stretch',
		renderCenter: true,
		clip: true
	};

	this.init = function (opts) {
		var opts = merge(opts, defaults);
		supr(this, 'init', [opts]);
	};

	this.updateOpts = function(opts) {
		opts = supr(this, 'updateOpts', arguments);

		if (opts.scaleMethod) {
			this._scaleMethod = opts.scaleMethod;
			this._isSlice = this._scaleMethod.slice(1) == 'slice';
		}

		this.debug = !!opts.debug

		// {horizontal: {left: n, center: n, right: n}, vertical: {top: n, middle: n, bottom: n}}
		this._sourceSlices = opts.sourceSlices;
		// {horizontal: {left: n, right: n}, vertical: {top: n, bottom: n}}
		this._destSlices = opts.destSlices || opts.sourceSlices;

		this._imgScale = opts.imgScale || 1;

		if (this._isSlice) {
			if (opts.scaleMethod === '2slice') {
				if (opts.sourceSlices.horizontal && opts.destSlices.horizontal) {
					if (opts.destSlices.horizontal.left) {
						opts.sourceSlices.horizontal.center = opts.sourceSlices.horizontal.right;
						opts.sourceSlices.horizontal.right = 0;
					} else if (opts.destSlices.horizontal.right) {
						opts.sourceSlices.horizontal.center = opts.sourceSlices.horizontal.left;
						opts.sourceSlices.horizontal.left = 0;
					}
				}
				if (opts.sourceSlices.vertical && opts.destSlices.vertical) {
					if (opts.destSlices.vertical.top) {
						opts.sourceSlices.vertical.middle = opts.sourceSlices.vertical.bottom;
						opts.sourceSlices.vertical.bottom = 0;
					} else if (opts.destSlices.vertical.bottom) {
						opts.sourceSlices.vertical.middle = opts.sourceSlices.vertical.bottom;
						opts.sourceSlices.vertical.bottom = 0;
					}
				}
			}

			if (!opts.sourceSlices || !(opts.sourceSlices.horizontal || opts.sourceSlices.vertical)) {
				throw new Error('slice views require sourceSlices.horizontal and/or sourceSlices.vertical');
			}
			if (opts.sourceSlices.horizontal) {
				var cent = opts.width ? (opts.width - opts.sourceSlices.horizontal.left - opts.sourceSlices.horizontal.right) : 0;
				this._sourceSlicesHor = [
					opts.sourceSlices.horizontal.left,
					opts.sourceSlices.horizontal.center || cent,
					opts.sourceSlices.horizontal.right
				];
				this._destSlicesHor = [
					(this._destSlices.horizontal.left || 0) * this._imgScale,
					0,
					(this._destSlices.horizontal.right || 0) * this._imgScale
				];
			} else {
				this._sourceSlicesHor = [0, 100, 0];
				this._destSlicesHor = [0, 100, 0];
			}

			if (opts.sourceSlices.vertical) {
				var cent = opts.height ? (opts.height - opts.sourceSlices.vertical.top - opts.sourceSlices.vertical.bottom) : 0;
				this._sourceSlicesVer = [
					opts.sourceSlices.vertical.top,
					opts.sourceSlices.vertical.middle || cent,
					opts.sourceSlices.vertical.bottom
				];
				this._destSlicesVer = [
					(this._destSlices.vertical.top || 0) * this._imgScale,
					0,
					(this._destSlices.vertical.bottom || 0) * this._imgScale
				];
			} else {
				this._sourceSlicesVer = [0, 100, 0];
				this._destSlicesVer = [0, 100, 0];
			}
		}

		if (opts.image) {
			this.setImage(opts.image, opts);
		}
		if (opts.verticalAlign) {
			this._verticalAlign = opts.verticalAlign;
		}
		if (opts.align) {
			this._align = opts.align;
		}

		this.rows = opts.rows;
		this.columns = opts.columns;

		return opts;
	};

	this.getImage = function() {
		return this._img;
	};

	this.setImage = function(img, opts) {
		var autoSized = false;
		var sw, sh, iw, ih, bounds;
		opts = merge(opts, this._opts);

		if (typeof img == 'string') {
			bounds = GCResources.getMap()[img];
			if (bounds) {
				iw = bounds.w;
				ih = bounds.h;
			}
		} else if (img instanceof Image && img.isLoaded()) {
			bounds = img.getBounds();
			iw = bounds.width;
			ih = bounds.height;
		}

		if (!bounds) {
			if (typeof img == 'string') {
				img = new Image({url: img});
			}
			return img.doOnLoad(this, 'setImage', img, opts);
		}

		if (opts.autoSize && this._scaleMethod == "stretch" && !((opts.width || opts.layoutWidth) && (opts.height || opts.layoutHeight))) {
			autoSized = true;
			if (this.style.fixedAspectRatio) {
				this.style.updateAspectRatio(iw, ih);
				var parent = this.getSuperview();
				if (opts.width) {
					iw = opts.width;
					ih = opts.width / this.style.aspectRatio;
				}
				else if (opts.height) {
					ih = opts.height;
					iw = opts.height * this.style.aspectRatio;
				}
				else if (opts.layoutWidth && parent.style.width) {
					iw = parent.style.width * parseFloat(opts.layoutWidth) / 100;
					ih = iw / this.style.aspectRatio;
				}
				else if (opts.layoutHeight && parent.style.height) {
					ih = parent.style.height * parseFloat(opts.layoutHeight) / 100;
					iw = ih * this.style.aspectRatio;
				}
			}
			this.style.width = iw;
			this.style.height = ih;
		}

		if (this._isSlice) {
			var sourceSlicesHor = this._sourceSlicesHor;
			var sourceSlicesVer = this._sourceSlicesVer;
			if (sourceSlicesHor) {
				sw = sourceSlicesHor[0] + sourceSlicesHor[1] + sourceSlicesHor[2];
				var scale = iw / sw;
				sourceSlicesHor[0] *= scale;
				sourceSlicesHor[1] *= scale;
				sourceSlicesHor[2] *= scale;
			}
			if (sourceSlicesVer) {
				sh = sourceSlicesVer[0] + sourceSlicesVer[1] + sourceSlicesVer[2];
				var scale = ih / sh;
				sourceSlicesVer[0] *= scale;
				sourceSlicesVer[1] *= scale;
				sourceSlicesVer[2] *= scale;
			}
		}

		this._img = (typeof img == 'string') ? new Image({url: img}) : img;

		if (this._img) {
			if (opts && opts.autoSize && !autoSized) {
				this._img.doOnLoad(this, 'autoSize');
			}

			this._img.doOnLoad(this, 'needsRepaint');
		}
	};

	this.doOnLoad = function() {
		if (arguments.length == 1) {
			this._img.doOnLoad(this, arguments[0]);
		} else {
			this._img.doOnLoad.apply(this._img, arguments);
		}
		return this;
	};

	this.autoSize = function() {
		if (this._img) {
			this.style.width = this._opts.width || this._img.getWidth();
			this.style.height = this._opts.height || this._img.getHeight();
		}
	};

	this.getOrigWidth = this.getOrigW = function() {
		return this._img.getOrigW();
	};

	this.getOrigHeight = this.getOrigH = function() {
		return this._img.getOrigH();
	};

	this.renderSlice = function(ctx) {
		var debugColors = ['#FF0000', '#00FF00', '#0000FF'];
		var globalScale = this.getPosition().scale;

		var bounds = this._img.getBounds();
		var iw = bounds.width;
		var ih = bounds.height;

		var image = this._img.getSource();
		var sourceSlicesHor = this._sourceSlicesHor;
		var sourceSlicesVer = this._sourceSlicesVer;
		var destSlicesHor = [];
		var destSlicesVer = [];
		var sx = bounds.x;
		var sy = bounds.y;
		var sw = iw;
		var sh = ih;

		var s = this.style;
		var w = s.width;
		var h = s.height;

		var dx = 0;
		var dy = 0;
		var dw = w;
		var dh = h;

		var i, j;

		if ((iw <= 0) || (ih <= 0)) {
			return;
		}

		if (sourceSlicesHor) {
			var ratio = this.style.fixedAspectRatio ? h / ih : 1;
			destSlicesHor[0] = this._destSlicesHor[0] * ratio;
			destSlicesHor[2] = this._destSlicesHor[2] * ratio;
			destSlicesHor[1] = w - destSlicesHor[0] - destSlicesHor[2];

			if (destSlicesHor[1] < 0) {
				dw = destSlicesHor[0] + destSlicesHor[2];
				destSlicesHor[0] = (destSlicesHor[0] * w / dw) | 0;
				destSlicesHor[1] = 0;
				destSlicesHor[2] = w - destSlicesHor[0];
			}
		}

		if (sourceSlicesVer) {
			var ratio = this.style.fixedAspectRatio ? w / iw : 1;
			destSlicesVer[0] = this._destSlicesVer[0] * ratio;
			destSlicesVer[2] = this._destSlicesVer[2] * ratio;
			destSlicesVer[1] = h - destSlicesVer[0] - destSlicesVer[2];

			if (destSlicesVer[1] < 0) {
				dh = destSlicesVer[0] + destSlicesVer[2];
				destSlicesVer[0] = (destSlicesVer[0] * h / dh) | 0;
				destSlicesVer[1] = 0;
				destSlicesVer[2] = h - destSlicesVer[0];
			}
		}

		var heightBalance = 0;
		for (j = 0; j < 3; j++) {
			var widthBalance = 0;
			var idealHeight = destSlicesVer[j] + heightBalance;
			var roundedHeight = Math.round(globalScale * idealHeight) / globalScale;
			heightBalance = idealHeight - roundedHeight;

			sh = sourceSlicesVer[j];
			dh = roundedHeight;
			sx = bounds.x;
			dx = 0;
			for (i = 0; i < 3; i++) {
				var idealWidth = destSlicesHor[i] + widthBalance;
				var roundedWidth = Math.round(globalScale * idealWidth) / globalScale;
				widthBalance = idealWidth - roundedWidth;

				sw = sourceSlicesHor[i];
				dw = roundedWidth;
				if ((dw > 0) && (dh > 0)) {
					ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
					if (this.debug) {
						ctx.strokeStyle = debugColors[(j + i) % 3];
						ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
					}
				}

				sx += sw;
				dx += dw;
			}
			sy += sh;
			dy += dh;
		}
	};

	this.render = function(ctx) {
		if (!this._img) { return; }

		var s = this.style;
		var w = s.width;
		var h = s.height;

		var bounds = this._img.getBounds();
		var iw = bounds.width;
		var ih = bounds.height;

		var debugColors = ['#FF0000', '#00FF00', '#0000FF'];

		switch (this._scaleMethod) {
			case 'none':
				this._img.render(ctx, 0, 0);
				break;

			case 'stretch':
				this._img.render(ctx, 0, 0, w, h);
				break;

			case 'contain':
			case 'cover':
				var scale = 1;
				var targetRatio = iw / ih;
				var ratio = w / h;
				if (this._scaleMethod == 'cover' ? ratio > targetRatio : ratio < targetRatio) {
					scale = w / iw;
				} else {
					scale = h / ih;
				}
				var finalWidth = iw * scale;
				var finalHeight = ih * scale;
				var x = this._align == 'left' ? 0 : this._align == 'right' ? w - finalWidth : (w - finalWidth) / 2;
				var y = this._verticalAlign == 'top' ? 0 : this._verticalAlign == 'bottom' ? h - finalHeight : (h - finalHeight) / 2;
				this._img.render(ctx, x, y, finalWidth, finalHeight);
				break;

			case 'tile':
				var x = 0, y = 0;

				if (this.rows) {
					var targetHeight = h / this.rows;
					var targetRatio = targetHeight / ih;
					var targetWidth = iw * targetRatio;
					for (var i = 0; i < this.rows; i++) {
						while (x < w) {
							this._img.render(ctx, x, y, targetWidth, targetHeight);
							if (this.debug) {
								ctx.strokeStyle = debugColors[i % 3];
								ctx.strokeRect(x + 0.5, y + 0.5, targetWidth - 1, targetHeight - 1);
							}
							x += targetWidth;
						}
						y += targetHeight;
					}
				}
				else if (this.columns) {
					var targetWidth = w / this.columns;
					var targetRatio = targetWidth / iw;
					var targetHeight = ih * targetRatio;
					for (var i = 0; i < this.columns; i++) {
						while (y < h) {
							this._img.render(ctx, x, y, targetWidth, targetHeight);
							if (this.debug) {
								ctx.strokeStyle = debugColors[i % 3];
								ctx.strokeRect(x + 0.5, y + 0.5, targetWidth - 1, targetHeight - 1);
							}
							y += targetHeight;
						}
						x += targetWidth;
					}
				}
				break;

			case '2slice':
			case '3slice':
			case '6slice':
			case '9slice':
				this.renderSlice(ctx);
				break;
		}
	};

	this.getTag = function() {
		return 'ImageScaleView' + this.uid + ':' + (this._img && this._img._map.url.substring(0, 16));
	};
});
