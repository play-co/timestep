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

import BitmapFontTextViewBacking from 'ui/bitmapFont/BitmapFontTextViewBacking';

export default class BitmapFontTextView {

  constructor (opts) {
    this._x = opts.x;
    this._y = opts.y;

    this.colorFilter = null;
    this._backing = new BitmapFontTextViewBacking(merge({ listener: this }, opts));
  }

  getHeight () {
    return this._backing._height;
  }

  updateOpts (opts) {
    this._backing.updateOpts(opts);
  }

  updateColorFilter () {}

  clearCharacterView () {}

  updateCharacterView (charView) {
    charView.x += this._backing.batchX;
    charView.y += this._backing.verticalAlignOffsetY;
  }

  makeCharacterView (charData, x, y, scale) {
    var charView = {
      x: x,
      y: y,
      width: charData.width,
      height: charData.height,
      scale: scale,
      textureData: charData.textureData
    };
    return charView;
  }

  render (context) {
    context.save();
    context.translate(this._x, this._y);

    var characters = this._backing._activeCharacters;
    for (let i = 0; i < characters.length; i++) {
      var charView = characters[i];
      var textureData = charView.textureData;
      context.drawImage(
        textureData.texture,
        textureData.sourceX,
        textureData.sourceY,
        textureData.sourceW,
        textureData.sourceH,
        charView.x,
        charView.y,
        textureData.sourceW * charView.scale,
        textureData.sourceH * charView.scale
      );
    }

    context.restore();
  }

  get maxWidt () {
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
    return this._backing.color;
  }

  set color (value) {
    this._backing.color = value;
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
