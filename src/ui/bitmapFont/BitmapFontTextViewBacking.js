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


const CHARACTER_ID_SPACE = 32;
const CHARACTER_ID_TAB = 9;
const CHARACTER_ID_LINE_FEED = 10;
const CHARACTER_ID_CARRIAGE_RETURN = 13;
const CHARACTER_BUFFER = [];
const CHAR_LOCATION_POOL = [];
const FUZZY_MAX_WIDTH_PADDING = 0.000001;
const HELPER_POINT = { x: 0, y: 0 };


const HELPER_RESULT = {
  isTruncated: false,
  width: 0,
  height: 0
};

export const Align = {
  CENTER: 'center',
  END: 'end',
  JUSTIFY: 'justify',
  LEFT: 'left',
  RIGHT: 'right',
  START: 'start',
  BOTTOM: 'bottom',
  TOP: 'top'
};

export const DEFAULT_TEXT_FORMAT = {
  font: null,
  size: 16,
  autoSize: true,
  color: '#ffffff',
  align: Align.LEFT,
  leading: 0,
  letterSpacing: 0,
  isKerningEnabled: true,
  verticalAlign: Align.TOP
};

export const EVENTS = {
  CLEAR_CHARACTER: 'CLEAR_CHARACTER'
};


export default class BitmapFontTextViewBacking {
  constructor(opts) {
    this._batchX = 0;
    this._verticalAlignOffsetY = 0;
    this._maxWidth = 0;
    this._numLines = 0;
    this._truncateToFit = opts.truncateToFit || false;
    this._truncationText = '...';
    this._lastLayoutWidth = 0;
    this._lastLayoutHeight = 0;
    this._lastLayoutIsTruncated = false;
    this.wordWrap = !!opts.wordWrap;
    this._color = '';

    this._activeCharacters = [];
    this._activeCharacterCount = 0;

    this._listener = null;

    this._boundOnFontLoad = this._onFontLoad.bind(this);
  }

  _onFontLoad() {
    this._clearOnFontLoad();
    this.invalidate();
  }

  _clearOnFontLoad() {
    if (
      this._listener
      && this._listener._opts
      && this._listener._opts.font
    ) {
      this._listener._opts.font.removeListener('loaded', this._boundOnFontLoad);
    }
  }

  setListener(listener) {
    this._listener = listener;
  }

  updateOpts(opts) {
    if (typeof opts.color !== 'undefined') {
      this._color = opts.color;
    }

    if (typeof opts.autoSize !== 'undefined') {
      this._autoSize = opts.autoSize;
    }

    if (typeof opts.size !== 'undefined') {
      this._baseSize = opts.size;
    }

    if (typeof opts.font !== 'undefined') {
      // Clear last font listener

      this._clearOnFontLoad();

      if (opts.font) {
        opts.font.on('loaded', this._boundOnFontLoad);
      }
    }

    if (typeof opts.text !== 'undefined') {
      this.text = opts.text;
    }

    this.invalidate();
   }

  measureText(result) {
    if (!result) {
      result = { x: 0, y: 0 };
    }

    if (!this._listener._opts || !this._text) {
      result.x = 0;
      result.y = 0;
      return result;
    }

    var font = this._listener._opts.font;
    if (!font.loaded) {
      return result;
    }

    var customSize = this._listener._opts.size;
    var customLetterSpacing = this._listener._opts.letterSpacing;
    var isKerningEnabled = this._listener._opts.isKerningEnabled;
    var scale = customSize / font.size;

    if (scale !== scale) { // isNaN
      scale = 1;
    }

    var lineHeight = font.lineHeight * scale + this._listener._opts.leading;
    var maxLineWidth = this._listener._opts.width;

    if (maxLineWidth !== maxLineWidth) { // isNaN
      maxLineWidth = this._explicitMaxWidth;
    }

    var maxX = 0;
    var currentX = 0;
    var currentY = 0;
    var previousCharID = NaN;
    var charCount = this._text.length;
    var startXOfPreviousWord = 0;
    var widthOfWhitespaceAfterWord = 0;
    var wordCountForLine = 0;
    var line = '';
    var word = '';

    for (let i = 0; i < charCount; i++) {
      var charID = this._text.charCodeAt(i);
      if (charID == CHARACTER_ID_LINE_FEED || charID == CHARACTER_ID_CARRIAGE_RETURN) { //new line \n or \r
        currentX = currentX - customLetterSpacing;
        if (currentX < 0) {
          currentX = 0;
        }
        if (maxX < currentX) {
          maxX = currentX;
        }
        previousCharID = NaN;
        currentX = 0;
        currentY += lineHeight;
        startXOfPreviousWord = 0;
        wordCountForLine = 0;
        widthOfWhitespaceAfterWord = 0;
        continue;
      }

      var charData = font.getChar(charID);
      if (!charData) {
        console.warn('Missing character ' + String.fromCharCode(charID) + ' in font ' + font.name + '.');
        continue;
      }

      if (isKerningEnabled && previousCharID === previousCharID) { // !isNaN
        currentX += charData.getKerning(previousCharID) * scale;
      }

      var xAdvance = charData.xAdvance * scale;

      if (this.wordWrap) {
        var currentCharIsWhitespace = charID == CHARACTER_ID_SPACE || charID == CHARACTER_ID_TAB;
        var previousCharIsWhitespace = previousCharID == CHARACTER_ID_SPACE || previousCharID == CHARACTER_ID_TAB;
        if (currentCharIsWhitespace) {
          if (!previousCharIsWhitespace) {
            widthOfWhitespaceAfterWord = 0;
          }
          widthOfWhitespaceAfterWord += xAdvance;
        }
        else if (previousCharIsWhitespace) {
          startXOfPreviousWord = currentX;
          wordCountForLine++;
          line += word;
          word = '';
        }

        if (!currentCharIsWhitespace && wordCountForLine > 0 && (currentX + xAdvance) > maxLineWidth) {
          //we're just reusing this variable to avoid creating a
          //new one. it'll be reset to 0 in a moment.
          widthOfWhitespaceAfterWord = startXOfPreviousWord - widthOfWhitespaceAfterWord;
          if (maxX < widthOfWhitespaceAfterWord) {
            maxX = widthOfWhitespaceAfterWord;
          }
          previousCharID = NaN;
          currentX -= startXOfPreviousWord;
          currentY += lineHeight;
          startXOfPreviousWord = 0;
          widthOfWhitespaceAfterWord = 0;
          wordCountForLine = 0;
          line = '';
        }
      }
      currentX += xAdvance + customLetterSpacing;
      previousCharID = charID;
      word += String.fromCharCode(charID);
    }
    currentX = currentX - customLetterSpacing;
    if (currentX < 0) {
      currentX = 0;
    }

    //if the text ends in extra whitespace, the currentX value will be
    //larger than the max line width. we'll remove that and add extra
    //lines.

    if (this.wordWrap) {
      while (currentX > maxLineWidth) {
        currentX -= maxLineWidth;
        currentY += lineHeight;
        if (maxLineWidth === 0) {
          //we don't want to get stuck in an infinite loop!
          break;
        }
      }
    }

    if (maxX < currentX) {
      maxX = currentX;
    }

    result.x = maxX;
    result.y = currentY + lineHeight - this._listener._opts.leading;

    return result;
  }

  invalidate() {
    this._listener._opts.size = this._baseSize;

    this.validate();
    this.updateAutoSize();
  }

  validate() {
    if (!this._listener._opts ||
        !this._listener._opts.font ||
        !this._listener._opts.font.loaded) {
      return;
    }

    this._listener.updateColorFilter();

    this.draw();
  }

  updateAutoSize () {
    let textWidth = this._lastLayoutWidth;

    if (textWidth && this._autoSize) {
      let viewWidth = this._listener._opts.width;

      if (textWidth > viewWidth) {
        this._listener._opts.size = this._listener._opts.size * (viewWidth / textWidth);

        this.validate();
      }
    }
  }

  draw () {
    var isInvalid = true;

    var sizeInvalid;

    // sometimes, we can determine that the layout will be exactly
    // the same without needing to update. this will result in much
    // better performance.
    var newWidth = this._listener._opts.width;
    if (newWidth !== newWidth) { // isNaN
      newWidth = this._explicitMaxWidth;
    }

    // sometimes, we can determine that the dimensions will be exactly
    // the same without needing to refresh the text lines. this will
    // result in much better performance.
    if (this.wordWrap) {
      // when word wrapped, we need to measure again any time that the
      // width changes.
      sizeInvalid = newWidth !== this._lastLayoutWidth;
    } else {
      //we can skip measuring again more frequently when the text is
      //a single line.

      //if the width is smaller than the last layout width, we need to
      //measure again. when it's larger, the result won't change...
      sizeInvalid = newWidth < this._lastLayoutWidth;

      //...unless the text was previously truncated!
      sizeInvalid = sizeInvalid || (this._lastLayoutIsTruncated && newWidth !== this._lastLayoutWidth);

      //... or the text is aligned
      sizeInvalid = sizeInvalid || this._listener._opts.align !== Align.LEFT;
    }

    if (isInvalid || sizeInvalid) {
      this._clearCharacterViews();
      this._activeCharacterCount = 0;

      if (!this._listener._opts || this._text === null) {
        return;
      }

      this.layoutCharacters(HELPER_RESULT);
      this._lastLayoutWidth = HELPER_RESULT.width;
      this._lastLayoutHeight = HELPER_RESULT.height;
      this._lastLayoutIsTruncated = HELPER_RESULT.isTruncated;
    }

    // this._listener._opts.width = this._lastLayoutWidth;
    // this._listener._opts.height = this._lastLayoutHeight;
  }

  _clearCharacterViews() {
    for (let i = this._activeCharacterCount - 1; i >= 0; i--) {
      var charView = this._activeCharacters[i];
      this._activeCharacters[i] = null;
      this._listener.clearCharacterView(charView);
    }
  }

  layoutCharacters(result = new MeasureTextResult()) {
    this._numLines = 1;
    var font = this._listener._opts.font;
    var customSize = this._listener._opts.size;
    var customLetterSpacing = this._listener._opts.letterSpacing;
    var isKerningEnabled = this._listener._opts.isKerningEnabled;
    var scale = customSize / font.size;

    if (scale !== scale) { // isNaN
      scale = 1;
    }

    var lineHeight = font.lineHeight * scale + this._listener._opts.leading;
    var offsetX = font.offsetX * scale;
    var offsetY = font.offsetY * scale;

    var hasExplicitWidth = this._listener._opts.width === this._listener._opts.width; //!isNaN
    var isAligned = this._listener._opts.align != Align.LEFT;
    var maxLineWidth = hasExplicitWidth ? this._listener._opts.width : this._explicitMaxWidth;

    if (isAligned && maxLineWidth == Number.POSITIVE_INFINITY) {
      //we need to measure the text to get the maximum line width
      //so that we can align the text
      // this.measureText(HELPER_POINT);
      maxLineWidth = this._listener._opts.width;
    }

    var textToDraw = this._text;

    if (this._truncateToFit) {
      var truncatedText = this.getTruncatedText(maxLineWidth);
      result.isTruncated = truncatedText !== textToDraw;
      textToDraw = truncatedText;
    } else {
      result.isTruncated = false;
    }

    CHARACTER_BUFFER.length = 0;

    var maxX = 0;
    var currentX = 0;
    var currentY = 0;
    var previousCharID = NaN;
    var isWordComplete = false;
    var startXOfPreviousWord = 0;
    var widthOfWhitespaceAfterWord = 0;
    var wordLength = 0;
    var wordCountForLine = 0;
    var charCount = textToDraw ? textToDraw.length : 0;

    for (let i = 0; i < charCount; i++) {
      isWordComplete = false;
      var charID = textToDraw.charCodeAt(i);
      if (charID == CHARACTER_ID_LINE_FEED || charID == CHARACTER_ID_CARRIAGE_RETURN) { //new line \n or \r
        currentX = currentX - customLetterSpacing;
        if (currentX < 0) {
          currentX = 0;
        }

        if (this.wordWrap || isAligned) {
          this.alignBuffer(maxLineWidth, currentX, 0);
          this.addBufferToBatch(0);
        }

        if (maxX < currentX) {
          maxX = currentX;
        }
        previousCharID = NaN;
        currentX = 0;
        currentY += lineHeight;
        startXOfPreviousWord = 0;
        widthOfWhitespaceAfterWord = 0;
        wordLength = 0;
        wordCountForLine = 0;
        this._numLines++;
        continue;
      }

      var charData = font.getChar(charID);
      if (!charData) {
        console.warn('Missing character ' + String.fromCharCode(charID) + ' in font ' + font.name + '.');
        continue;
      }

      if (isKerningEnabled && previousCharID === previousCharID) { //!isNaN
        currentX += charData.getKerning(previousCharID) * scale;
      }

      var xAdvance = charData.xAdvance * scale;

      if (this.wordWrap) {
        var currentCharIsWhitespace = charID == CHARACTER_ID_SPACE || charID == CHARACTER_ID_TAB;
        var previousCharIsWhitespace = previousCharID == CHARACTER_ID_SPACE || previousCharID == CHARACTER_ID_TAB;
        if (currentCharIsWhitespace) {
          if (!previousCharIsWhitespace) {
            widthOfWhitespaceAfterWord = 0;
          }
          widthOfWhitespaceAfterWord += xAdvance;
        }
        else if (previousCharIsWhitespace) {
          startXOfPreviousWord = currentX;
          wordLength = 0;
          wordCountForLine++;
          isWordComplete = true;
        }

        // we may need to move to a new line at the same time
        // that our previous word in the buffer can be batched
        // so we need to add the buffer here rather than after
        // the next section
        if (isWordComplete && !isAligned) {
          this.addBufferToBatch(0);
        }

        // floating point errors can cause unnecessary line breaks,
        // so we're going to be a little bit fuzzy on the greater
        // than check. such tiny numbers shouldn't break anything.
        if (!currentCharIsWhitespace && wordCountForLine > 0 && ((currentX + xAdvance) - maxLineWidth) > FUZZY_MAX_WIDTH_PADDING) {
          if (isAligned) {
            this.trimBuffer(wordLength);
            this.alignBuffer(maxLineWidth, startXOfPreviousWord - widthOfWhitespaceAfterWord, wordLength);
            this.addBufferToBatch(wordLength);
          }
          this.moveBufferedCharacters(-startXOfPreviousWord, lineHeight, 0);
          //we're just reusing this variable to avoid creating a
          //new one. it'll be reset to 0 in a moment.
          widthOfWhitespaceAfterWord = startXOfPreviousWord - widthOfWhitespaceAfterWord;
          if (maxX < widthOfWhitespaceAfterWord) {
            maxX = widthOfWhitespaceAfterWord;
          }
          previousCharID = NaN;
          currentX -= startXOfPreviousWord;
          currentY += lineHeight;
          startXOfPreviousWord = 0;
          widthOfWhitespaceAfterWord = 0;
          wordLength = 0;
          isWordComplete = false;
          wordCountForLine = 0;
          this._numLines++;
        }
      }
      if (this.wordWrap || isAligned) {
        var charLocation = CHAR_LOCATION_POOL.length > 0 ? CHAR_LOCATION_POOL.shift() : new CharLocation();
        charLocation.char = charData;
        charLocation.x = currentX + offsetX + charData.xOffset * scale;
        charLocation.y = currentY + offsetY + charData.yOffset * scale;
        charLocation.scale = scale;
        CHARACTER_BUFFER[CHARACTER_BUFFER.length] = charLocation;
        wordLength++;
      } else {
        this.addCharacterToBatch(
          charData,
          currentX + offsetX + charData.xOffset * scale,
          currentY + offsetY + charData.yOffset * scale,
          scale
        );
      }

      currentX += xAdvance + customLetterSpacing;
      previousCharID = charID;
    }

    currentX = currentX - customLetterSpacing;

    if (currentX < 0) {
      currentX = 0;
    }

    if (this.wordWrap || isAligned) {
      this.alignBuffer(maxLineWidth, currentX, 0);
      this.addBufferToBatch(0);
    }

    // if the text ends in extra whitespace, the currentX value will be
    // larger than the max line width. we'll remove that and add extra
    // lines.

    if (this.wordWrap) {
      while (currentX > maxLineWidth) {
        currentX -= maxLineWidth;
        currentY += lineHeight;
        if (maxLineWidth === 0) {
          //we don't want to get stuck in an infinite loop!
          break;
        }
      }
    }

    if (maxX < currentX) {
      maxX = currentX;
    }

    if (isAligned && !hasExplicitWidth) {
      var align = this._listener._opts.align;
      if (align == Align.CENTER) {
        this._batchX = (maxX - maxLineWidth) / 2;
      }
      else if (align == Align.RIGHT) {
        this._batchX = maxX - maxLineWidth;
      }
    } else {
      this._batchX = 0;
    }

    this._verticalAlignOffsetY = this.getVerticalAlignOffsetY();

    this._updateCharacterViews();

    result.width = maxX;
    result.height = currentY + lineHeight - this._listener._opts.leading;
    return result;
  }

  _updateCharacterViews() {
    for (var i = 0; i < this._activeCharacterCount; i++) {
      var charView = this._activeCharacters[i];
      this._listener.updateCharacterView(charView);
    }
  }

  trimBuffer(skipCount) {
    var countToRemove = 0;
    var charCount = CHARACTER_BUFFER.length - skipCount;
    for (var i = charCount - 1; i >= 0; i--) {
      var charLocation = CHARACTER_BUFFER[i];
      var charData = charLocation.char;
      var charID = charData.charID;
      if (charID === CHARACTER_ID_SPACE || charID === CHARACTER_ID_TAB) {
        countToRemove++;
      } else {
        break;
      }
    }
    if (countToRemove > 0) {
      CHARACTER_BUFFER.splice(i + 1, countToRemove);
    }
  }

  alignBuffer(maxLineWidth, currentLineWidth, skipCount) {
    var align = this._listener._opts.align;
    if (align == Align.CENTER) {
      this.moveBufferedCharacters(Math.round((maxLineWidth - currentLineWidth) / 2), 0, skipCount);
    } else if (align == Align.RIGHT) {
      this.moveBufferedCharacters(maxLineWidth - currentLineWidth, 0, skipCount);
    }
  }

  addBufferToBatch(skipCount) {
    var charCount = CHARACTER_BUFFER.length - skipCount;
    var pushIndex = CHAR_LOCATION_POOL.length;
    for (let i = 0; i < charCount; i++) {
      var charLocation = CHARACTER_BUFFER.shift();
      this.addCharacterToBatch(
        charLocation.char,
        charLocation.x,
        charLocation.y,
        charLocation.scale
      );
      charLocation.char = null;
      CHAR_LOCATION_POOL[pushIndex] = charLocation;
      pushIndex++;
    }
  }

  moveBufferedCharacters(xOffset, yOffset, skipCount) {
    var charCount = CHARACTER_BUFFER.length - skipCount;
    for (let i = 0; i < charCount; i++) {
      var charLocation = CHARACTER_BUFFER[i];
      charLocation.x += xOffset;
      charLocation.y += yOffset;
    }
  }

  addCharacterToBatch(charData, x, y, scale) {
    // console.log('addCharacterToBatch', 'charData=', charData, 'x=', x, 'y=', y, 'scale=', scale)
    if (!charData.textureData) { return; }

    var charView = this._listener.makeCharacterView(charData, x, y, scale);
    this._activeCharacters[this._activeCharacterCount] = charView;
    this._activeCharacterCount++;
  }

  getTruncatedText(width) {
    if (!this._text) {
      // this shouldn't be called if _text is null, but just in case...
      return '';
    }

    // if the width is infinity or the string is multiline, don't allow truncation
    if (width == Number.POSITIVE_INFINITY || this.wordWrap || this._text.indexOf(String.fromCharCode(CHARACTER_ID_LINE_FEED)) >= 0 || this._text.indexOf(String.fromCharCode(CHARACTER_ID_CARRIAGE_RETURN)) >= 0) {
      return this._text;
    }

    var font = this._listener._opts.font;
    var customSize = this._listener._opts.size;
    var customLetterSpacing = this._listener._opts.letterSpacing;
    var isKerningEnabled = this._listener._opts.isKerningEnabled;
    var scale = customSize / font.size;
    if (scale !== scale) { // isNaN
      scale = 1;
    }

    var currentX = 0;
    var previousCharID = NaN;
    var charCount = this._text.length;
    var truncationIndex = -1;

    for (let i = 0; i < charCount; i++) {
      var charID = this._text.charCodeAt(i);
      var charData = font.getChar(charID);
      if (!charData) {
        continue;
      }
      var currentKerning = 0;
      if (isKerningEnabled && previousCharID === previousCharID) { //!isNaN
        currentKerning = charData.getKerning(previousCharID) * scale;
      }

      currentX += currentKerning + charData.xAdvance * scale;

      if (currentX > width) {
        //floating point errors can cause unnecessary truncation,
        //so we're going to be a little bit fuzzy on the greater
        //than check. such tiny numbers shouldn't break anything.
        var difference = Math.abs(currentX - width);
        if (difference > FUZZY_MAX_WIDTH_PADDING) {
          truncationIndex = i;
          break;
        }
      }

      currentX += customLetterSpacing;
      previousCharID = charID;
    }

    if (truncationIndex >= 0) {
      //first measure the size of the truncation text
      charCount = this._truncationText.length;
      for (let i = 0; i < charCount; i++) {
        charID = this._truncationText.charCodeAt(i);
        charData = font.getChar(charID);
        if (!charData) {
          continue;
        }
        currentKerning = 0;
        if (isKerningEnabled &&
          previousCharID === previousCharID) //!isNaN
        {
          currentKerning = charData.getKerning(previousCharID) * scale;
        }
        currentX += currentKerning + charData.xAdvance * scale + customLetterSpacing;
        previousCharID = charID;
      }
      currentX -= customLetterSpacing;

      //then work our way backwards until we fit into the width
      for (let i = truncationIndex; i >= 0; i--) {
        charID = this._text.charCodeAt(i);
        previousCharID = i > 0 ? this._text.charCodeAt(i - 1) : NaN;
        charData = font.getChar(charID);
        if (!charData) {
          continue;
        }
        currentKerning = 0;
        if (isKerningEnabled && previousCharID === previousCharID) { // !isNaN
          currentKerning = charData.getKerning(previousCharID) * scale;
        }

        currentX -= (currentKerning + charData.xAdvance * scale + customLetterSpacing);

        if (currentX <= width) {
          return this._text.substr(0, i) + this._truncationText;
        }
      }

      return this._truncationText;
    }

    return this._text;
  }

  getVerticalAlignOffsetY() {
    var font = this._listener._opts.font;
    var customSize = this._listener._opts.size;
    var scale = customSize / font.size;

    if (scale !== scale) { // isNaN
      scale = 1;
    }

    var lineHeight = font.lineHeight * scale + this._listener._opts.leading;
    var textHeight = this._numLines * lineHeight;

    if (textHeight > this._listener.getHeight()) {
      return 0;
    }

    if (this._listener._opts.verticalAlign === Align.BOTTOM) {
      return (this._listener.getHeight() - textHeight);
    } else if (this._listener._opts.verticalAlign === Align.CENTER) {
      return (this._listener.getHeight() - textHeight) / 2;
    }
    return 0;
  }

  get maxWidth() {
    return this._maxWidth;
  }

  set maxWidth(value) {

    if (value < 0) { value = 0; }
    if (this._explicitMaxWidth === value) { return; }

    var needsInvalidate = value > this._explicitMaxWidth && this._lastLayoutIsTruncated;

    if (value !== value) { // isNaN
      throw new Error('maxWidth cannot be NaN');
    }

    var oldValue = this._explicitMaxWidth;
    this._explicitMaxWidth = value;

    if (needsInvalidate || this._listener._opts.width !== this._listener._opts.width && // isNaN
      (this.actualWidth > value || this.actualWidth === oldValue)) {
      //only invalidate if this change might affect the width
      this.invalidate();
    }
  }

  get numLines() {
    return this._numLines;
  }

  get truncateToFit() {
    return this._truncateToFit;
  }

  set truncateToFit(value) {
    if (this._truncateToFit === value) { return; }
    this._truncateToFit = value;
    this.invalidate();
  }

  get truncationText() {
    return this._truncationText;
  }

  set truncationText(value) {
    if (this._truncationText === value) { return; }
    this._truncationText = value;
    this.invalidate();
  }

  get font() {
    return this._listener._opts.font;
  }

  set font(value) {
    if (value === this._listener._opts.font) { return; }
    this._listener._opts.font = value;
    this.invalidate();
  }

  get size() {
    return this._listener._opts.size;
  }

  set size(value) {
    if (value === this._listener._opts.size) { return; }
    this._listener._opts.size = value;
    this._baseSize = value;
    this.invalidate();
  }

  get color() {
    return this._color;
  }

  set color(value) {
    if (value === this._color) { return; }
    this._color = value;
    this._listener._opts.color = value;
    this.invalidate();
  }

  get baseline() {

    if (this._listener._opts === null) {
      return 0;
    }

    var font = this._listener._opts.font;
    var formatSize = this._listener._opts.size;
    var baseline = font.baseline;
    var fontSizeScale = formatSize / font.size;
    if (fontSizeScale !== fontSizeScale) { // isNaN
      fontSizeScale = 1;
    }

    if (baseline !== baseline) { // isNaN
      return font.lineHeight * fontSizeScale;
    }

    return baseline * fontSizeScale;
  }

  set autoSize(value) {
    if (this._autoSize !== value) {
      this._autoSize = value;

      this.invalidate();
    }
  }

  get autoSize() {
    return this._autoSize;
  }

  set text(value) {
    value = '' + value;

    if (this._text !== value) {
      this._text = value;
      this.invalidate();
    }
  }

  get text() {
    return this._text;
  }

  get batchX() {
    return this._batchX;
  }

  get verticalAlignOffsetY() {
    return this._verticalAlignOffsetY;
  }

}

class CharLocation {
  constructor() {
    this.char = '';
    this.scale = 1;
    this.x = 0;
    this.y = 0;
  }
}
