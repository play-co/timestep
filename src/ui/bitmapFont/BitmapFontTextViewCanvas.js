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

import _ from 'lodash';

import {
  default as BitmapFontTextViewBacking,
  DEFAULT_TEXT_FORMAT
} from './BitmapFontTextViewBacking';


class BitmapFontTextView {

  constructor(opts) {
    opts = _.merge({}, DEFAULT_TEXT_FORMAT, opts);
    this._opts = opts;

    this.colorFilter = null;

    this._backing = new BitmapFontTextViewBacking(opts);
    this._backing.setListener(this);
  }

  getHeight() {
    return this._opts.height;
  }

  updateOpts(opts) {
    this._opts = opts;

    if (opts.font) {
      opts.font.once('loaded', () => this.invalidate());
    }
    this.invalidate();

    this._backing.updateOpts(opts);
  }

  updateColorFilter() {
  }

  clearCharacterView(charView) {
  }

  updateCharacterView(charView) {
    charView.x += this._backing.batchX;
    charView.y += this._backing.verticalAlignOffsetY;
  }

  makeCharacterView(charData, x, y, scale) {
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

  render(context) {
    context.save();
    context.translate(this._opts.x, this._opts.y);

    for (let i = 0; i < this._backing._activeCharacterCount; i++) {
      const charView = this._backing._activeCharacters[i];
      // console.log('charView', i, charView);
      context.drawImage(
        charView.textureData.texture,
        charView.textureData.sourceX,
        charView.textureData.sourceY,
        charView.textureData.sourceW,
        charView.textureData.sourceH,
        charView.x,
        charView.y,
        charView.textureData.sourceW * charView.scale,
        charView.textureData.sourceH * charView.scale
      );
    }

    context.restore();
  }

  get maxWidth() {
    return this._backing.maxWidth;
  }

  set maxWidth(value) {
    this._backing.maxWidth = value;
  }

  get numLines() {
    return this._backing.numLines;
  }

  get truncateToFit() {
    return this._backing.truncateToFit;
  }

  set truncateToFit(value) {
    this._backing.truncateToFit = value;
  }

  get truncationText() {
    return this._backing.truncationText;
  }

  set truncationText(value) {
    this._backing.truncationText = value;
  }

  get font() {
    return this._backing.font;
  }

  set font(value) {
    this._backing.font = value;
  }

  get size() {
    return this._backing.size;
  }

  set size(value) {
    this._backing.size = value;
  }

  get color() {
    return this._backing.color;
  }

  set color(value) {
    this._backing.color = value;
  }

  get baseline() {
    return this._backing.baseline;
  }

  get text() {
    return this._backing.text;
  }

  set text(value) {
    this._backing.text = value;
  }
}


export default BitmapFontTextView;
