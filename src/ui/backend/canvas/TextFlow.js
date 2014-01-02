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

		this._words = [];

		this._maxWordWidth = 0;
		this._maxWidth = 0;
		this._maxHeight = 0;

		this._heightFound = 0;

		this._offsetRect = {x: 0, y: 0, width: 0, height: 0};
	};

	this.measureText = function (ctx, text) {
		var opts = this._opts;

		var emoticonData = (text[0] == '(') && opts.emoticonData && opts.emoticonData.data[text];
		if (emoticonData) {
			return opts.size;
		} else {
			return ctx.measureText(text).width;
		}
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
		var splitWords = [];
		for (i in words) {
			word = words[i];
			var eStart = -1;
			var lastSplit = 0;
			for (var index = 0; index < word.length; index++) {
				var c = word[index];
				if (c == '(') {
					eStart = index;
				} else if (c == ')') {
					if (eStart > -1) {
						(eStart - lastSplit > 0) && splitWords.push(word.substring(lastSplit, eStart));
						splitWords.push(word.substring(eStart, index + 1));
						lastSplit = index + 1;
						eStart = -1;
					}
				}
			}
			if (lastSplit < word.length) {
				splitWords.push(word.substring(lastSplit));
			}
		}
		words = splitWords;
		var currentWord = 0;
		var wordCount = words.length;

		this._line = [];
		this._lineWidth = 0;
		this._maxWordWidth = 0;

		var availableWidth = this.getAvailableWidth();
		if ((opts.hardWrap || exports.hardWrap) && words.length && this.measureText(ctx, text) > availableWidth) {
			words = [];

			var s = "";
			var i = 0;

			while (i < text.length) {
				var c = text[i++];
				if (ctx.measureText(s + c).width >= availableWidth) {
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
			word = {word: words[currentWord], width: this.measureText(ctx, words[currentWord]), line: 1};
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
			word.width = this.measureText(ctx, word.word);
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
			// Note: this algorithm isn't 100% accurate because we are going
			// to use the cumulative width of the line (sum up widths of all
			// measured words plus space widths), which on some platforms will
			// actually be slightly longer than the actual line length.  Usually
			// we're only off by a few pixels, so it doesn't matter.  However,
			// if we remeasured each line after computing the full line length,
			// we'd end up with a shorter line than we expected, and if we then
			// resize our view to fit the width and try to wrap text again, we'd
			// find that the width of the line is now longer than the width of
			// the view, resulting in the line wrapping shorter than the previous
			// time (unnecessarily).  Additionally, this extra measure is
			// expensive, so we'll just use our rough approximation.
			while (currentWord < wordCount) {
				word = this._line[currentWord++];
				// currentWidth = ctx.measureText(s).width;
				if (word.word === "\n") {
					//lines.push([{word: s, width: currentWidth, line: lines.length}]);
					//s = "";
					lines.push(line);
					currentWidth = 0;
				} else {
					var isLineEmpty = !line.length;
					//var isLineEmpty = !s.length;
					var hasSpace = !isLineEmpty && !this._opts.wrapCharacter;
					var offset = hasSpace ? spaceWidth : 0;
					if (currentWidth + word.width + offset > width) {
						var wordWidth = word.width;

						// if word is longer than the entire line width
						if (wordWidth > width) {
							var current = word.word;

							// split word into lines
							var wordPiece = "";
							for (var i = 0, n = current.length; i < n; ++i) {
								if ((isLineEmpty && !wordPiece) || this.measureText(ctx, wordPiece + current[i]) + offset + currentWidth <= width) {
									wordPiece += current[i];
								} else {
									/*
									var line = s + (hasSpace ? " " : "") + wordPiece;
									currentWidth = ctx.measureText(line).width;
									lines.push([{word: line, width: currentWidth, line: lines.length}]);
									*/
									currentWidth = this.measureText(ctx, wordPiece);
									line.push({word: wordPiece, width: currentWidth, line: lines.length});
									lines.push(line);
									line = [];
									currentWidth = 0;
									offset = 0;
									//s = "";
									isLineEmpty = true;
									hasSpace = false;
									wordPiece = current[i];
								}
							}

							if (wordPiece) {
								/*
								var line = s + (hasSpace ? " " : "") + wordPiece;
								currentWidth = ctx.measureText(line).width;
								lines.push([{word: line, width: currentWidth, line: lines.length}]);
								*/
								currentWidth = this.measureText(ctx, wordPiece);
								line.push({word: wordPiece, width: currentWidth, line: lines.length});
								//lines.push(line);

							}
						} else {
							//(!isLineEmpty) && lines.push([{word: s, width: currentWidth, line: lines.length}]);
							(!isLineEmpty) && lines.push(line);
							//s = word.word;
							line = [word];
							currentWidth = word.width;
						}
					} else {
						line.push(word);
						//s += (hasSpace ? " " : "") + word.word;
						currentWidth += word.width + offset;
					}
				}
			}

			//if (s !== "") {
			if (line.length > 0) {
				//lines.push([{word: s, width: currentWidth, line: lines.length}]);
				lines.push(line);
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

		this._words = [];

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
				this._words.push(word);

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

		if (width > this.getAvailableWidth()) {
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
		if ((this._lines.length * lineSize > this.getAvailableHeight())) {
			this._checkHeight(ctx, loSize, pivot, cb);
		} else {
			this._heightFound = opts.size;
			this._checkHeight(ctx, pivot, hiSize, cb);
		}
	};

	this._horizontalAlign = function (ctx) {
		var words = this._words;
		if (words.length) {
			var spaceWidth = this._opts.wrapCharacter ? 0 : ctx.measureText(" ").width;
			var lastLineSpaceWidth = spaceWidth;
			var lastLine = words[words.length - 1].line;
			var paddingLeft = this.getPaddingLeft();
			var div = {left: -1, center: 2, right: 1, justify: 3}[this._opts.horizontalAlign] || -1;
			var availableWidth = this.getAvailableWidth();

			if (div === 3) {
				spaceWidth = 0;
			}

			var endWordIndex = 0;
			var wordCount = words.length;
			// for each line
			while (endWordIndex < wordCount) {

				// compute length of line
				var wordIndex = endWordIndex;
				var line = words[endWordIndex].line;
				var lineWidth = 0;
				while ((endWordIndex < wordCount) && (line === words[endWordIndex].line)) {
					lineWidth += words[endWordIndex].width + spaceWidth;
					endWordIndex++;
				}

				// align words in line
				if (div === -1) { // left
					while (wordIndex < endWordIndex) {
						words[wordIndex++].x += paddingLeft;
					}
				} else if (div === 3) { // justify
					var wordSpacing = (line < lastLine ? (availableWidth - lineWidth) / (endWordIndex - wordIndex - 1) : lastLineSpaceWidth);
					var x = paddingLeft;
					while (wordIndex < endWordIndex) {
						words[wordIndex].x = x;
						x += words[wordIndex].width + wordSpacing;
						wordIndex++;
					}
				} else { // center|right
					var offset = (availableWidth - lineWidth + spaceWidth) / div + paddingLeft;
					while (wordIndex < endWordIndex) {
						words[wordIndex++].x += offset;
					}
				}
			}
		}
	};

	this._verticalAlign = function () {
		var lineCount = this._lines.length;
		var verticalAlign = this._opts.verticalAlign;
		var words = this._words;
		var availableHeight = this.getAvailableHeight();
		var i = words.length;
		if (i) {
			var offset;
			if (verticalAlign == 'top') {
				offset = this.getPaddingTop();
			} else {
				var div = verticalAlign == 'middle' ? 2 : 1;
				var lineSize = this._getLineSize(lineCount);
				offset = (availableHeight - lineCount * lineSize) / div + this.getPaddingTop();
			}

			while (i) {
				words[--i].y += offset;
			}

			this._offsetRect.y += offset;
		}
	};

	this.reflow = function (ctx, mode) {
		var opts = this._opts;
		var availableWidth = this.getAvailableWidth();
		var availableHeight = this.getAvailableHeight();

		this._lineSplit(ctx);

		switch (mode) {
			case textFlowMode.NONE:
				this._lines = [this._line];
				this._wordFlow(ctx);
				break;

			case textFlowMode.WRAP:
				this._wrap(ctx, availableWidth);
				this._wordFlow(ctx);
				break;

			case textFlowMode.AUTOSIZE:
			case textFlowMode.AUTOFONTSIZE_AUTOSIZE:
				this._lines = [this._line];
				this._wordFlow(ctx);

				if (this._opts.fitWidth || availableWidth < this._maxWidth) {
					this.publish("ChangeWidth", this._maxWidth + this.getHorizontalPadding());
				}

				if (this._opts.fitHeight || availableHeight < this._maxHeight) {
					this.publish("ChangeHeight", this._maxHeight + this.getVerticalPadding());
				}
				break;

			case textFlowMode.AUTOSIZE_WRAP:
				this._wrap(ctx, availableWidth);
				this._wordFlow(ctx);

				if (this._opts.fitWidth || availableWidth < this._maxWidth) {
					this.publish("ChangeWidth", this._maxWidth + this.getHorizontalPadding());
				}

				if (this._opts.fitHeight  || availableHeight < this._maxHeight) {
					this.publish("ChangeHeight", this._maxHeight + this.getVerticalPadding());
				}

				break;

			case textFlowMode.AUTOFONTSIZE:
				this._checkWidth(ctx, this._lineWidth) && this._lineSplit(ctx);
				this._lines = [this._line];
				// Don't use the lineHeight here because it's a single line
				if (opts.allowVerticalSizing && opts.size > availableHeight) {
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
				this._wrap(ctx, availableWidth);
				this._wordFlow(ctx);

				var lineCount = this._lines.length;
				var lineSize = this._getLineSize(lineCount);
				if (opts.allowVerticalSizing && lineCount * lineSize > availableHeight) {
					var cb = bind(
						this,
						function () {
							this._measureWords(ctx);
							this._wrap(ctx, availableWidth);
							this._wordFlow(ctx);
						}
					);

					this._checkHeight(ctx, 1, opts.size, cb);
					this.publish("ChangeSize", this._heightFound, ctx);
					cb();
				}

				break;

			case textFlowMode.AUTOFONTSIZE_WRAP_AUTOSIZE:
				this._wrap(ctx, availableWidth);
				this._wordFlow(ctx);

				(availableHeight < this._maxHeight) && this.publish("ChangeHeight", this._maxHeight + this.getVerticalPadding());
				break;
		}

		var words = this._words;
		var lastWord = words[words.length - 1];

		if (words.length) {
			var strokeWidth = this._target.getStrokeWidth();
			var lineSize = Math.ceil(opts.size * opts.lineHeight + strokeWidth);
			this._offsetRect.x = this.getPaddingLeft();
			this._offsetRect.y = this.getPaddingTop();
			this._offsetRect.width = availableWidth;
			this._offsetRect.height = lastWord.line * lineSize;

			this._horizontalAlign(ctx);
			this._verticalAlign();

			if (lastWord.line === 1) {
				this._offsetRect.x = words[0].x;
				this._offsetRect.width = lastWord.x + lastWord.width - words[0].x;
			}

			this._offsetRect.width += strokeWidth;
		}
	};

	this.setOpts = function (opts) {
		this._opts = opts;
	};

	this.getWords = function () {
		return this._words;
	};

	this.getHorizontalPadding = function () {
		var padding = this._target.style.padding;

		return padding.left + padding.right;
	};

	this.getPaddingLeft = function () {
		return this._target.style.padding.left;
	};

	this.getAvailableWidth = function () {
		return this._target.style.width - this.getHorizontalPadding();
	};

	this.getVerticalPadding = function () {
		var padding = this._target.style.padding;

		return padding.top + padding.bottom;
	};

	this.getPaddingTop = function () {
		return this._target.style.padding.top;
	};

	this.getAvailableHeight = function () {
		return this._target.style.height - this.getVerticalPadding();
	};

	this.getOffsetRect = function () {
		return this._offsetRect;
	};
});
