let exports = {};

import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';
import TextArea from './TextArea';

exports = class extends TextArea {
  buildWidget () {
    super.buildWidget(...arguments);
    this._limit = this._opts.limit || 140;
    this._limitLabel = $({
      text: this._limit,
      parent: this._el
    });

    this.initKeyEvents(this._textarea);
  }
  onKeyUp () {
    super.onKeyUp(...arguments);
    this.validate();
    var val = this._limitLabel.innerHTML;
    val = this._limit - this._textarea.value.length;
    this._limitLabel.innerHTML = '' + val;
    if (val < 0) {
      this._limitLabel.className += ' invalid';
    } else {
      this._limitLabel.className = this._limitLabel.className.replace(
        /\binvalid\b/g, '');
    }
  }
};
exports.prototype.validators = [{
  validator: function () {
    return this._textarea.value.length <= this._limit;
  },
  message: 'over the char limit'
},
{
  validator: function () {
    return this._textarea.value != '';
  },
  message: 'must enter a value'
}
];
var TextLimitArea = exports;

Widget.register(TextLimitArea, 'TextLimitArea');

export default exports;
