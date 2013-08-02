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

import lib.Enum as Enum;
import lib.PubSub as PubSub;

var textFlowMode = Enum(
	"NONE",
	"WRAP",
	"AUTOSIZE",
	"AUTOSIZE_WRAP",
	"AUTOFONTSIZE",
	"AUTOFONTSIZE_WRAP",
	"AUTOFONTSIZE_AUTOSIZE",
	"AUTOFONTSIZE_WRAP_AUTOSIZE"
);

var TextFlow = exports = Class(PubSub, function (supr) {
	this.init = function (opts) {
		supr(this, "init", arguments);

		this._target = opts.target;
		this._lineWidth = 0;
		this._line = [];
		this._lines = [];

		this._cache = [];
		this._cacheSize = 0;

		this._maxWordWidth = 0;
		this._maxWidth = 0;
		this._maxHeight = 0;

		this._heightFound = -1;

		this._offsetRect = {x: 0, y: 0, width: 0, height: 0};
	};

	// Split the text into a list containing the word and the width of the word...
	this._lineSplit = function (ctx) {
		var opts = this._opts;
		var spaceWidth = opts.wrapCharacter ? 0 : ctx.measureText(" ").width;
		var text = opts.text || "";
		var words = 
				opts.wrapCharacter
					? text.replace(/\t/g, " ").match(/\S[。，]?|[\n]/g) || []
					: (opts.wrap || (opts.horizontalAlign === "justify")) 
						? (text.replace(/\t/g, " ").match(/\S+|[\n]| +(?= )/g) || [])
						: text.split("\n");
		var word;
		var currentWord = 0;
		var wordCount = words.length;

		this._line = [];
		this._lineWidth = 0;
		this._maxWordWidth = 0;

		if ((opts.hardWrap || exports.hardWrap) && (words.length === 1) && (ctx.measureText(text).width > this.getActualWidth())) {
			words = [];

			var actualWidth = this.getActualWidth();
			var s = "";
			var i = 0;

			while (i < text.length) {
				var c = text[i++];
				if (ctx.measureText(s + c).width >= actualWidth) {
					words.push(s);
					s = c;
				} else {
					s += c;
				}
			}
			if (s !== "") {
				words.push(s);
			}
			wordCount = words.length;
		}

		while (currentWord < wordCount) {
			word = {word: words[currentWord], width: ctx.measureText(words[currentWord]).width, line: 1};
			this._line.push(word);
			this._lineWidth += word.width + spaceWidth;
			this._maxWordWidth = Math.max(this._maxWordWidth, word.width);
			currentWord++;
		}
		this._lineWidth -= spaceWidth;
	};

	this._measureWords = function (ctx) {
		var spaceWidth = this._opts.wrapCharacter ? 0 : ctx.measureText(" ").width;
		var currentWord = 0;
		var wordCount = this._line.length;

		this._lineWidth = 0;
		this._maxWordWidth = 0;

		while (currentWord < wordCount) {
			word = this._line[currentWord];
			word.line = 1;
			word.width = ctx.measureText(word.word).width;
			this._lineWidth += word.width + spaceWidth;
			this._maxWordWidth = Math.max(this._maxWordWidth, word.width);
			currentWord++;
		}
		this._lineWidth -= spaceWidth;
	};

	// Split the single line into multiple lines which fit into the available width...
	this._wrap = function (ctx, width) {
		var spaceWidth = this._opts.wrapCharacter ? 0 : ctx.measureText(" ").width;
		var word;
		var currentWidth = 0;
		var lines = [];
		var line = [];
		var s = "";

		this._lines = lines;
		this._maxWidth = 0;

		var currentWord = 0;
		var wordCount = this._line.length;

		if (this._opts.horizontalAlign === "justify") {
			while (currentWord < wordCount) {
				word = this._line[currentWord++];
				currentWidth += word.width + spaceWidth;
				if (word.word === "\n") {
					lines.push(line);
					line = [];
					currentWidth = 0;
				} else if (currentWidth > width) {
					line.length && lines.push(line);
					line = [word];
					currentWidth = word.width + spaceWidth;
				} else {
					line.push(word);
				}
			}

			line.length && lines.push(line);
		} else {
			while (currentWord < wordCount) {
				word = this._line[currentWord++];
				currentWidth = ctx.measureText(s).width;
				if (word.word === "\n") {
					lines.push([{word: s, width: currentWidth, line: lines.length}]);
					s = "";
				} else {
					if (currentWidth + word.width + spaceWidth > width) {
						(s !== "") && lines.push([{word: s, width: currentWidth, line: lines.length}]);
						s = word.word;
					} else {
						s += (s !== "" && !this._opts.wrapCharacter ? " " : "") + word.word;
					}
				}
			}

			if (s !== "") {
				lines.push([{word: s, width: ctx.measureText(s).width, line: lines.length}]);
			}
		}
	};

	this._getLineSize = function (lineCount) {
		var opts = this._opts;
		return ((lineCount <= 1) ? 1 : opts.lineHeight) * opts.size;
	};

	// Calculate the position of each word on the line...
	this._wordFlow = function (ctx) {
		var spaceWidth = this._opts.wrapCharacter ? 0 : ctx.measureText(" ").width;
		var lines = this._lines;

		this._cache = [];
		this._cacheSize = 0;

		this._maxWidth = 0;
		this._maxHeight = 0;

		var currentLine = 0;
		var lineCount = lines.length;
		var lineSize = this._getLineSize(lineCount);
		var y = 0;

		while (currentLine < lineCount) {
			var line = lines[currentLine++];
			var currentWord = 0;
			var wordCount = line.length;
			var x = 0;

			while (currentWord < wordCount) {
				var word = line[currentWord++];

				word.x = x;
				word.y = y;
				word.line = currentLine;
				this._cache[this._cacheSize++] = word;

				x += word.width + spaceWidth;
			}

			y += lineSize;
			x -= spaceWidth;

			this._maxWidth = Math.max(this._maxWidth, x);
			this._maxHeight = Math.max(this._maxHeight, y);
		}
	};

	// Check if the given width fits into the available size, if not the resize the font...
	this._checkWidth = function (ctx, width) {
		if (this._opts.text === "") {
			return false;
		}
		var opts = this._opts;

		if (width > this.getActualWidth()) {
			var size = (opts.size * this._target.style.width / width) | 0;
			(opts.size !== size) && this.publish("ChangeSize", size, ctx);
			return true;
		}
		return false;
	};

	this._checkHeight = function (ctx, loSize, hiSize, cb) {
		if (this._opts.text === "") {
			return;
		}
		if (Math.abs(hiSize - loSize) < 2) {
			return;
		}

		var pivot = Math.max((loSize + hiSize) >> 1, 1);
		this.publish("ChangeSize", pivot, ctx);
		cb();
		if (pivot === 1) {
			return;
		}

		var opts = this._opts;
		var lineSize = this._getLineSize(this._lines.length);
		if ((this._lines.length * lineSize > this.getActualHeight())) {
			this._checkHeight(ctx, loSize, pivot, cb);
		} else {
			this._heightFound = opts.size;
			this._checkHeight(ctx, pivot, hiSize, cb);
		}
	};

	this._horizontalAlign = function (ctx) {
		var paddingLeft = this.getPaddingLeft();
		var spaceWidth = this._opts.wrapCharacter ? 0 : ctx.measureText(" ").width;
		var div = {left: -1, center: 2, right: 1, justify: 3}[this._opts.horizontalAlign];
		var cache = this._cache;
		var actualWidth = this.getActualWidth();
		var width;
		var offset;
		var line;
		var x;

		if (!cache.length) {
			return;
		}
		if (div === 3) {
			spaceWidth = 0;
		}

		var firstWordOnLine;
		var currentWord = 0;
		var wordCount = cache.length;
		while (currentWord < wordCount) {
			firstWordOnLine = currentWord;
			line = cache[currentWord].line;
			width = 0;
			while ((currentWord < wordCount) && (line === cache[currentWord].line)) {
				width += cache[currentWord].width + spaceWidth;
				currentWord++;
			}
			if (div === -1) { // left...
				while (firstWordOnLine < currentWord) {
					cache[firstWordOnLine++].x += paddingLeft;
				}
			} else if (div === 3) { // justify...
				offset = (line < cache[cache.length - 1].line) ? (actualWidth - width) / (currentWord - firstWordOnLine - 1) : spaceWidth;
				x = paddingLeft;
				while (firstWordOnLine < currentWord) {
					cache[firstWordOnLine].x = x;
					x += cache[firstWordOnLine].width + offset;
					firstWordOnLine++;
				}
			} else {
				offset = (actualWidth - width + spaceWidth) / div + paddingLeft;
				while (firstWordOnLine < currentWord) {
					cache[firstWordOnLine++].x += offset;
				}
			}
		}
	};

	this._verticalAlign = function () {
		var lineCount = this._lines.length;
		var div = {top: -1, middle: 2, bottom: 1}[this._opts.verticalAlign];
		var cache = this._cache;
		var actualHeight = this.getActualHeight();
		var offset;
		var i = cache.length;

		if (!cache.length) {
			return;
		}

		if (div === -1) {
			offset = this.getPaddingTop();
		} else {
			var lineSize = this._getLineSize(lineCount);
			offset = (actualHeight - lineCount * lineSize) / div + this.getPaddingTop();
		}
		while (i) {
			cache[--i].y += offset;
		}

		this._offsetRect.y += offset;
	};

	this.reflow = function (ctx, mode) {
		var opts = this._opts;
		var actualWidth = this.getActualWidth();
		var actualHeight = this.getActualHeight();

		this._lineSplit(ctx);

		switch (mode) {
			case textFlowMode.NONE:
				this._lines = [this._line];
				this._wordFlow(ctx);
				break;

			case textFlowMode.WRAP:
				this._wrap(ctx, actualWidth);
				this._wordFlow(ctx);
				break;

			case textFlowMode.AUTOSIZE:
			case textFlowMode.AUTOFONTSIZE_AUTOSIZE:
				this._lines = [this._line];
				this._wordFlow(ctx);

				if (this._opts.fitWidth || actualWidth < this._maxWidth) {
					this.publish("ChangeWidth", this._maxWidth + this.getHorizontalPadding());
				}

				if (this._opts.fitHeight || actualHeight < this._maxHeight) {
					this.publish("ChangeHeight", this._maxHeight + this.getVerticalPadding());
				}
				break;

			case textFlowMode.AUTOSIZE_WRAP:
				this._wrap(ctx, actualWidth);
				this._wordFlow(ctx);

				if (this._opts.fitWidth || actualWidth < this._maxWidth) {
					this.publish("ChangeWidth", this._maxWidth + this.getHorizontalPadding());
				}
				
				if (this._opts.fitHeight  || actualHeight < this._maxHeight) {
					this.publish("ChangeHeight", this._maxHeight + this.getVerticalPadding());
				}

				break;

			case textFlowMode.AUTOFONTSIZE:
				this._checkWidth(ctx, this._lineWidth) && this._lineSplit(ctx);
				this._lines = [this._line];
				// Don't use the lineHeight here because it's a single line
				if (opts.allowVerticalSizing && opts.size > this.getActualHeight()) {
					var cb = bind(
						this,
						function () {
							this._measureWords(ctx);
							this._wordFlow(ctx);
						}
					);

					this._checkHeight(ctx, 1, opts.size, cb);
					this.publish("ChangeSize", this._heightFound, ctx);
					cb();
				} else {
					this._wordFlow(ctx);
				}
				break;

			case textFlowMode.AUTOFONTSIZE_WRAP:
				this._wrap(ctx, actualWidth);
				if (this._checkWidth(ctx, this._maxWordWidth)) {
					this._lineSplit(ctx);
					this._wrap(ctx, actualWidth);
				}
				this._wordFlow(ctx);

				var lineCount = this._lines.length;
				var lineSize = this._getLineSize(lineCount);
				if (opts.allowVerticalSizing && lineCount * lineSize > this.getActualHeight()) {
					var cb = bind(
						this,
						function () {
							this._measureWords(ctx);
							this._wrap(ctx, actualWidth);
							this._wordFlow(ctx);
						}
					);

					this._checkHeight(ctx, 1, opts.size, cb);
					this.publish("ChangeSize", this._heightFound, ctx);
					cb();
				}

				break;

			case textFlowMode.AUTOFONTSIZE_WRAP_AUTOSIZE:
				this._wrap(ctx, actualWidth);
				if (this._checkWidth(ctx, this._maxWordWidth)) {
					this._lineSplit(ctx);
					this._wrap(ctx, actualWidth);
				}
				this._wordFlow(ctx);

				(actualHeight < this._maxHeight) && this.publish("ChangeHeight", this._maxHeight + this.getVerticalPadding());
				break;
		}

		var cache = this._cache;
		var lastCacheItem = cache[cache.length - 1];

		if (!cache.length) {
			return;
		}

		var strokeWidth = this._target.getStrokeWidth();
		var lineSize = Math.ceil(opts.size * opts.lineHeight + strokeWidth);
		this._offsetRect.x = this.getPaddingLeft();
		this._offsetRect.y = this.getPaddingTop();
		this._offsetRect.width = this.getActualWidth();
		this._offsetRect.height = lastCacheItem.line * lineSize;

		this._horizontalAlign(ctx);
		this._verticalAlign();

		if (lastCacheItem.line === 1) {
			this._offsetRect.x = cache[0].x;
			this._offsetRect.width = lastCacheItem.x + lastCacheItem.width - cache[0].x;
		}

		this._offsetRect.width += strokeWidth;
	};

	this.setOpts = function (opts) {
		this._opts = opts;
	};

	this.getCache = function () {
		return this._cache;
	};

	this.getHorizontalPadding = function () {
		var padding = this._target.style.padding;

		return padding.left + padding.right;
	};

	this.getPaddingLeft = function () {
		return this._target.style.padding.left;
	};

	this.getActualWidth = function () {
		return this._target.style.width - this.getHorizontalPadding();
	};

	this.getVerticalPadding = function () {
		var padding = this._target.style.padding;

		return padding.top + padding.bottom;
	};

	this.getPaddingTop = function () {
		return this._target.style.padding.top;
	};

	this.getActualHeight = function () {
		return this._target.style.height - this.getVerticalPadding();
	};

	this.getOffsetRect = function () {
		return this._offsetRect;
	};
});
