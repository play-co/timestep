let exports = {};

import { bind } from 'base';

var RE_BINDING = /(^|[^%])%\((.*?)\)([ +0-]?)(\d*)(\.?\d*)([dfcs])/g;

exports.parseFormat = function (widget, format) {
  var subs = [];
  format.replace(RE_BINDING, function (match, prefix, key, pad, minLength,
    decimal, type, index) {
    subs.push({
      index: index + prefix.length,
      endIndex: index + match.length,
      key: key,
      pad: pad || ' ',
      minLength: parseInt(minLength),
      decimal: parseInt(decimal.substring(1)),
      type: type,
      value: ''
    });
  });

  subs.reverse();
  new Binding(widget, null, format, subs);
};

exports.parseData = function (widget, data) {
  new Binding(widget, data);
};

class Binding {
  constructor (widget, key, src, subs) {
    var res = widget.getOpts().__result;
    var baseWidget = res && res.getTarget() || widget;

    this._widget = widget;
    this._key = key;
    this._src = src;
    this._subs = subs;

    this._connect(baseWidget.getModel());

    //  else if (widget.setEnabled && widget.isEnabled && widget.isEnabled()) {
    //   // disable input until the model is backing it
    //   this._isDisabled = true;
    //   widget.setEnabled(false);
    // }
    widget.on('change', bind(this, '_updateModel'));
    baseWidget.on('model', bind(this, '_connect'));
  }
  _connect (model) {
    if (this._model) {
      this._disconnect();
    }
    this._model = model;

    // this._widget.setEnabled(true);
    if (this._subs) {
      this._subs.forEach(function (sub) {
        sub.value = model.get(sub.key);
        model.subscribe(sub.key, this, '_update', sub.key);
      }, this);

      this._update();
    } else if (this._key) {
      model.subscribe(this._key, this, '_updateKey');
      this._updateKey(model.get(this._key));
    }
  }
  _disconnect () {
    var model = this._model;
    this._subs && this._subs.forEach(function (sub) {
      model.unsubscribe(sub.key, this);
    }, this);

    this._key && model.unsubscribe(this._key, this);
  }
  _update (key, value) {
    var str = this._src;
    this._subs.forEach(function (sub) {
      if (key && sub.key == key) {
        sub.value = value;
      }
      str = str.substring(0, sub.index) + sub.value + str.substring(sub.endIndex);
    }, this);

    this._widget.setData(str);
  }
  _updateKey (value) {
    this._widget.setData(value);
  }
  _updateModel (value) {
    if (this._model && this._key) {
      this._model.set(this._key, value);
    }
  }
}

/*

var bindings = require('./bindings');
bindings.parseFormat({}, "Hello world %(format.this) 4d %(format.that)06.2f")

*/
export default exports;
