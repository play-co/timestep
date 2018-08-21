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
 *
 * ------------------------------------------------------------------------------
 * Game Closure Devkit port based on
 * https://github.com/BowlerHatLLC/feathers/blob/1b2fdd9/source/feathers/controls/text/BitmapFontTextRenderer.as
 * Copyright 2012-2016 Bowler Hat LLC. All rights reserved.
 * Licensed under the Simplified BSD License
 * https://github.com/BowlerHatLLC/feathers/blob/master/LICENSE.md
 * ------------------------------------------------------------------------------
 */

import { merge } from 'base';

import View from 'ui/View';
import filter from '../filter';

import BitmapFontTextViewBacking from 'ui/bitmapFont/BitmapFontTextViewBacking';

const DEFAULT_COLOR = '#ffffff';

class Character {
  constructor (image, x, y, width, height) {
    this.image = image;
    this.originalX = x;
    this.originalY = y;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

export default class BitmapFontTextView extends View {
  constructor (opts) {
    super(opts);

    this.colorFilter = new filter.MultiplyFilter(this._color);
    this._characters = [];
    this._backing = new BitmapFontTextViewBacking(merge({ listener: this }, opts));
  }

  _addAssetsToList (assetURLs) {
    var font = this._backing.font;
    if (font) {
      font._addAssetsToList(assetURLs);
    }
  }

  _forceLoad () {
    var font = this._backing.font;
    if (font) {
      if (!font.loaded) {
        font._forceLoad(() => {
          this._backing.updateAutoSize();
        });
      }
      this._loaded = true;
    }
  }

  getHeight () {
    return this.style.height;
  }

  updateOpts (opts) {
    super.updateOpts(opts);
    if (this._backing) {
      this._backing.updateOpts(opts);
    }

    this._color = opts.color || this._color || DEFAULT_COLOR;
    this._hasColor = this._color !== DEFAULT_COLOR;
  }

  _clearCharacter () {
    this._characters = [];
  }

  _updateCharacters (batchX, verticalAlignOffsetY) {
    for (var c = 0; c < this._characters.length; c += 1) {
      var character = this._characters[c];
      character.x = character.originalX + batchX;
      character.y = character.originalY + verticalAlignOffsetY;
    }
  }

  makeCharacter (charData, x, y, scale) {
    var image = charData.textureData.texture;
    var width = charData.textureData.sourceW * scale;
    var height = charData.textureData.sourceH * scale;
    this._characters.push(new Character(image, x, y, width, height));
  }

  render (context) {
    if (this._backing.font === null || this._backing.font.loaded === false) {
      return;
    }

    if (this._hasColor) {
      context.setFilter(this.colorFilter);
    }

    for (var c = 0; c < this._characters.length; c += 1) {
      var character = this._characters[c];
      character.image.renderShort(context,
        character.x, character.y, character.width, character.height);
    }

    if (this._hasColor) {
      context.clearFilter();
    }
  }

  updateColorFilter () {
    if (this._hasColor) {
      this.colorFilter.update(this._color);
    }
  }

  invalidate () {
    this._backing.invalidate();
  }

  get maxWidth () {
    return this._backing.maxWidth;
  }

  set maxWidth (value) {
    this._backing.maxWidth = value;
  }

  get numLines () {
    return this._backing.numLines;
  }

  get truncateToFit () {
    return this._backing.truncateToFit;
  }

  set truncateToFit (value) {
    this._backing.truncateToFit = value;
  }

  get truncationText () {
    return this._backing.truncationText;
  }

  set truncationText (value) {
    this._backing.truncationText = value;
  }

  get font () {
    return this._backing.font;
  }

  set font (value) {
    this._backing.font = value;
  }

  get size () {
    return this._backing.size;
  }

  set size (value) {
    this._backing.size = value;
  }

  get color () {
    return this._color;
  }

  set color (value) {
    this._color = value;
    this._hasColor = this._color !== DEFAULT_COLOR;
    this.colorFilter.update(this._color);
  }

  get baseline () {
    return this._backing.baseline;
  }

  get text () {
    return this._backing.text;
  }

  set text (value) {
    this._backing.text = value;
  }
}
