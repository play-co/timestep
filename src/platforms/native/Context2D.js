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

import std.uri
import lib.Enum as Enum;
import util.setProperty;

import .BufferedCanvas;
import device;
import .FontRenderer;

import ui.resource.Font as Font;

var _createdOnscreenCanvas = false;

exports = Class(BufferedCanvas, function (supr) {

	//FIXME add globalalpha back to these
	this.updateState = function (src, dest) {
/*
		obj.stroke = this.stroke;
		obj.patternQuality = this.patternQuality;
		obj.fillPattern = this.fillPattern;
		obj.strokePattern = this.strokePattern;
*/
		dest.font = src.font;
		dest.textAlign = src.textAlign;
		dest.textBaseline = src.textBaseline;
		dest.fillStyle = src.fillStyle;
		dest.strokeStyle = src.strokeStyle;
/*
		obj.shadow = this.shadow;
		obj.shadowBlur = this.shadowBlur;
		obj.shadowOffsetX = this.shadowOffsetX;
		obj.shadowOffsetY = this.shadowOffsetY;
*/
		return dest;
	};

	this.init = function (opts) {
		supr(this, 'init', arguments);

		this._stack = [];
		this._stackPos = 0;

		opts = merge(opts, {
			width: 480,
			height: 320,
			offscreen: true
		});

		this.unloadListener = opts.unloadListener;

		if (_createdOnscreenCanvas) {
			opts.offscreen = true;
		}

		this.canvas = opts.canvas || {
			width: opts.width,
			height: opts.height
		};

		this._isOffscreen = opts.offscreen;
		if (!this._isOffscreen) {
			_createdOnscreenCanvas = true;
		}

		this.resize(this.canvas.width, this.canvas.height);

		for (var i = 0; i < 64; i++) {
			this._stack[i] = this.updateState(this, {});
		}
	};

	this.destroy = function () {
		if (this.canvas._src) {
			NATIVE.gl.forgetCanvas(this.canvas._src);

			if (this._isOffscreen) {
				this._ctx = null;
				NATIVE.gl.deleteTexture(this.canvas._src);
			}
		}
	}

	this.resize = function (width, height) {
		this.destroy();

		// set the internal private properties (the public ones have setters that 
		// would call this method again)
		this.canvas._width = width;
		this.canvas._height = height;

		if (this._isOffscreen) {
			var textureData = NATIVE.gl.makeCanvas(width, height, this.unloadListener);
			this.canvas.__gl_name = textureData.__gl_name;
			this.canvas._src = textureData._src;
		} else {
			this.canvas.__gl_name = -1;
			this.canvas._src = 'onscreen';
		}

		this._ctx = new NATIVE.gl.Context2D(this.canvas, this.canvas._src, this.canvas.__gl_name);
	}

	this.getNativeCtx = function () { return this._ctx; }

	this.getElement = function () {
		return this.canvas;
	};

	this.font = '10px ' + device.defaultFontFamily;

	this.textAlign = 'start';
	this.textBaseline = 'alphabetic';
	this.fillStyle = 'rgb(255,255,255)';
	this.strokeStyle = 'rgb(0,0,0)';

	this.show = function () {
		// TODO: NATIVE.gl.show();
	};

	this.hide = function () {
		// TODO: NATIVE.gl.hide();
	};

	this.clear = function () {
		this._ctx.clear();
	};

	this.swap = function (operations) {
		NATIVE.gl.flushImages();
	};

	this.loadIdentity = function () {
		this._ctx.loadIdentity();
	};

	this.save = function () {
		if (this._stack.length <= this._stackPos) {
			logger.log('expanding stack');
			this._stack.push({});
		}
		this.updateState(this, this._stack[this._stackPos++]);
		this._ctx.save();
	};

	this.restore = function () {
		this._ctx.restore();
		this.updateState(this._stack[this._stackPos--], this);
	};

	this.clipRect = function (x, y, w, h) {
		this._ctx.enableScissor(x, y, w, h);
	};

	this.drawImage = function (img, x1, y1, w1, h1, x2, y2, w2, h2) {
		if (!img || !img.complete) { return; }
		var n = arguments.length;
		if (n == 3) {
			this._ctx.drawImage(img.__gl_name, img._src, 0, 0, img.width, img.height, x1, y1, img.width, img.height);
		} else if (n == 5) {
			this._ctx.drawImage(img.__gl_name, img._src, 0, 0, img.width, img.height, x1, y1, w1, h1);
		} else {
			this._ctx.drawImage(img.__gl_name, img._src, x1, y1, w1, h1, x2, y2, w2, h2);
		}
	};

	this.translate = function (x, y) { this._ctx.translate(x, y); }
	this.rotate = function (r) { this._ctx.rotate(r); }
	this.scale = function (x, y) { this._ctx.scale(x, y); }

	this.setFilters = function (filters) {
		for (var name in filters) {
			var filter = filters[name];
			this._ctx.addFilter(name, filter.get());
		}
	}

	this.clearFilters = function () {
		this._ctx.clearFilters();
	}

	util.setProperty(this, 'globalAlpha', {
		get: function () {
			return this._ctx.getGlobalAlpha();
		},
		set: function (alpha) {
			return this._ctx.setGlobalAlpha(alpha);
		}
	});

	var compositeOps = new Enum({
		'source-atop': 1337,
		'source-in': 1338,
		'source-out': 1339,
		'source-over': 1340,
		'destination-atop': 1341,
		'destination-in': 1342,
		'destination-out': 1343,
		'destination-over': 1344,
		'lighter': 1345,
		'xor': 1346,
		'copy': 1347
	});

	util.setProperty(this, 'globalCompositeOperation', {
		get: function () {
			return compositeOps[this._ctx.getGlobalCompositeOperation()];
		},
		set: function (op) {
			return this._ctx.setGlobalCompositeOperation(compositeOps[op.toLowerCase()]);
		}
	});

	this.clearRect = function (x, y, width, height) {
		this._ctx.clearRect(x, y, width, height); 
	};

	this.fillRect = function (x, y, width, height) {
		if (typeof this.fillStyle == 'object') {
			var img = this.fillStyle.img,
				w = img.width, h = img.height,
				wMax, hMax, xx, yy;

			switch (this.fillStyle.repeatPattern) {
				case 'repeat':
					for (xx = 0; xx < width; xx += w) {
						wMax = Math.min(w, width - xx);
						for (yy = y; yy < height; yy += h) {
							hMax = Math.min(h, height - yy);
							this._ctx.drawImage(img.__gl_name, img._src, 0, 0, wMax, hMax, x + xx, y + yy, wMax, hMax);
						}
					}
					break;
				case 'repeat-x':
					for (xx = 0; xx < width; xx += w) {
						wMax = Math.min(w, width - xx);
						this._ctx.drawImage(img.__gl_name, img._src, 0, 0, wMax, hMax, x + xx, y, wMax, hMax);
					}
					break;
				case 'repeat-y':
					for (yy = 0; yy < height; yy += h) {
						hMax = Math.min(h, height - yy);
						this._ctx.drawImage(img.__gl_name, img._src, 0, 0, wMax, hMax, x, y + yy, wMax, hMax);
					}
					break;
				case 'no-repeat':
				default:
					wMax = Math.min(w, width);
					hMax = Math.min(h, height);
					this._ctx.drawImage(img.__gl_name, img._src, 0, 0, wMax, hMax, x, y, wMax, hMax);
					break;
			}
		} else {
			this._ctx.fillRect(x, y, width, height, this.fillStyle);
		}
	};

	this.strokeRect = function (x, y, width, height) {
		this._ctx.strokeRect(x, y, width, height, this.strokeStyle, this.lineWidth || 1);
	};

	this.createPattern = function (img, repeatPattern) {
		return {
			img: img,
			repeatPattern: repeatPattern
		};
	};

	this._checkPath = function () {
		if (!this._path) {
			this._path = [];
		}
		if (this._pathIndex === undefined) {
			this._pathIndex = 0;
		}
		return (this._pathIndex > 0);
	};

	this.beginPath = function () {
		this._pathIndex = 0;
	};

	this.moveTo = this.lineTo = function (x, y) {
		this._checkPath();
		this._path[this._pathIndex] = {x:x, y:y};
		this._pathIndex++;
	};

	this.pointSprite = null;
	this.pointSpriteStep = 2;
	this.drawPointSprites = function (x1, y1, x2, y2) {
		this._ctx.drawPointSprites(this.pointSprite.src, this.lineWidth || 5, this.pointSpriteStep || 2, this.strokeStyle, x1, y1, x2, y2);
	}
	
	this.closePath = function () {};

	this.fill = function () {
		if (this._checkPath()) {
			this._ctx.fill(this._path, this._pathIndex, this.fillStyle);
		}
	};

	this.stroke = function () {
		if (this._checkPath()) {
			this._ctx.stroke(this._path, this._pathIndex, this.strokeStyle);
		}
	};

    this.fillText = FontRenderer.wrapFillText(function (str, x, y, maxWidth) {
        var font = Font.parse(this.font);
        var fontName = font.getName();

        this._ctx.fillText(
            str + '',
            x,
            y,
            maxWidth || 0,
            this.fillStyle,
            font.getSize(),
            /*font.getWeight() + ' ' + */fontName,
            this.textAlign,
            this.textBaseline);
    });

    this.fill = function () {}
    this.stroke = function () {}

    this.strokeText = FontRenderer.wrapStrokeText(function (str, x, y, maxWidth) {
        var font = Font.parse(this.font);
        var fontName = font.getName();

        this._ctx.strokeText(
            str + '',
            x,
            y,
            maxWidth || 0,
            this.strokeStyle,
            font.getSize(),
            fontName,
            this.textAlign,
            this.textBaseline,
            this.lineWidth);
    });

    this.measureText = FontRenderer.wrapMeasureText(function (str) {
        var font = Font.parse(this.font);
        var fontName = font.getName();

        return this._ctx.measureText(str + '', font.getSize(), font.getWeight() + ' ' + fontName);
    });
});
