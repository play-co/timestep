let exports = {};

import { bind } from 'base';

import browser from 'util/browser';
let $ = browser.$;
jsio('import .TextButton, .Widget');

exports = class extends TextButton {
  putHere () {
    super.putHere(...arguments);
    if (this._opts.form) {
      this.onclick(bind(this, function () {
        this._opts.form.submit();
      }));
    } else {
      setTimeout(bind(this, function () {
        var el = this._el;
        while (el.tagName != 'FORM' && (el = el.parentNode)) {}
        if (el && el.submit) {
          this.onclick(bind(this, function () {
            el.submit();
          }));
        }
      }), 0);
    }
    return this;
  }
};
var SubmitButton = exports;

Widget.register(SubmitButton, 'SubmitButton');

export default exports;
