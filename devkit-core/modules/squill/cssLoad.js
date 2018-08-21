let exports = {};

import {
  logger,
  bind
} from 'base';

import uri from 'std/uri';
import ajax from 'util/ajax';
import browser from 'util/browser';
let $ = browser.$;

logger.setLevel(0);

exports.get = function (opts, cb) {
  if (typeof opts == 'string') {
    opts = { url: opts };
  }




  var win = opts.win || window;
  var doc = win.document;
  var loc = win.location;

  var parent = opts.el || doc.getElementsByTagName('head')[0];

  // use a script tag
  var el = $({ tag: 'link' });
  el.type = 'text/css';
  el.rel = 'stylesheet';
  if ('onload' in el) {
    el.onload = function () {
      setTimeout(function () {
        cb && cb(null);
      }, 0);
    };

    // wait for reflow
    el.onerror = function (e) {
      cb && cb(e);
    };
  } else {
    // don't know when it loads :(
    setTimeout(function () {
      cb && cb();
    }, 500);
  }








  var url = uri.relativeTo(opts.url, window.location.toString());

  exports._styleTags.push({
    el: el,
    src: url
  });

  parent.appendChild(el);
  el.href = url;
};

exports._styleTags = [];
exports.reloadCSS = function () {
  for (var i = 0, s; s = exports._styleTags[i]; ++i) {
    ajax.get({ url: s.src }, bind(this, function (s, err, content) {
      if (!err) {
        $.setText(s.el, content);
      }
    }, s));
  }
};

export default exports;
