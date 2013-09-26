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

import device;

var focused;

NATIVE.input.subscribe('KeyUp', function(evt) {
    if (focused != null) {
        focused._value = evt.text;
        focused.onChange(evt.text, evt.prevText, evt.cursorPos);
    }
});

NATIVE.input.subscribe('FocusNext', function(evt) {
    if (evt.next && focused && focused._textEditView && focused._textEditView._forwardTextEditView) {
        focused._textEditView._forwardTextEditView.requestFocus();
    } else if (!evt.next && focused && focused._textEditView && focused._textEditView._backTextEditView) {
        focused._textEditView._backTextEditView.requestFocus();
    }
});

NATIVE.input.subscribe('Submit', function(evt) {
    focused && focused.submit();
});


NATIVE.events.registerHandler('editText.onFinishEditing', function (evt) {
    focused && focused.finishEditing();
});

exports = Class(function() {

    var defaults = {
        hint: '',
        inputType: 'default', // default | number | phone | password | capital
        maxLength: -1,
        inputReturnButton: 'default' // default (return) | go | google | join | next | route | search | send | yahoo | done | emergencycall,
    }

    this.init = function(opts) {
        console.log('instantiate EditText with hint: ' + opts.hint);
        this._opts = merge(opts, defaults);
        this._textEditView = opts.textEditView;
        this.onFocusChange = opts.onFocusChange || function() {};
        this.onSubmit = opts.onSubmit || function () {}
    };

    this.onChange = function (value, prevValue, cursorPos) {
        this._value = value;
        if (this._opts.onChange) {
            this._opts.onChange(value, prevValue, cursorPos);
        }
    }

    this.getValue = function () { return this._value; }

    this.setValue = function (value) {
        this._value = value;
        this.onChange(value);
    }

    this.requestFocus = function() {
        if (focused !== this) {
            if (focused != null) focused.removeFocus();
            this.onFocusChange(true);
        }

        focused = this; 
    }

	this.finishEditing = function() {
		this._textEditView.onFinishEditing();
        if (focused != null) {
            focused.removeFocus();
        }
	}

    this.submit = function() {
		this.onSubmit(this._value);
        if (focused != null) {
            focused.removeFocus();
        }
     }

    this.refresh = function(currentVal, hasBack, hasForward, cursorPos) {
		var textBox = this._textEditView._textBox;
		textBox.style.visible = false;
		var pos = this._textEditView.getPosition();
		var scale = pos.width / this._textEditView.style.width;

		NATIVE.call('editText.focus', {
				id: this._id,
				paddingLeft: this._opts.paddingLeft * scale,
				paddingRight: this._opts.paddingRight * scale,
				x: pos.x,
				y: pos.y, 
				width: pos.width,
				height: pos.height, 
				text: currentVal || "" ,
				hint: this._opts.hint,
				hintColor: this._opts.hintColor,
				inputType: this._opts.inputType,
				maxLength: this._opts.maxLength,
				fontColor: this._opts.color,
				fontSize: textBox._opts.size * scale,
				font: textBox._opts.fontFamily,
				cursorPos: cursorPos
		});

		//cursorPos);
    }

    this.hasFocus = function() {
        return focused == this;
    }

    this.removeFocus = function() {
        this.onFocusChange(false);
        if (focused == this) {
            focused = null;
			var textBox = this._textEditView._textBox;
			textBox.style.visible = true;
			NATIVE.call('editText.clearFocus', {});
        }
		
    }

    this.setHint = function(hint) {
        this._opts.hint = hint;
    }

});
