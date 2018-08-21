let exports = {};

import { logger } from 'base';

import Callback from 'lib/Callback';

var _cache = {};
var _groups = {};

exports.register = function (baseDir, groups) {
  for (var name in groups) {
    var g = groups[name];
    if (!_groups[name]) {
      _groups[name] = [];
    }
    for (var i = 0, n = g.length; i < n; ++i) {
      _groups[name].push(baseDir + g[i]);
    }
  }
};

exports.getGroups = function () {
  return _groups;
};

// The callback is called for each image in the group with the image
// source that loaded and whether there was an error.
//
// function callback(lastSrc, error, isComplete, numCompleted, numTotal)
//    where error is true or false and isComplete is true when numCompleted == numTotal
//
exports.load = function (groupName, cb) {
  var group = _groups[groupName];
  if (!group || !group.length) {
    return logger.error('unknown group', groupName);
  }




  var i = 0;
  var load = function () {
    var src = group[i];
    var img = exports.get(src, false, true);
    var n = group.length;
    ++i;

    var next = function (failed) {
      img.onload = img.onerror = null;
      cb && cb(src, failed, i == n, i, n);
      if (i < n) {
        setTimeout(load, 0);
      } else {
        callback.fire(groupName);
      }
    };

    if (img.complete && i < n) {
      next(img.failed);
    } else {
      img.onload = function () {
        img.failed = false;
        next(false);
      };
      img.onerror = function () {
        img.failed = true;
        next(true);
      };
    }
  };

  var callback = new Callback();
  setTimeout(load, 0);
  return callback;
};

exports.get = function (src, copy, noWarn) {
  if (!copy && _cache[src]) {
    return _cache[src];
  }




  var img = new Image();
  if (Image.get) {
    var b64 = Image.get(src);
  }




  if (b64) {
    img.src = b64;
  } else {
    if (!noWarn) {
      logger.warn(src, 'may not be properly cached!');
    }
    img.src = src;
  }








  return _cache[src] = img;
};

export default exports;
