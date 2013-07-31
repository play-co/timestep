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

import ui.TextView as TextView;
import ui.ImageScaleView as ImageScaleView;
import device;

var EditText = device.get('EditText');

exports = Class(ImageScaleView, function(supr) {

    var HINT_COLOR = "#979797";
    var defaults = {
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 0,
        paddingBottom: 0
    };

    this.init = function(opts) {
        this._opts = merge(opts || {}, defaults); 

        supr(this, 'init', [this._opts]);

        this.supr = supr;
        this._textBox = new TextView(merge({
            x: this._opts.paddingLeft,
            y: this._opts.paddingTop,
            width: opts.width - this._opts.paddingLeft - this._opts.paddingRight,
            height: opts.height
        }, opts));

        this.addSubview(this._textBox);
        this._focused = false;
        this._textFilter = null;
        this._textCursorFilter = null;
        this._backTextEditView = null;
        this._forwardTextEditView = null;
        this._hint = this._opts.hintJs || this._opts.hint;
        this._hintSet = false;
        this._cursorPosition = -1;
        this._normalColor = this._opts.color;
        this._editText = new EditText(merge({}, // avoid side effects
            merge(opts, {
                title: this._hint,
                textEditView: this,
                onChange: bind(this, 'onChange'),
                onSubmit: bind(this, 'onSubmit'),
                onFocusChange: bind(this, this.onFocusChange)
            })
        ));

        this.setText(this._opts.text || "");
    };

    this.onSubmit = function () {};

    this.onInputSelect = function() {
        this.requestFocus();
    };

    this.requestFocus = function() {
        this._focused = true;
        this._editText.requestFocus();
        this.refresh();
    }

    this.removeFocus = function() {
        this._editText.closeEditField();
    }

    this.refresh = function() {
        this._editText.refresh(this.getText(),
                               this._backTextEditView != null,
                               this._forwardTextEditView != null,
                               this._cursorPosition);
    }

    this.onFocusChange = function(focused) {
        if (focused) {
            this.emit('focusAdd');
        } else {
            this.emit('focusRemove');
        }
    }

    this.onChange = function(value, prevValue, cursorPos) {
        var isProcessed;
        var isCursorSet;

        if (value !== this._textBox.getText()) {
            isProcessed = typeof this._textFilter === 'function';
            isCursorSet = typeof this._textCursorFilter === 'function';
            
            if (isProcessed) {
                if (isCursorSet) {
                    this._cursorPosition = this._textCursorFilter(value, prevValue, cursorPos);    
                }

                value = this._textFilter(value, prevValue); 
            } 

            this.setText(value);

            if (isProcessed) {
                this.refresh(); // update native EditText with processed values 
            }

            this.emit('onChange', value);
        }
    }

    this.setBackward = function(view) {
        this._backTextEditView = view;
    }

    this.setForward = function(view) {
        this._forwardTextEditView = view;
    }

    /**
     * Accepts a function that takes one string argument
     * and returns a string. This can be used to process text
     * entered into the EditText.
     */
    this.registerTextFilter = function(fn, fn2) {
        this._textFilter = fn; 
        this._textCursorFilter = fn2;
    }

    this.getText = function() {
        var result;

        if (this._hintSet) {
            result = ""; 
        } else {
            result = this._textBox.getText();
        }

        return result;
    }

    this.setValue = 
    this.setText = function(text) {
        if ((text == null || (text != null && text.length == 0)) && this._hint != null) {
            this._hintSet = true;
            text = this._hint; 
            this._textBox._opts.color = "#979797";
        } else {
            this._hintSet = false;
            this._textBox._opts.color = this._normalColor; 
        }

        this._textBox.setText(text);
    }
});
