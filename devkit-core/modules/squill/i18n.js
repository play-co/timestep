let exports = {};

var gLang = null;

exports.setLang = function (lang) {
  gLang = lang;
};
exports.get = function (key) {
  return gLang && gLang.get(key);
};

exports.Language = class {
  constructor (dict) {
    this._dict = dict;
  }
  add (key, value) {
    this._dict[key] = value;
  }
  get (key) {
    return this._dict[key];
  }
};

export default exports;
