let exports = {};

import { bind } from 'base';

import PubSub from 'lib/PubSub';

class Transition extends PubSub {
  constructor (opts) {
    super();

    this._target = opts.target;
    this._start = opts.start;
    this._end = opts.end;

    setTimeout(bind(this, 'run'), 0);
  }
  run () {}
}

class CSSTransition extends Transition {
  run () {
    var target = this._target;
    this._start && this._start(target);

    this.emit('start', this._target);

    var duration = getComputedStyle(target).transitionDuration || 0;
    if (duration) {
      duration = parseFloat(duration) * (/ms/.test(duration) ? 1 : 1000);
    }

    setTimeout(bind(this, 'end'), duration);
  }
  end () {
    var target = this._target;
    this._end && this._end(target);
    this.emit('end', target);
  }
}

exports.Transition = Transition;
exports.CSSTransition = CSSTransition;

exports.cssFadeIn = function (el) {
  return new CSSTransition({
    target: el,
    start: function (target) {
      target.style.opacity = 1;
    }
  });
};

exports.cssFadeOut = function (el) {
  var pointerEvents;
  return new CSSTransition({
    target: el,
    start: function (target) {
      pointerEvents = target.style.pointerEvents;
      target.style.pointerEvents = 'none';
      target.style.opacity = 0;
    },
    end: function (target) {
      target.style.pointerEvents = pointerEvents;
      target.parentNode && target.parentNode.removeChild(target);
    }
  });
};

export default exports;
