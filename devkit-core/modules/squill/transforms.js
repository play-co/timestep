let exports = {};

import browser from 'util/browser';
let $ = browser.$;

var vendor = /webkit/i.test(navigator.appVersion) ? 'webkit' : /firefox/i.test(navigator.userAgent) ? 'Moz' : 'opera' in window ? 'O' : '', has3d = 'WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix(), hasTransform = vendor + 'Transform' in document.documentElement.style, translateStart = 'translate' + (has3d ? '3d(' : '('), translateEnd = has3d ? ',0)' : ')';

if (hasTransform) {
  exports.setLeft = function (el, left) {
    el.style[vendor + 'Transform'] = translateStart + left + 'px,0' + translateEnd;
  };

  exports.setTop = function (el, top) {
    el.style[vendor + 'Transform'] = translateStart + '0,' + top + 'px' + translateEnd;
  };
} else {
  exports.setLeft = function (el, left) {
    el.style.left = left + 'px';
  };

  exports.setTop = function (el, top) {
    el.style.top = top + 'px';
  };
}




exports.onTransitionEnd = function (el, cb) {
  var executed = false;
  var finished = function () {
    if (executed) {
      return;
    }
    executed = true;
    for (var i = 0, remove; remove = evts[i]; ++i) {
      remove();
    }
    cb();
  }

;

  var evts = [
    $.onEvent(el, 'webkitTransitionEnd', finished),
    $.onEvent(el, 'transitionend', finished),
    $.onEvent(el, 'oTransitionEnd', finished)
  ];
};

exports.setTransition = function (el, transition, cb) {
  if (transition) {
    var oldTransition = el.style[vendor + 'Transition'];
    exports.onTransitionEnd(el, function () {
      el.style[vendor + 'Transition'] = oldTransition;
      cb && cb();
    });
    el.style[vendor + 'Transition'] = '-' + vendor + '-transform ' + transition;
  } else {
    el.style[vendor + 'Transition'] = 'none';
  }
};

exports.rotate = function (el, rotation, transition, cb) {
  if (!hasTransform) {
    cb && cb();
    return;
  }
  exports.setTransition(el, transition, cb);

  el.style[vendor + 'Transform'] = 'rotate(' + rotation + ')';

  if (cb && !transition) {
    cb();
  }
};

exports.move = function (el, x, y, transition, cb) {
  if (!hasTransform) {
    cb && cb();
    return;
  }
  exports.setTransition(el, transition, cb);
  el.style[vendor + 'Transform'] = translateStart + x + 'px,' + y + 'px' + translateEnd;
  if (cb && !transition) {
    cb();
  }
};

exports.hasTransform = hasTransform;

export default exports;
