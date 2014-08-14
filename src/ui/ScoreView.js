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
import ui.filter as filter;

var min = Math.min;
var max = Math.max;

exports = Class(View, function(supr) {

	this.init = function(opts) {
		opts.blockEvents = true;
		supr(this, 'init', arguments);

		// characters that should be rendered
		this._activeCharacters = [];
		this._imageViews = [];
		this._filterColor = opts.filterColor || null;

		// container view for characters
		this._container = new View({
			superview: this,
			width: this.style.width,
			height: this.style.height,
			canHandleEvents: false
		});

		// text options
		this._horizontalAlign = opts.horizontalAlign || opts.textAlign || 'center';
		this._verticalAlign = opts.verticalAlign || 'middle';
		this._srcHeight = opts.srcHeight || this.style.height;
		this._spacing = opts.spacing || 0;
		this._text = opts.text;
		opts.characterData && this.setCharacterData(opts.characterData);
	};

	this.setCharacterData = function(data) {
		this._characterData = data;
		var srcHeight = 0;
		for (var i in data) {
			var d = data[i];
			d.img = new Image({ url: d.image });
			var map = d.img.getMap();
			d.width = d.width || map.width + map.marginLeft + map.marginRight;
			var h = map.height + map.marginTop + map.marginBottom;
			if (srcHeight === 0 && h > 0) {
				// accept the first height we find and use it
				srcHeight = h;
			} else if (srcHeight !== h) {
				// all assets passed to ScoreViews should have the same height
				logger.warn(this.getTag() + ": Art Height Mismatch!", d.image);
			}
		}
		this._srcHeight = srcHeight || this._srcHeight;
		this._text && this.setText(this._text);
	};

	this.setText = function(text) {
		this._text = text = "" + text;

		var width = this.style.width;
		var height = this.style.height;
		var textWidth = 0;
		var offsetX = 0;
		var offsetY = 0;
		var scale = height / this._srcHeight;
		var spacing = this._spacing * scale;

		var i = 0;
		while (i < text.length) {
			var character = text.charAt(i);
			var data = this._characterData[character];
			if (data) {
				this._activeCharacters[i] = data;
				textWidth += data.width * scale + (i ? spacing : 0);
			} else {
				logger.warn('WARNING! ScoreView.setText, no data for: ' + character);
			}
			i++;
		}

		if (width < textWidth) {
			this._container.style.scale = width / textWidth;
		} else {
			this._container.style.scale = 1;
		}

		if (this._horizontalAlign === 'center') {
			offsetX = (width - textWidth) / 2;
		} else if (this._horizontalAlign === 'right') {
			offsetX = width - textWidth;
		}
		offsetX = max(0, offsetX * this._container.style.scale);

		var scaledHeight = height * this._container.style.scale;
		if (this._verticalAlign === 'middle') {
			offsetY = (height - scaledHeight) / 2;
		} else if (this._verticalAlign === 'bottom') {
			offsetY = height - scaledHeight;
		}
		offsetY = max(0, offsetY / this._container.style.scale);

		while (text.length > this._imageViews.length) {
			var newView = new ImageView({ superview: this._container });
			this._imageViews.push(newView);
		}

		// trim excess characters
		this._activeCharacters.length = text.length;

		var fc = this._filterColor;
		var fcHash = this._getColorHash(fc);
		for (var i = 0; i < this._activeCharacters.length; i++) {
			var data = this._activeCharacters[i];
			if (data === undefined) {
				continue;
			}

			var view = this._imageViews[i];
			var s = view.style;
			var w = data.width * scale;
			s.x = offsetX;
			s.y = offsetY;
			s.width = w;
			s.height = height; // all characters should have the same height
			s.visible = true;
			view.setImage(data.img);
			offsetX += w + spacing;

			// update color filters
			this._updateFilter(view, fc, fcHash);
		}

		while (i < this._imageViews.length) {
			this._imageViews[i].style.visible = false;
			i++;
		}
	};

	this.setFilterColor = function(color) {
		this._filterColor = color;
		this._updateFilters();
	};

	this.clearFilterColor = function() {
		this.setFilterColor(null);
	};

	this._updateFilters = function() {
		var fc = this._filterColor;
		var fcHash = this._getColorHash(fc);
		for (var i = 0, len = this._activeCharacters.length; i < len; i++) {
			this._updateFilter(this._imageViews[i], fc, fcHash);
		}
	};

	this._updateFilter = function(view, color, hash) {
		if (color) {
			if (!view.colorFilter) {
				view.colorFilter = new filter.MultiplyFilter(color);
				view.setFilter(view.colorFilter);
				view.lastColorHash = hash;
			} else if (view.lastColorHash !== hash) {
				view.colorFilter.update(color);
				view.lastColorHash = hash;
			}
		} else if (view.colorFilter) {
			view.colorFilter = null;
			view.removeFilter();
			view.lastColorHash = 0;
		}
	};

	this._getColorHash = function(color) {
		var hash = 0;
		if (color) {
			hash = 1000 * color.r + color.g + 0.001 * color.b + 0.0001 * color.a;
		}
		return hash;
	};

});
