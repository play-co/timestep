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
import { merge } from 'base';

import ImageView from 'ui/ImageView';
import ImageScaleView from 'ui/ImageScaleView';
import TextView from 'ui/TextView';

import enumeration from 'lib/Enum';

var states = enumeration('UP', 'DOWN', 'DISABLED', 'SELECTED', 'UNSELECTED');
var lastClicked = null;
export default class ButtonView extends ImageScaleView {
  constructor (opts) {
    super(...arguments);

    this._state = opts.defaultState || opts.state || (opts.toggleSelected ? states.UNSELECTED : states.UP);
    this.selected = opts.toggleSelected && opts.state === states.SELECTED ? true : false;

    var textOpts = merge(opts.text, {
      superview: this,
      text: opts.title || '',
      x: 0,
      y: 0,
      width: this.style.width,
      height: this.style.height,
      canHandleEvents: false
    });

    this._reflowText = textOpts.width == this.style.width && textOpts.height == this.style.height;
    this._text = new TextView(textOpts);

    var iconOpts = merge(opts.icon, {
      superview: this,
      x: 0,
      y: 0,
      width: this.style.width,
      height: this.style.height,
      canHandleEvents: false
    });

    this._icon = new ImageView(iconOpts);

    this.updateOpts(opts);
    this._trigger(this._state, true);
  }
  updateOpts (opts) {
    opts = merge(opts, this._opts);

    opts = super.updateOpts(opts);

    this._opts = opts;
    this._images = opts.images;
    this._onHandlers = opts.on || {};
    this._audioManager = opts.audioManager;
    this._sounds = opts.sounds;

    'text' in opts && this._text && this._text.updateOpts(opts.text);
  }
  onInputStart () {
    // no action when disabled
    if (this._state === states.DISABLED) {
      return;
    }

    lastClicked = this.uid;

    this._state = states.DOWN;
    this._trigger(states.DOWN);
  }
  onInputOver () {
    // no action when disabled
    if (this._state === states.DISABLED || lastClicked != this.uid) {
      return;
    }

    this._state = states.DOWN;
    this._trigger(states.DOWN, true);
  }
  onInputSelect () {
    // no action when disabled
    if (this._state === states.DISABLED) {
      return;
    }

    // call the click handler
    this._opts.onClick && this._opts.onClick.call(this);
    this.onClick && this.onClick();

    // onClick handler may disable button
    if (this._state == states.DISABLED) {
      return;
    }

    if (this._opts.clickOnce) {
      this._state = states.DISABLED;
      this._trigger(states.UP);
      this._trigger(states.DISABLED);
      return;
    }

    if (this._opts.toggleSelected) {
      if (this.selected) {
        this._trigger(states.UNSELECTED);
        this.selected = false;
      } else {
        this._trigger(states.SELECTED);
        this.selected = true;
      }
    } else {
      this._trigger(states.UP);
    }
  }
  onInputOut () {
    if (this._state !== states.DISABLED && this._state !== states.UP) {
      this._state = states.UP;
      this._trigger(states.UP, true);
    }
  }
  _trigger (state, dontPublish) {
    var stateName = states[state];
    if (!stateName) {
      return;
    }

    stateName = stateName.toLowerCase();

    if (this._images && this._images[stateName]) {
      if (!(this._opts.toggleSelected && state === states.UP)) {
        this.setImage(this._images[stateName]);
      }
    }
    if (dontPublish) {
      return;
    }

    if (typeof this._onHandlers[stateName] === 'function') {
      this._onHandlers[stateName].call(this);
    }
    if (this._sounds && this._sounds[stateName]) {
      this._audioManager && this._audioManager.play(this._sounds[stateName]);
    }

    this.emit(stateName);
  }
  reflow () {
    if (this._reflowText) {
      this._text.style.width = this.style.width;
      this._text.style.height = this.style.height;
    }
  }
  getText () {
    return this._text;
  }
  setTitle (title) {
    this._text.setText(title);
  }
  getIcon () {
    return this._icon;
  }
  setIcon (icon) {
    this._icon.setImage(icon);
  }
  setState (state) {
    var stateName = states[state];
    if (!stateName) {
      return;
    }

    switch (state) {
      case states.SELECTED:
        this.selected = true;
        break;

      case states.UNSELECTED:
        this.selected = false;
        break;
    }

    this._state = state;
    stateName = stateName.toLowerCase();
    this.setImage(this._images[stateName]);
  }
}

ButtonView.states = states;
