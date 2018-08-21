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
 * @class ui.TextInputView;
 *
 * @doc http://doc.gameclosure.com/api/ui-text.html#class-ui.textinputview
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/text.md
 */
import {
  merge,
  bind
} from 'base';

import View from 'ui/View';
import TextBox from 'platforms/browser/TextBox';

export default class TextInputView extends View {
  constructor (opts) {
    opts = merge(opts, {
      color: 'black',
      height: 20,
      layout: 'box'
    });

    super(opts);

    this._props = {};
    this._opts = opts;
    this.updatePosition();
  }
  getOpacity () {
    var view = this,
      opacity = this.style.opacity;
    while (view._superview) {
      view = view._superview;
      opacity *= view.style.opacity;
    }
    return opacity;
  }
  _clearSuperview () {
    super._clearSuperview(...arguments);

    this._textBox.destroy();
    this._textBox = null;
  }
  updatePosition () {
    var app = this.getApp();
    if (!app) {
      return;
    }

    var s = this.style;
    var a = this._props;
    var b = this.getPosition();
    if (this._textBox && a.x == b.x && a.y == b.y && a.width == b.width &&
      a.height == b.height && a.opacity == s.opacity) {
      return;
    }

    var box = this._textBox;
    if (!box) {
      box = this._textBox = new TextBox({ color: this._opts.color });
      this._textBox.onChange = bind(this, '_onValueChanged');
      box.setValue(this._opts.value || '');
    }

    box.setApp(app);
    box.setPosition(b);
    box.setDimensions(b);
    box.setOpacity(s.opacity);
    box.setVisible(true);

    this._props = b;
  }
  _onValueChanged () {
    this.publish('ValueChanged', this.getValue());
  }
  setValue (value) {
    return this._textBox.setValue(value);
  }
  getValue () {
    return this._textBox.getValue();
  }
  updateStyle (style) {
    this._el.style = merge(style, this._el.style);
  }
  updateOpts (opts) {
    this.opts = merge(opts, this.opts);
  }
  render () {
    this.updatePosition();
  }
}
