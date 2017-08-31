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
 * https://github.com/Gamua/Starling-Framework/blob/a3f9f56/starling/src/starling/text/BitmapFont.as
 * https://github.com/Gamua/Starling-Framework/blob/0c582e5/starling/src/starling/text/BitmapChar.as
 * Copyright Gamua GmbH. All Rights Reserved.
 * Licensed under the Simplified BSD License
 * https://github.com/Gamua/Starling-Framework/blob/master/LICENSE.md
 * ------------------------------------------------------------------------------
 */

import { EventEmitter } from 'events';

import BitmapChar from './BitmapChar';

const CHAR_SPACE = 32;
const CHAR_TAB = 9;
const CHAR_NEWLINE = 10;
const CHAR_CARRIAGE_RETURN = 13;

class BitmapFont extends EventEmitter {

  constructor(texture, data) {
    super();
    this.lineHeight = 14;
    this.size = 14;
    this.baseline = 14;
    this.offsetX = 0;
    this.offsetY = 0;
    this.padding = 0;
    this.name = 'unknown';
    this.chars = {};
    this.loaded = false;

    this._imageCtor = texture.constructor;
    this.texture = texture;

    var font = data.font;
    if (this.texture.doOnLoad) {
      this.texture.doOnLoad(() => this.parsedata(font));
    } else {
      this.parsedata(font);
    }

    this.setMaxListeners(100);
  }

  _forceLoad (cb) {
    if (this.texture) {
      this.texture._forceLoad(cb);
    }
  }

  _addAssetsToList (assetURLs) {
    if (this.texture) {
      this.texture._addAssetsToList(assetURLs);
    }
  }

  parsedata (font) {
    const isDevkitImage = !!this.texture.getMap;
    let scale = 1;
    if (isDevkitImage) {
      const map = this.texture.getMap();
      scale = map.scale;
    }

    var fontInfo = font.info[0].$;
    var fontCommon = font.common[0].$;

    this.name = fontInfo.face;
    this.size = parseFloat(fontInfo.size);
    this.lineHeight = parseFloat(fontCommon.lineHeight);
    this.baseline = parseFloat(fontCommon.base);

    if (this.size <= 0) {
      console.warn('Warning: invalid font size in "' + this.name + '" font.');
      this.size = (this.size === 0 ? 16 : -this.size);
    }

    var characterData = font.chars[0].char;

    for (let i = 0, len = characterData.length; i < len; i++) {
      var charElement = characterData[i].$;
      var id = parseInt(charElement.id);
      var xOffset = parseFloat(charElement.xoffset);
      var yOffset = parseFloat(charElement.yoffset);
      var xAdvance = parseFloat(charElement.xadvance);

      // TODO: Should we really skip whitespace here? The original
      // implementation did not do this

      var textureDataFinal = null;
      var textureData = {
        texture: this.texture,
        url: this.texture.url,
        parentW: isDevkitImage ? this.texture.getWidth() : this.texture.width,
        parentH: isDevkitImage ? this.texture.getHeight() : this.texture.height,
        sourceX: parseFloat(charElement.x),
        sourceY: parseFloat(charElement.y),
        sourceW: parseFloat(charElement.width),
        sourceH: parseFloat(charElement.height)
      };

      var isValidSize = textureData.sourceW > 0 && textureData.sourceH > 0;

      if (id !== CHAR_SPACE && id !== CHAR_TAB && id !== CHAR_NEWLINE && id !== CHAR_CARRIAGE_RETURN && isValidSize) {
        textureDataFinal = textureData;

        if (isDevkitImage) {
          textureData.texture = new this.texture.constructor({
            url: this.texture.getOriginalURL(),
            sourceX: textureData.sourceX,
            sourceY: textureData.sourceY,
            sourceW: textureData.sourceW,
            sourceH: textureData.sourceH
          });
        }
      }

      this.addChar(id, new BitmapChar(id, textureDataFinal, xOffset, yOffset, xAdvance));
    }

    var kerningData = font.kernings && font.kernings[0].kerning ? font.kernings[0].kerning : [];

    for (let i = 0, len = kerningData.length; i < len; i++) {
      var kerningElement = kerningData[i].$;
      var first = parseInt(kerningElement.first);
      var second = parseInt(kerningElement.second);
      var amount = parseFloat(kerningElement.amount) / scale;
      var char = this.getChar(second);
      if (char) { char.addKerning(first, amount); }
    }

    this.fillInCases();

    this.loaded = true;
    this.emit(BitmapFont.LOADED);
  }

  getChar (charID) {
    return this.chars[charID];
  }

  addChar (charID, bitmapChar) {
    this.chars[charID] = bitmapChar;
  }

  getCharIDs (out = []) {
    for (var key in this.chars) {
      out[out.length] = Number(key);
    }

    return out;
  }

  /** Checks whether a provided string can be displayed with the font. */
  hasChars (text) {

    if (!text) { return true; }

    var charID;
    var numChars = text.length;

    for (let i = 0; i < numChars; i++) {
      charID = text.charCodeAt(i);

      if (charID !== CHAR_SPACE && charID !== CHAR_TAB && charID !== CHAR_NEWLINE &&
        charID !== CHAR_CARRIAGE_RETURN && !this.getChar(charID)) {
        return false;
      }
    }

    return true;
  }

  /**
    * If a characters exists in upper case but not in lower, or vice versa, fill
    * in one reference with the other. This is useful for bitmap fonts with all
    * lowercase or all uppercase characters.
    */
  fillInCases () {

    // Get string of characters from map of character codes
    var characters = Object.keys(this.chars)
      .map(charCode => String.fromCharCode(charCode))
      .join('');

    var upperCase = characters.toUpperCase();
    var lowerCase = characters.toLowerCase();
    var charLen = characters.length;
    for (let i = 0; i < charLen; i++) {
      var upperCharCode = upperCase.charCodeAt(i);
      var lowerCharCode = lowerCase.charCodeAt(i);
      if (!this.chars[upperCharCode] && this.chars[lowerCharCode]) {
        this.chars[upperCharCode] = this.chars[lowerCharCode];
      } else if (this.chars[upperCharCode] && !this.chars[lowerCharCode]) {
        this.chars[lowerCharCode] = this.chars[upperCharCode];
      }
    }
  }
}


BitmapFont.LOADED = 'loaded';

export default BitmapFont;