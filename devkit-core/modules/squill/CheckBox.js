let exports = {};

import Widget from './Widget';
import browser from 'util/browser';
let $ = browser.$;

exports = class extends Widget {
  buildWidget () {
    this.setLabel(this._opts.label || '');
    if (this._opts.name) {
      this.setName(this._opts.name);
    }

    if (this._opts.value) {
      this.setValue(this._opts.value);
    }

    this.initMouseEvents(this.checkbox);
    $.onEvent(this.checkbox, 'change', this, '_onCheck');

    if (this._opts.__result) {
      this._opts.__result.addSubscription(this, 'Select', this._opts.id);
    }
  }
  _onCheck () {
    this.publish('Check', this.isChecked());
    this.emit('change', this.isChecked());
  }
  setLabel (label) {
    $.setText(this.label, label);
  }
  setName (name) {
    this.checkbox.name = name;
  }
  setValue (value) {
    this.checkbox.checked = !!value;
  }
  isChecked () {
    return this.checkbox.checked;
  }
  setChecked (isChecked) {
    this.checkbox.checked = isChecked;
  }
  getValue () {
    return this.isChecked() ? this.checkbox.value : null;
  }
};
exports.prototype._css = 'checkbox';
exports.prototype._def = {
  tag: 'label',
  children: [{
    id: 'checkbox',
    tag: 'input',
    attrs: { type: 'checkbox' }
  },
  {
    tag: 'span',
    id: 'label',
    text: ''
  }
  ]
};
exports.prototype.setData = exports.prototype.setValue;
var CheckBox = exports;

export default exports;
