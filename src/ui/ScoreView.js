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
 * package ui.ScoreView;
 *
 * This class is designed for high performance text rendering using images.
 * It is ideal for scores or other in-game counters that update often.
 */

import ui.View as View;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;

var REFLOW_WAIT_MAX_COUNT = 2;
exports = Class(View, function(supr) {

	this.init = function(opts) {
		opts.blockEvents = true;
		supr(this, 'init', arguments);

		// characters that should be rendered
		this._activeCharacters = [];
		this._imageViews = [];

		// container view for characters
		this._container = new View({
			superview: this,
			layout: 'box',
			canHandleEvents: false
		});

		// get our image data and set up Images
		opts.characterData && this.setCharacterData(opts.characterData);

		// text options
		this._textAlign = opts.textAlign || 'center';
		this._spacing = opts.spacing || 0;
		this._origScale = opts.scale || 1;
		this._reflowWaitCount = 0;
		this.setText(opts.text);
	};

	this.setCharacterData = function(data) {
		this._srcHeight = undefined;
		this._characterData = data;

		for (var i in data) {
			var d = data[i];
			d.img = new Image({ url: d.image });

			var map = d.img.getMap();
			d.width = d.width || (map.width + map.marginLeft + map.marginRight);
			this._srcHeight = this._srcHeight || (map.height + map.marginTop + map.marginBottom);
		}

		if (this._text) {
			this.setText(this._text);
		}
	};

	this.refresh = function() {
		setTimeout(bind(this, 'setText', this._text), 0);
	};

	this.setText = function(text) {
		this._text = text = (text === undefined) ? '' : (text + '');

		if (!text) {
			return;
		}

		var size = this.getBoundingShape(),
			width = size.width, height = size.height,
			textWidth = 0, offset = 0,
			scale = height / this._srcHeight,
			i = 0, c = 0, data, character;

		if (this._opts.layout && (!width || !height) && this._reflowWaitCount < REFLOW_WAIT_MAX_COUNT) {
			this._reflowWaitCount += 1;
			return setTimeout(bind(this, 'setText', text), 0);
		}
		this._reflowWaitCount = 0;

		while (i < text.length) {
			character = text.charAt(i);
			data = this._characterData[character];
			if (data) {
				this._activeCharacters[c] = data;
				textWidth += (data.width + this._spacing) * scale;
				// special x offsets to fix text kerning only affect text width if it's first or last char
				if (data.offset && (i == 0 || i == text.length - 1)) {
					textWidth += data.offset * scale;
				}
				c++;
			} else {
				logger.log('WARNING! Calling ScoreView.setText with unavailable character: ' + character);
			}
			i++;
		}

		if (width < textWidth) {
			this._container.style.scale = width / textWidth;
		} else {
			this._container.style.scale = this._origScale;
		}

		if (this._textAlign == 'center') {
			offset = (width - textWidth) / 2;
		} else if (this._textAlign == 'right') {
			offset = width - textWidth;
		}
		offset = Math.max(0, offset * this._container.style.scale);

		while (text.length > this._imageViews.length) {
			var newView = new ImageView({
				superview: this._container,
				x: 0,
				y: 0,
				width: 1,
				height: 1,
				canHandleEvents: false,
				inLayout: false
			});
			newView.needsReflow = function() {};
			this._imageViews.push(newView);
		}

		// trim excess characters
		this._activeCharacters.length = c;

		var x = offset, y = 0;
		for (i = 0; i < this._activeCharacters.length; i++) {
			var data = this._activeCharacters[i];
			var view = this._imageViews[i];
			var w = data.width * scale;

			// special x offsets to fix text kerning
			if (data.offset) {
				x += data.offset * scale;
			}

			view.style.x = x;
			view.style.y = y;
			view.style.width = w;
			view.style.height = height; // all characters should have the same height
			view.style.visible = true;
			view.setImage(data.img);

			// remove special offset
			if (data.offset) {
				x -= data.offset * scale;
			}

			x += w + this._spacing * scale;
		}

		while (i < this._imageViews.length) {
			this._imageViews[i].style.visible = false;
			i++;
		}
	};

	this.needsReflow = function() {};
});