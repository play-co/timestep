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
 * @class event.input.KeyListener
 * Implements a simple Key listener.
 */
import browser from 'util/browser';
let $ = browser.$;


class Listener {
  constructor (el) {
    this._el = el = el || document;
    this._keys = {};

    $.onEvent(el, 'keydown', this, 'onKeyDown');
    // $.onEvent(el, 'click', this, 'click');
    $.onEvent(el, 'keyup', this, 'onKeyUp');
    $.onEvent(el, 'blur', this, 'clear');
  }
  onKeyUp (e) {
    this._keys[e.keyCode] = false;
    delete this._keys[e.keyCode];
    $.stopEvent(e);
  }
  onKeyDown (e) {
    this._keys[e.keyCode] = true;
    $.stopEvent(e);
  }
  getKeys () {
    return this._keys;
  }
}

var listener = null;
export default class KeyListener {
  constructor () {
    if (!listener) {
      listener = new Listener();
    }
  }
  getKeys () {
    return listener.getKeys();
  }
}
