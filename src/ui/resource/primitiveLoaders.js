let exports = {};

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
import audioContext from 'audioContext';

// TODO: is this file where caches should be initialized and populated?
import { CACHE, logger } from 'base';
var FILE_CACHE = CACHE;

var IMAGE_CACHE = {};
var SOUND_CACHE = {};
var JSON_CACHE = {};

var RETRY_MAP = {
  '598': true,
  '599': true,
  '429': true // TODO: handle this error in a better way but should not happen anyway
};

var NB_RETRIES = 4;
var RETRY_TEMPO = 100; // TODO: 200 and test for error status code
exports.loadImage = function (url, cb, loader) {
  if (!url) {
    logger.warn('loader: The image url is empty.');
    return cb(null);
  }

  var img = new Image();
  if (loader._crossOrigin) {
    img.crossOrigin = loader._crossOrigin;
  } else {
    img.crossOrigin = 'use-credentials';
  }

  var nbRemainingTries = NB_RETRIES;
  var retryTempo = RETRY_TEMPO;
  img.onload = function () {
    // Resetting callbacks to avoid memory leaks
    this.onload  = null;
    this.onerror = null;

    // TODO: check image width?
    // Some browsers fire the load event before the image width is
    // available.
    // Solution: Wait up to 3 frames for the width.
    // Note that an image with zero-width should be considered an error.

    // emitting event
    loader.emit(loader.IMAGE_LOADED, this, url);

    return cb(this);
  };

  img.onerror = function (error) {
     if (RETRY_MAP[error.status] && nbRemainingTries > 0) {
      nbRemainingTries -= 1;
      setTimeout(() => {
        this.src = url;
      }, retryTempo);
      retryTempo *= 2;
      return;
    }

    // Resetting callbacks to avoid memory leaks
    this.onload  = null;
    this.onerror = null;
    var statusCode = ' Status code: ' + error.status;
    var reason = ' Reason: ' + error.reason;
    var response = ' Response: ' + error.response;
    logger.error('Image not found: ' + url + statusCode + reason + response);
    return cb(null);
  };

  img.src = url;
}
exports.loadImage.cache = IMAGE_CACHE;

exports.loadFile = function (url, cb, loader, responseType) {
  var xobj = new XMLHttpRequest();

  var nbRemainingTries = NB_RETRIES;
  var retryTempo = RETRY_TEMPO;
  xobj.onreadystatechange = function () {
    if (~~xobj.readyState !== 4) return;
    if (~~xobj.status !== 200 && ~~xobj.status !== 0) {
      if (RETRY_MAP[xobj.status] && nbRemainingTries > 0) {
        nbRemainingTries -= 1;
        // Retrying
        setTimeout(() => {
          xobj.open('GET', url, true, loader._user, loader._password);
          xobj.send();
        }, retryTempo);
        retryTempo *= 2;
        return;
      }

      xobj.onreadystatechange = null;
      
      var statusCode = ' Status code: ' + xobj.status;
      var reason = ' Reason: ' + xobj.reason;
      var response = ' Response: ' + xobj.response;
      logger.error('Failed to load file: ' + url + statusCode + reason + response);
      return cb(null);
    }

    xobj.onreadystatechange = null;
    var file = xobj.response;
    return cb(file);
  };

  xobj.withCredentials = true;
  xobj.open('GET', url, true, loader._user, loader._password);
  if (responseType) {
    xobj.responseType = responseType;
  }
  xobj.send();
}
var loadFile = exports.loadFile;
exports.loadFile.cache = FILE_CACHE;

exports.loadJSON = function (url, cb, loader) {
  loadFile(url, (fileContent) => {
    if (fileContent === null) {
      return cb(null);
    }

    var json;
    try {
      json = JSON.parse(fileContent);
    } catch (e) {
      logger.error('JSON file could not be parsed: ' + url);
      json = null;
    }
    return cb(json);
  }, loader);
}
exports.loadJSON.cache = JSON_CACHE;

exports.loadSound = function (url, cb, loader) {
  loadFile(url, sound => {
    if (sound === null) {
      return cb && cb(null);
    }

    audioContext.decodeAudioData(sound, soundBuffer => {
      return cb && cb(soundBuffer);
    });
  }, loader, 'arraybuffer');
}
exports.loadSound.cache = SOUND_CACHE;

export default exports;
