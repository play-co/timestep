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
import { logger } from 'base';

import View from 'ui/View';
import Color from 'ui/Color';
import ImageView from 'ui/ImageView';
import Image from 'ui/resource/Image';
import filter from 'ui/filter';

export default class ScoreView extends View {

  constructor (opts) {
    opts.blockEvents = true;
    super(opts);

    // characters that should be rendered
    this._text = '';
    this._activeCharacters = [];
    this._ignoreCharacters = [];
    this._imageViews = [];

    var filterColor = opts.filterColor;
    this._filterColor = filterColor ? new Color(filterColor) : null;

    // container view for characters
    this._container = new View({
      superview: this,
      width: this.style.width,
      height: this.style.height,
      canHandleEvents: false
    });

    // text options
    this._horizontalAlign = opts.horizontalAlign || opts.textAlign ||
      'center';
    this._verticalAlign = opts.verticalAlign || 'middle';
    this._srcHeight = opts.srcHeight || this.style.height;
    this._spacing = opts.spacing || 0;
    // both characterData and text are required before rendering text images
    opts.characterData && this.setCharacterData(opts.characterData);
    opts.text && this.setText(opts.text);
  }

  setCharacterData (data) {
    this._characterData = data;
    var srcHeight = 0;
    for (var i in data) {
      var d = data[i];
      d.img = new Image({ url: d.image });
      var map = d.img.getMap();
      d.width = d.width || (map.width + map.marginLeft + map.marginRight) /
        map.scale;
      var h = (map.height + map.marginTop + map.marginBottom) / map.scale;
      if (srcHeight === 0 && h > 0) {
        // accept the first height we find and use it
        srcHeight = h;
      } else if (srcHeight !== h) {
        // all assets passed to ScoreViews should have the same height
        logger.warn(this.getTag() + ': Art Height Mismatch!', d.image);
      }
    }
    this._srcHeight = srcHeight || this._srcHeight;
    this._text && this.setText(this._text);
  }

  setText (text) {
    text = '' + text;
    var width = this.style.width;
    var height = this.style.height;
    var textLength = text.length;
    var textWidth = 0;
    var offsetX = 0;
    var offsetY = 0;
    var scale = height / this._srcHeight;
    var spacing = this._spacing * scale;
    var oldText = this._text;
    var oldTextLength = oldText.length;

    this._ignoreCharacters.length = 0;
    this._text = text;

    if (!this._characterData) {
      return;
    }

    var i = 0;
    var data;
    while (i < textLength) {
      var character = text[i];
      data = this._characterData[character];
      if (data) {
        this._activeCharacters[i] = data;
        textWidth += data.width;
        if (i < oldTextLength && oldText[i] === character) {
          this._ignoreCharacters.push(true);
        } else {
          this._ignoreCharacters.push(false);
        }
      } else {
        logger.warn('WARNING! ScoreView.setText, no data for: ' + character);
      }
      i++;
    }
    textWidth *= scale;
    textWidth += (textLength - 1) * spacing;

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
    offsetX = Math.max(0, offsetX * this._container.style.scale);

    var scaledHeight = height * this._container.style.scale;
    if (this._verticalAlign === 'middle') {
      offsetY = (height - scaledHeight) / 2;
    } else if (this._verticalAlign === 'bottom') {
      offsetY = height - scaledHeight;
    }
    offsetY = Math.max(0, offsetY / this._container.style.scale);

    while (textLength > this._imageViews.length) {
      var newView = new ImageView({ superview: this._container });
      this._imageViews.push(newView);
    }
    // trim excess characters
    this._activeCharacters.length = textLength;


    for (i = 0; i < textLength; i++) {
      data = this._activeCharacters[i];
      if (data === void 0) {
        continue;
      }

      var view = this._imageViews[i];
      var s = view.style;
      var w = data.width * scale;
      s.x = offsetX;
      s.y = offsetY;
      s.width = w;
      s.height = height;
      // all characters should have the same height
      s.visible = true;
      offsetX += w + spacing;

      // skip setImage if possible
      if (this._ignoreCharacters[i]) {
        continue;
      }

      view.setImage(data.img);
    }

    this._updateFilters(this._filterColor);

    while (i < this._imageViews.length) {
      this._imageViews[i].style.visible = false;
      i++;
    }
  }

  setFilterColor (filterColor) {
    if ((filterColor === null && this._filterColor === null) ||
        (filterColor.r === this._filterColor.r &&
         filterColor.g === this._filterColor.g &&
         filterColor.b === this._filterColor.b &&
         filterColor.a === this._filterColor.a)) {
      // filters are equivalent
      return;
    }

    this._filterColor = filterColor ? new Color(filterColor) : null;
    this._updateFilters(this._filterColor);
  }

  clearFilterColor () {
    this.setFilterColor(null);
  }

  _updateFilters (filterColor) {
    var colorFilter = filterColor ? new filter.MultiplyFilter(filterColor) : null;
    for (var i = 0; i < this._activeCharacters.length; i++) {
      this._updateFilter(this._imageViews[i], colorFilter);
    }
  }

  _updateFilter (view, colorFilter) {
    if (colorFilter) {
      view.setFilter(colorFilter);
    } else {
      view.removeFilter();
    }
  }

}
