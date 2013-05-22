/**
 * @license
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
 * package ui.ScoreView;
 *
 * This class is designed for high performance text rendering using images.
 * It is ideal for scores or other in-game counters that update often.
 */

import ui.View as View;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;

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
		this._loadCount = 0;
		opts.characterData && this.setCharacterData(opts.characterData);

		// text options
		this._textAlign = opts.textAlign || 'center';
		this._spacing = opts.spacing || 0;
		this._srcHeight = opts.srcHeight;
		this._origScale = opts.scale || 1;
		this.setText(opts.text || '');
	};

	this._loadCharacter = function(c) {
		var d = this.characterData[c];
		d.img = new Image({ url: d.image });
		if (!d.width || !this._srcHeight) {
			this._loadCount += 1;
			d.img.doOnLoad(bind(this, function() {
				d.width = d.width || d.img.getWidth();
				this._srcHeight = this._srcHeight || d.img.getHeight();
				this._loadCount -= 1;
				if (!this._loadCount) {
					this.setText(this._text);
				}
			}));
		}
	};

	this.setCharacterData = function(data) {
		this._srcHeight = this._opts.srcHeight;
		this.characterData = data;
		for (var c in data) {
			this._loadCharacter(c);
		}
	};

	this.refresh = function() {
		setTimeout(bind(this, 'setText', this._text), 0);
	};

	this.setText = function(text) {
		this._text = text = text + '';

		if (this._loadCount || !text) {
			return; // we'll call setText again when the characters are loaded
		}

		var textWidth = 0, offset = 0,
			scale = this.style.height / this._srcHeight,
			i = 0, c = 0, data, character;

		while (i < text.length) {
			character = text.charAt(i);
			data = this.characterData[character];
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

		if (this.style.width < textWidth) {
			this._container.style.scale = this.style.width / textWidth;
		} else {
			this._container.style.scale = this._origScale;
		}

		if (this._textAlign == 'center') {
			offset = (this.style.width - textWidth) / 2;
		} else if (this._textAlign == 'right') {
			offset = this.style.width - textWidth;
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
			view.style.height = this.style.height; // all characters should have the same height
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