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

from util.browser import $;
import squill.Widget;
import device;

var __keyboardIsOpen = false;

var InputField = Class(squill.Widget, function (supr) {

    this._def = {
        tag: 'input',
        parent: document.body,
        style: {
            position: 'absolute',
            zIndex: '10000',
            bottom: '0px',
            left: '0px',
            right: '0px'
        }
    }

    this.buildWidget = function () {
        this.initKeyEvents();
        this.initFocusEvents();
    }

    this.setValue = function (value) {
        this._el.value = value;
        this._prevValue = value;
    }

    this.setCursor = function (cursorPos) {
        this._el.selectionStart = this._el.selectionEnd = cursorPos;
    }

    this.setPlaceholder = function (placeholder) {
        this._el.placeholder = placeholder;
    }

    this.setMaxLength = function (maxLength) {
        this._el.maxlength = maxLength;
    }

    this.show = function () {
        supr(this, 'show', arguments);

        this._el.focus();
    }

    this.onKeyUp = function (evt) {
        var el = this._el;
        _focused && _focused.onChange(el.value, this._prevValue, el.selectionStart, el.selectionEnd);
        this._prevValue = el.value;
        if (evt.keyCode == 13) {
            _focused && _focused.closeEditField();
        }
    }

    this.getValue = function () { return this._el.value; }

    this.onBlur = function (evt) {
        this.hide();
		if (__keyboardIsOpen) {
			__keyboardIsOpen = false;
			var ev = new Event('keyboardClosed');
			ev.height = device.screen.height;
			window.dispatchEvent(ev);
		}
        _focused = null;
        //_focused && _focused.closeEditField();
    }

})

var _input = new InputField();
_input.hide();

var _focused = null;

exports = Class(function () {

    var defaults = {
        hint: '',
        inputType: 'default', // default | number | phone | password | capital
        maxLength: -1
    }

	this.init = function (opts) {
		this._opts = merge(opts, defaults);

        this._textEditView = opts.textEditView;
        this.onFocusChange = opts.onFocusChange || function() {};
        this.onSubmit = opts.onSubmit || function () {}
	}

    this.onChange = function (value, prevValue, cursorPos, selectionEnd) {
        this._value = value;
        if (this._opts.onChange) {
            this._opts.onChange(value, prevValue, cursorPos);
        }
    }

    this.getValue = function () {
        return this._value;
    }

    this.setValue = function (value) {
        this._value = value;
        this.onChange(value);
    }

    this.requestFocus = function(noSubmit) {
        if (_focused !== this) {
            if (_focused != null) {
                _focused.removeFocus(noSubmit);
			}

            this.onFocusChange(true);
        }

        _focused = this; 
    }

    this.closeEditField = function(noSubmit) {
        console.log("TextEditView editText removeFocus");
        if (_focused != null) {
            _focused.removeFocus(noSubmit);
        }

        _input.hide();
        // NATIVE.inputPrompt.hideSoftKeyboard();

		if (__keyboardIsOpen) {
			__keyboardIsOpen = false;
			var ev = new Event('keyboardClosed');
			ev.height = device.screen.height;
			window.dispatchEvent(ev);
		}
     }

    this.refresh = function(value, hasBack, hasForward, cursorPos) {

        _input.setCursor(cursorPos);
    	_input.setValue(value);
        _input.setPlaceholder(this._opts.hint);
        _input.setMaxLength(this._opts.maxLength);
        _input.show();

		if (!__keyboardIsOpen) {
			__keyboardIsOpen = true;
			var ev = new Event('keyboardOpened');
			ev.height = device.screen.height * .6;
			window.dispatchEvent(ev);
		}

    	/*
    	if (hasBack) {
			_backButton.onSelect = bind(this, function () {
				this._textEditView.focusPrevious());
			});
			_backButton.disabled = false;
		} else {
			_backButton.disabled = true;
		}

    	if (hasForward) {
			_forwardButton.onSelect = bind(this, function () {
				this._textEditView.focusNext());
			});
			_forwardButton.disabled = false;
		} else {
			_forwardButton.disabled = true;
		}

		*/
    }

    this.hasFocus = function() {
        return this == _focused;
    }

    this.removeFocus = function(noSubmit) {
        this.onFocusChange(false);
	    if(!noSubmit) {
		    this.onSubmit(_input.getValue());
	    }
        if (_focused == this) {
            _focused = null;    
        }
    }

    this.setHint = function(hint) {
        this._opts.hint = hint;
    }
});
