from util.browser import $;

var _cssPrefix;
exports.getCSSPrefix = function () {
  if (_cssPrefix === undefined) {
    var styles = window.getComputedStyle(document.documentElement, '');
    if (styles.OLink === '') {
      _cssPrefix = '-o-';
    } else {
      var match = Array.prototype.join.call(styles, '')
          .match(/-(moz|webkit|ms)-/);

      if (match) {
        _cssPrefix = '-' + match[1] + '-';
      } else {
        _cssPrefix = '';
      }
    }
  }

  return _cssPrefix;
};

exports.Stylesheet = Class(function () {
  this.init = function (base) {
    this._base = base ? base + ' ' : '';
    this._rules = [];
  };

  this.add = function (selector, value) {
    this._rules.push({
      selector: selector,
      value: value
    });
    return this;
  };

  this.scale = function (scale) {
    this._rules.forEach(function (rule) {
      rule.value = rule.value.replace(/([^;:]+:)(.*?)(;|$)/g, function (match, property, value, postfix) {
        // skip border, but not border*radius
        if (/border(?!.*?radius)/.test(property)) { return match; }
        return property + value.replace(/\d\S*px/g, function (match) {
          var value = parseFloat(match);
          if (isNaN(value)) { return match; }
          return parseFloat(value) * scale + 'px';
        }) + postfix;
      });
    });

    if (this._el) {
      this.insert();
    }

    return this;
  };

  this.getValue = function () {
    return this._rules.map(function (rule) {
        return this._base + rule.selector + '{' + rule.value + '}';
      }, this)
      .join('');
  };

  this.insert = function () {
    if (!this._el) {
      this._el = $({
        parent: document.getElementsByTagName('head')[0],
        tag: 'style'
      });
    }
    
    $.setText(this._el, this.getValue());
  };
});
