import { logger } from 'base';

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
'use import';
import underscore from 'util/underscore';
let _ = underscore._;
import URI from 'std/uri';

var keysToIgnore = /^tr_pending|BOOKMARK_DISMISSED_COUNT/;

var exportSettings = function () {
  var oldUrl = new URI(window.location);
  var protocol = oldUrl.query('protocol');
  var url = new URI(protocol + '://' + window.location.host + window.location.pathname);
  alert(url);
  var settings = {};
  _.each(_.reject(_.keys(localStorage), function (key) {
    return key.match(keysToIgnore);
  }), function (key) {
    settings[key] = localStorage[key];
    logger.log(key, settings[key]);
  });
  url.addQuery({ settings: JSON.stringify(settings) });
  window.location = url;
}

;

exportSettings();

