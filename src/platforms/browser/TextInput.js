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

"use import";

/**
 * package timestep.env.browser.TextInput;
 *
 * A textbox for inputting user data.
 */

import lib.PubSub;
from util.browser import $;

/**
 * @extends lib.PubSub
 */
exports = Class(lib.PubSub, function () {
	this.init = function (opts) {
		this._el = $({
			tag: 'input',
			parent: document.body,
			style: {
				position: 'absolute',
				left: '-100px',
				top: '-100px'
			},
			attrs: {
				type: 'text',
				value: opts && opts.value || ''
			}
		});
		this._value = this._el.value;
		this._selectionStart = 0;
		this._selectionEnd = 0;
		
		$.onEvent(this._el, 'keydown', this, 'checkValue');
		$.onEvent(this._el, 'keyup', this, 'checkValue');
		$.onEvent(this._el, 'keypress', this, 'checkValue');
		$.onEvent(this._el, 'focus', this, 'onFocus');
		$.onEvent(this._el, 'blur', this, 'onBlur');
	}
	
	this.onFocus = function () { this.publish('Focus'); }
	this.onBlur = function () { this.publish('Blur'); }
	
	this.checkValue = function (evt) {
		var target = evt.target,
			start = target.selectionStart,
			end = target.selectionEnd;
		
		var value = this._el.value;
		
		if (value != this._value) {
			this.publish('ChangeValue', value);
			this._value = value;
		}
		
		if (start != this._selectionStart) {
			this._selectionStart = start;
			this.publish('ChangeSelectionStart', start);
		}
		
		if (end != this._selectionEnd) {
			this._selectionEnd = end;
			this.publish('ChangeSelectionEnd', end);
		}
	}
	
	this.focus = function () { logger.log('focus'); this._el.focus(); }
	this.blur = function () { this._el.blur(); }
});


// Set desired tab- defaults to four space softtab
var tab = '    ',
	tabLength = 4;

Array.prototype.map.call(document.getElementsByTagName('textarea'), function (el) {
	el.addEventListener('keydown', checkTab, false);
});

function checkTab(evt) {
	var t = evt.target;
	var ss = t.selectionStart;
	var se = t.selectionEnd;
 
	// Tab key - insert tab expansion
	if (evt.keyCode == 9) {
		evt.preventDefault();
		
		if (evt.shiftKey) {
			// Special case of multi line selection
			if (ss != se && t.value.slice(ss,se).indexOf('\n') != -1) {
				// In case selection was not of entire lines (e.g. selection begins in the middle of a line)
				// we ought to tab at the beginning as well as at the start of every following line.
				var i = ss;
				while(i && t.value.charAt(i - 1) != '\n') { --i; }
				var pre = t.value.slice(0, i);
				var post = t.value.slice(se, t.value.length);
				var sel = t.value.slice(i, se).replace(
					new RegExp('(^|\n)' + tab, 'g'),
					function (match) {
						se -= tab.length;
						if (match.charAt(0) == '\n') {
							return '\n';
						} else {
							ss -= tab.length;
							return '';
						}
					});
				t.value = pre.concat(sel).concat(post);

				t.selectionStart = ss;
				t.selectionEnd = se;
			} else {
				// "Normal" case (no selection or selection on one line only)

				var i = ss;
				while(i && t.value.charAt(i - 1) != '\n') { --i; }
				if (t.value.substring(i, i + tab.length) == tab) {
					t.value = t.value.slice(0, i).concat(t.value.slice(i + tab.length, t.value.length));
					if (ss == se) {
						t.selectionStart = t.selectionEnd = ss - (ss == i ? 0 : tab.length);
					} else {
						t.selectionStart = ss - (ss == i ? 0 : tab.length);
						t.selectionEnd = se - tab.length;
					}
				}
			}
		} else {
			// Special case of multi line selection
			if (ss != se && t.value.slice(ss,se).indexOf("\n") != -1) {
				// In case selection was not of entire lines (e.g. selection begins in the middle of a line)
				// we ought to tab at the beginning as well as at the start of every following line.
				var i = ss;
				while(i && t.value.charAt(i - 1) != '\n') { --i; }
				var pre = t.value.slice(0, i);
				var post = t.value.slice(se, t.value.length);
				var sel = t.value.slice(i, se).replace(/\n/g, function () {
					se += tab.length;
					return '\n' + tab;
				});
				t.value = pre.concat(tab).concat(sel).concat(post);

				t.selectionStart = ss + tab.length;
				t.selectionEnd = se + tab.length;
			} else {
				// "Normal" case (no selection or selection on one line only)

				var i = ss;
				while(i && t.value.charAt(i - 1) != '\n') { --i; }

				t.value = t.value.slice(0, i).concat(tab).concat(t.value.slice(i, t.value.length));

				if (ss == se) {
					t.selectionStart = t.selectionEnd = ss + tab.length;
				} else {
					t.selectionStart = ss + tab.length;
					t.selectionEnd = se + tab.length;
				}
			}
		}
	} else if (evt.shiftKey || evt.metaKey || evt.ctrlKey) {
		return;
	} else if (evt.keyCode == 8 && t.value.slice(ss - tabLength, ss) == tab) {
		// Backspace key - delete preceding tab expansion, if exists
		evt.preventDefault();
		
		t.value = t.value.slice(0,ss - tabLength).concat(t.value.slice(ss,t.value.length));
		t.selectionStart = t.selectionEnd = ss - tab.length;
	} else if (evt.keyCode == 46 && t.value.slice(se, se + tabLength) == tab) {
		// Delete key - delete following tab expansion, if exists
		evt.preventDefault();
		
		t.value = t.value.slice(0,ss).concat(t.value.slice(ss + tabLength,t.value.length));
		t.selectionStart = t.selectionEnd = ss;
	} else if (evt.keyCode == 37 && t.value.slice(ss - tabLength, ss) == tab) {
		// Left/right arrow keys - move across the tab in one go
		evt.preventDefault();
		t.selectionStart = t.selectionEnd = ss - tabLength;
	} else if (evt.keyCode == 39 && t.value.slice(ss, ss + tabLength) == tab) {
		evt.preventDefault();
		t.selectionStart = t.selectionEnd = ss + tabLength;
	}
}
