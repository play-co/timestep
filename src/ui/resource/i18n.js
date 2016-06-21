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

var LOCALE_CODES = navigator.language && navigator.language.split('-');
var LANGUAGE_CODE = (LOCALE_CODES[0] || 'en').toLowerCase();
var REGION_CODE = (LOCALE_CODES[1] || 'US').toUpperCase();

var EU_REGIONS = [
  'AD', 'AT', 'BE', 'BL', 'CY', 'DE', 'EE', 'ES', 'EU', 'FI', 'FR', 'GR',
  'IE', 'IT', 'LU', 'LV', 'MC', 'ME', 'MT', 'MQ', 'NL', 'PM', 'PT', 'RE',
  'SI', 'SK', 'SM', 'VA', 'YT'
];

/**
 * The i18n Class provides localization support for string JSON files.
 */
exports = Class(function () {

  var defaultOpts = {
    languageCode: LANGUAGE_CODE,
    regionCode: REGION_CODE,
    stringsPath: 'resources/strings/',
    defaultStringsFile: 'en.json'
  };

  this.init = function (opts) {
    opts = merge(opts, defaultOpts);
    this._languageCode = opts.languageCode;
    this._regionCode = opts.regionCode;
    this._stringsPath = opts.stringsPath;
    this._defaultStringsFile = opts.defaultStringsFile;
    this._strings = {};

    this.loadStrings(this._stringsPath, this._defaultStringsFile);
  };

  this.getLanguageCode = function () {
    return this._languageCode;
  };

  this.getRegionCode = function () {
    return this._regionCode;
  };

  this.loadStrings = function (path, defaultFile) {
    var lc = this._languageCode;
    var rc = this._regionCode;
    var locPath = path + lc + '-' + rc + '.json';
    var langPath = path + lc + '.json';
    var defPath = path + defaultFile;
    var data = CACHE[locPath] || CACHE[langPath] || CACHE[defPath];
    if (data) {
      try {
        this._strings = JSON.parse(data);
      } catch (e) {
        console.error("Error loading strings JSON:");
        console.error(e);
      }
    } else {
      console.error("No JSON found for files:", locPath, langPath, defPath);
    }
  };

  this.getString = function (key) {
    var value = this._strings[key];
    return value !== undefined ? value : key;
  };

});

/**
 * This function is used by resource/loader to map localized resources to
 * the base resources directory automatically.
 * 
 * To leverage this resource localization, structure your resource
 * directories like this:
 *
 * default directory:
 *   resources
 *   └── images
 *       └── hero.png
 * 
 * language localized directory:
 *   resources-zh
 *   └── images
 *       └── hero.png
 * 
 * regional localized directory:
 *   resources-zh-TW
 *   └── images
 *       └── hero.png
 * 
 * You can then always use resources/images/hero.png, and the image will
 * automatically point to the best image for your user's language or region.
 *
 * It also supports regional localization for the EU, to aid in localizing
 * images of currency or currency symbols.
 */
exports.localizeResourceMap = function (map) {
  var localizedMap = {};
  // directories listed in order of priority
  var localeRes = 'resources-' + LANGUAGE_CODE + '-' + REGION_CODE;
  var langRes = 'resources-' + LANGUAGE_CODE;
  var regionRes = 'resources-' + REGION_CODE;
  var euroRes = 'resources-EU';
  for (var key in map) {
    var path = key;
    var localeIndex = key.indexOf(localeRes);
    var langIndex = key.indexOf(langRes);
    var regionIndex = key.indexOf(regionRes);
    var euroIndex = key.indexOf(euroRes);
    // replace localized path with default path
    // i.e. resources-en-US can now be accessed by resources
    if (localeIndex === 0) {
      path = 'resources' + key.substring(localeRes.length);
    } else if (langIndex === 0) {
      path = 'resources' + key.substring(langRes.length);
    } else if (regionIndex === 0) {
      path = 'resources' + key.substring(regionRes.length);
    } else if (euroIndex === 0 && EU_REGIONS.indexOf(REGION_CODE) !== -1) {
      path = 'resources' + key.substring(euroRes.length);
    }
    localizedMap[path] = map[key];
  }
  return localizedMap;
};

exports.applyResourceMap = function (map, language) {
  var localizedMap = {};
  var langRes = 'resources-' + language;
  for (var key in map) {
    var path = key;
    var langIndex = key.indexOf(langRes);
    if (langIndex === 0) {
      path = 'resources' + key.substring(langRes.length);
      localizedMap[path] = map[key];
    } else if (Object.keys(localizedMap).indexOf(path) < 0) {
      // without this block, the same name default resource would replace the localized resource
      localizedMap[path] = map[key];
    }
  }
  return localizedMap;
};
