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
 * @class ui.resource.Font;
 * Font string parser, a la CSS Font strings. Exports a Font object class.
 * This class is purely informational.
 *
 * @doc http://doc.gameclosure.com/api/ui-text.html#class-ui.resource.font
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/text.md
 */

var _cache = {},
	weights = 'normal|bold|bolder|lighter|[1-9]00',
	styles = 'normal|italic|oblique',
	units = 'px|pt|pc|in|cm|mm|%',
	name = '([\\w\"\'\\- ]+(?:,|$))+',
	fontParser = new RegExp(
		'^ *'
			+ '(?:(' + weights + ') *)?'
			+ '(?:(' + styles + ') *)?'
			+ '([\\d\\.]+)(' + units + ')'
			+ '('+ name + ')',
			'i'
	),
	sizeParser = new RegExp('([\\d\\.]+)(' + units + ')', 'i'),
	TO_PT = {
		'pt': 1,
		'px': 3 / 4,
		'in': 3 / 4 * 96,
		'mm': 3 / 4 * 96 / 25.4,
		'cm': 3 / 4 * 96 / 2.54
	},
	TO_PX = {
		'pt': 4 / 3,
		'px': 1,
		'in': 96,
		'mm': 96 / 25.4,
		'cm': 96 / 2.54
	};

function parseSize(sizeStr, unit) {
	var match = sizeStr.match(sizeParser);
	if (!match) { throw 'invalid font size'; }
	return {
		value: parseFloat(match[1]),
		unit: match[2]
	};
}

function toPx(size) {
	return {
		value: size.value * TO_PX[size.unit],
		unit: 'px'
	};
}

function toPt(size) {
	return {
		value: size.value * TO_PT[size.unit],
		unit: 'pt'
	};
}

function parseFont(fontStr) {
	var match = fontStr.match(fontParser);
	if (!match) { throw 'invalid font string'; }
	
	var res = {};
	res.weight = match[1] || 'normal';
	res.style = match[2] || 'normal';
	res.size = {
		value: parseFloat(match[3]),
		unit: match[4]
	};
	res.names = match[5]
		.split(',')
		.map(function (str) {
			return str.replace(/[\-_]/g, ' ')
				.replace(/\s+/g, ' ')
				.replace(/['"]/g, '')
				.replace(/^\s+|\s+$/g, '')
		});

	res.name = res.names[0];
	return res;
};

var Font = exports = Class(function () {
	
	var _defaultFontFamily = null;
	this.constructor.setDefaultFontFamily = function (fontFamily) {
		_defaultFontFamily = fontFamily;
	}

	var defaults = {
		name: _defaultFontFamily,
		size: 20,
		unit: 'px',
		style: '',
		weight: ''
	};

	this.init = function (opts) {
		if (typeof opts === 'string') {
			_cache[opts] = this;
			this._string = opts;
			opts = parseFont(opts);
		} else {
			opts = merge(opts, defaults);
		}
		
		if (typeof opts.size == 'string') {
			opts.size = parseSize(opts.size);
		}
		
		this._name = opts.name;
		this._style = opts.style;
		this.size = opts.size;
		this.sizePx = toPx(this.size).value;
		this.sizePt = toPt(this.size).value;
		this._weight = opts.weight;

		this._isBold = /bold/i.test(this._weight);
	};
	
	this.getSize = function () { return this.sizePx; }

	this.getName = function () { return this._name; }
	this.getWeight = function () { return this._weight; }
});

exports.parse = function (str) {
	if (str in _cache) {
		return _cache[str];
	} else {
		return new Font(str);
	}
}
