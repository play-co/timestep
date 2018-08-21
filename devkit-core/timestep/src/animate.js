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
/**
 * package ui.backend.canvas.animate;
 *
 * Canvas animate namespace and functions.
 *
 * Internal Class Note:
 *   Animators are kept on subjects, and only get GC'd if subject does
 *   Frames are pooled and recycled internally
 */
import { logger } from 'base';

import Emitter from 'event/Emitter';
import transitions from 'animate/transitions';
import timer from 'timer';
import ObjectPool from 'ObjectPool';

import engine from 'ui/engine';
import IView from 'ui/IView';

var groups = {};
var DEFAULT_GROUP_ID = '__default_group';

/**
 * Group Class
 * - a collection of animations by groupID across different subjects
 * - accessed by animate.getGroup()
 * - subscribe to the 'Finish' event to fire a callback when
 *     all animations in the group are complete or cleared, for example:
 *     myGroup.once('Finish', function () { ... });
 * - exposes clear, commit, pause, and resume to apply to all group animations
 */
class Group extends Emitter {
  constructor (groupID) {
    super();

    this.groupID = groupID + '';
    this.anims = [];
  }
  add (anim) {
    if (this.anims.indexOf(anim) === -1) {
      this.anims.push(anim);
    }
  }
  remove (anim) {
    var index = this.anims.indexOf(anim);
    if (index !== -1) {
      this.anims.splice(index, 1);

      // fire Finish event after final animation removed
      if (this.anims.length === 0) {
        this.publish('Finish');
      }
    }
  }
  isActive () {
    return this.anims.length > 0;
  }
  clear () {
    var anims = this.anims;
    for (var i = anims.length - 1; i >= 0; i--) {
      anims[i].clear();
    }
    return this;
  }
  commit () {
    var anims = this.anims;
    for (var i = anims.length - 1; i >= 0; i--) {
      anims[i].commit();
    }
    return this;
  }
  pause () {
    var anims = this.anims;
    for (var i = anims.length - 1; i >= 0; i--) {
      anims[i].pause();
    }
    return this;
  }
  resume () {
    var anims = this.anims;
    for (var i = anims.length - 1; i >= 0; i--) {
      anims[i].resume();
    }
    return this;
  }
}


var TRANSITIONS = [
  transitions.easeInOut,
  // 0: default
  transitions.linear,
  // 1
  transitions.easeIn,
  // 2
  transitions.easeOut,
  // 3
  transitions.easeInOut,
  // 4
  transitions.easeInQuad,
  // 5
  transitions.easeOutQuad,
  // 6
  transitions.easeInOutQuad,
  // 7
  transitions.easeInCubic,
  // 8
  transitions.easeOutCubic,
  // 9
  transitions.easeInOutCubic,
  // 10
  transitions.easeInQuart,
  // 11
  transitions.easeOutQuart,
  // 12
  transitions.easeInOutQuart,
  // 13
  transitions.easeInQuint,
  // 14
  transitions.easeOutQuint,
  // 15
  transitions.easeInOutQuint,
  // 16
  transitions.easeInSine,
  // 17
  transitions.easeOutSine,
  // 18
  transitions.easeInOutSine,
  // 19
  transitions.easeInExpo,
  // 20
  transitions.easeOutExpo,
  // 21
  transitions.easeInOutExpo,
  // 22
  transitions.easeInCirc,
  // 23
  transitions.easeOutCirc,
  // 24
  transitions.easeInOutCirc,
  // 25
  transitions.easeInElastic,
  // 26
  transitions.easeOutElastic,
  // 27
  transitions.easeInOutElastic,
  // 28
  transitions.easeInBack,
  // 29
  transitions.easeOutBack,
  // 30
  transitions.easeInOutBack,
  // 31
  transitions.easeInBounce,
  // 32
  transitions.easeOutBounce,
  // 33
  transitions.easeInOutBounce
];

function getTransition (n) {
  return typeof n == 'function' ? n : TRANSITIONS[n | 0];
}

class Frame {
  constructor () {
    this.subject = null;
    this.target = null;
    this.duration = 0;
    this.transition = null;
    this.base = null;
    this._baseStyle = null;
    // ObjectPool book-keeping
    this.pool = null;
    this._poolIndex = 0;
    this._obtainedFromPool = false;
  }
  reset (subject, target, duration, transition) {
    this.subject = subject;
    this.target = target;
    this.duration = duration === 0 ? 0 : duration || 500;
    this.transition = getTransition(transition);
    this.base = null;
    this._baseStyle = null;
    if (this.duration < 0) {
      throw new Error('Animations cannot have negative durations!');
    }
  }
  recycle () {
    this.pool.release(this);
  }

  exec (/*tt, t*/) {}

  /// #if IS_DEVELOPMENT
  debugLog (/*tt*/) {}
  /// #endif
}

class CallbackFrame extends Frame {
  reset (subject, target, duration, transition) {
    super.reset(subject, target, duration, transition);
    // CallbackFrames act like tick functions when given durations
    this.duration = duration || 0;
  }
  exec (tt, t) {
    this.target.call(this.subject, tt, t);
  }
}

class ObjectFrame extends Frame {
  exec (tt) {
    // set starting values on first execution
    var key;

    if (!this.base) {
      this.base = {};
      for (key in this.target) {
        this.base[key] = this.subject[key];
      }
    }

    for (key in this.target) {
      var baseValue = this.base[key];
      this.subject[key] = baseValue + tt * (this.target[key] - baseValue);
    }
  }

  /// #if IS_DEVELOPMENT
  debugLog (tt) {
    var changed = {};
    for (var key in this.target) {
      changed[key] = this.subject[key] + ' -> ' + this.target[key];
    }
    logger.log(this.duration, tt, JSON.stringify(changed));
  }
  /// #endif
}

// a ViewStyleFrame updates a view's style in exec
class ViewStyleFrame extends Frame {
  resolveDeltas (againstStyle) {
    var style = this.target;
    for (var key in style) {
      var baseKey = key.substring(1);
      if (key.charAt(0) == 'd' && !(key in againstStyle) && baseKey in againstStyle) {
        style[baseKey] = style[key] + againstStyle[baseKey];
        delete style[key];
      }
    }
  }
  exec (tt) {
    var oldStyle = this._baseStyle;
    var newStyle = this.target;
    var viewStyle = this.subject.style;

    // resolve deltas and starting style on first execution
    if (!oldStyle) {
      oldStyle = this._baseStyle = viewStyle.copy();
      this.resolveDeltas(oldStyle);
    }

    for (var key in newStyle) {
      if (key in oldStyle) {
        var oldValue = oldStyle[key];
        viewStyle[key] = oldValue + tt * (newStyle[key] - oldValue);
      }
    }
  }

  /// #if IS_DEVELOPMENT
  debugLog (tt) {
    var changed = {};
    var newStyle = this.target;
    var viewStyle = this.subject.style;
    for (var key in newStyle) {
      changed[key] = viewStyle[key] + ' -> ' + newStyle[key];
    }
    logger.log(timer.now, this.duration, tt, JSON.stringify(changed));
  }
  /// #endif
}

// pool frame classes to minimize mem allocation and garbage collection
var framePool = new ObjectPool({ ctor: Frame });
var objectFramePool = new ObjectPool({ ctor: ObjectFrame });
var callbackFramePool = new ObjectPool({ ctor: CallbackFrame });
var viewStyleFramePool = new ObjectPool({ ctor: ViewStyleFrame });


class AnimatorScheduler extends Emitter {
  schedule (anim) {
    engine.subscribe('Tick', anim, 'onTick');
  }

  unschedule (anim) {
    engine.unsubscribe('Tick', anim, 'onTick');
  }
}

const DEFAULT_ANIMATOR_SCHEDULER = new AnimatorScheduler();

class Animator extends Emitter {
  constructor (subject) {
    super();

    this.subject = subject;
    this._queue = [];
    this._elapsed = 0;
    this._isPaused = false;
    this._isScheduled = false;

    /// #if IS_DEVELOPMENT
    this._debug = false;
    /// #endif

    this._scheduler = DEFAULT_ANIMATOR_SCHEDULER;
  }

  scheduler (scheduler) {
    let wasScheduled = false;
    if (this._scheduler) {
      if (this._scheduler === scheduler) {
        // Dont need to do anything
        return;
      } else {
        // Detach from old scheduler
        if (this._isScheduled) {
          this._scheduler.unschedule(this);
          wasScheduled = true;
        }
      }
    }
    this._scheduler = scheduler || DEFAULT_ANIMATOR_SCHEDULER;
    if (wasScheduled) {
      // Attach to new scheduler
      this.scheduler.schedule(this);
    }
    return this;
  }

  clear () {
    var queue = this._queue;
    var len = queue.length;
    for (var i = 0; i < len; i++) {
      queue[i].recycle();
    }
    queue.length = 0;
    this._elapsed = 0;
    this._unschedule();
    this._removeFromGroup();
    return this;
  }

  pause () {
    if (!this._isPaused) {
      this._isPaused = true;
      this._unschedule();
    }
    return this;
  }

  resume () {
    if (this._isPaused) {
      this._isPaused = false;
      this._schedule();
    }
    return this;
  }

  _schedule () {
    if (!this._isScheduled) {
      this._isScheduled = true;
      this._scheduler.schedule(this);
    }
  }

  _unschedule () {
    if (this._isScheduled) {
      this._isScheduled = false;
      this._scheduler.unschedule(this);
    }
  }

  isPaused () {
    return this._isPaused;
  }

  hasFrames () {
    return !!this._queue[0];
  }

  wait (duration) {
    return this.then(undefined, duration);
  }

  buildFrame (target, duration, transition) {
    var frame;
    var subject = this.subject;
    var targetType = typeof target;
    if (targetType === 'function') {
      frame = callbackFramePool.obtain();
      frame.pool = callbackFramePool;
    } else if (targetType === 'object') {
      frame = objectFramePool.obtain();
      frame.pool = objectFramePool;
    } else {
      frame = framePool.obtain();
      frame.pool = framePool;
    }
    frame.reset(subject, target, duration, transition);
    return frame;
  }

  now (target, duration, transition) {
    this.clear();
    return this.then(target, duration, transition);
  }

  then (target, duration, transition) {
    if (!this._queue.length) {
      this._elapsed = 0;
    }

    this._queue.push(this.buildFrame(target, duration, transition));
    this._schedule();
    this._addToGroup();
    return this;
  }

  /// #if IS_DEVELOPMENT
  debug () {
    this._debug = true;
    return this;
  }
  /// #endif

  commit () {
    this.resume();
    this._elapsed = 0;
    for (var i = 0; i < this._queue.length; i++) {
      this._elapsed += this._queue[i].duration;
    }

    this.next();
    return this;
  }

  onTick (dt) {
    if (!this._isScheduled) {
      return;
    }

    this._elapsed += dt;
    this.next();
  }

  next () {
    var p = this._queue[0];
    while (p) {
      var duration = p.duration;
      var frameFinished = this._elapsed >= duration;
      var t = frameFinished ? 1 : this._elapsed / duration;
      var tt = p.transition(t);

      if (frameFinished) {
        this._elapsed -= duration;
      }

      p.exec(tt, t);

      /// #if IS_DEVELOPMENT
      if (this._debug) {
        p.debugLog(tt);
      }
      /// #endif

      // remove frame if finished and queue wasn't modified by a callback
      if (frameFinished && p === this._queue[0]) {
        var frame = this._queue.shift();
        frame.recycle();
      }

      // if paused during a callback or frame not finished, don't continue
      if (!frameFinished || this._isPaused) {
        return;
      }

      p = this._queue[0];
    }

    // nothing left in the queue!
    this._unschedule();
    this._removeFromGroup();
  }
  _addToGroup () {
    var group = groups[this.groupID];
    group && group.add(this);
  }

  _removeFromGroup () {
    var group = groups[this.groupID];
    group && group.remove(this);
  }
}

var ViewAnimator = class ViewAnimatorClass extends Animator {
  buildFrame (target, duration, transition) {
    if (typeof target === 'object') {
      var frame = viewStyleFramePool.obtain();
      frame.pool = viewStyleFramePool;
      frame.reset(this.subject, target, duration, transition);
      return frame;
    } else {
      return super.buildFrame(target, duration, transition);
    }
  }
};

let animate = function (subject, groupID) {
  // create a group for this groupID if it doesn't exist
  groupID = groupID || DEFAULT_GROUP_ID;
  !groups[groupID] && (groups[groupID] = new Group(groupID));

  // animators created once and cached on subject '__anims' object by groupID
  // so they're only garbage collected when the subject is garbage collected
  var anims = subject.__anims || (subject.__anims = {});
  var anim = anims[groupID];
  if (!anim) {
    anim = subject instanceof IView ? new ViewAnimator(subject) : new Animator(subject);
    anim.groupID = groupID;
    anims[groupID] = anim;
  }

  return anim;
};

animate.Animator = Animator;
animate.AnimatorScheduler = AnimatorScheduler;

// used to get/set browser ViewAnimator constructors
animate.getViewAnimator = function () {
  return ViewAnimator;
};

animate.setViewAnimator = function (ctor) {
  ViewAnimator = ctor;
};

// API for pre-populating frame pools
//   this is useful if you plan on launching many animations at once
animate.initializeFrameCount = function (count) {
  count -= framePool.getTotalCount();
  for (var i = 0; i < count; i++) {
    framePool.create();
  }
};

animate.initializeObjectFrameCount = function (count) {
  count -= objectFramePool.getTotalCount();
  for (var i = 0; i < count; i++) {
    objectFramePool.create();
  }
};

animate.initializeCallbackFrameCount = function (count) {
  count -= callbackFramePool.getTotalCount();
  for (var i = 0; i < count; i++) {
    callbackFramePool.create();
  }
};

animate.initializeViewStyleFrameCount = function (count) {
  count -= viewStyleFramePool.getTotalCount();
  for (var i = 0; i < count; i++) {
    viewStyleFramePool.create();
  }
};

// get all animations on a given subject
animate.getSubjectAnimations = function (subject) {
  var anims = subject.__anims || {};
  var animsArray = [];
  for (var id in anims) {
    animsArray.push(anims[id]);
  }
  return animsArray;
};

// clear all animations on a given subject
animate.clearSubjectAnimations = function (subject) {
  var anims = this.getSubjectAnimations(subject);
  for (var i = 0; i < anims.length; i++) {
    anims[i].clear();
  }
};

// commit all animations on a given subject
animate.commitSubjectAnimations = function (subject) {
  var anims = this.getSubjectAnimations(subject);
  for (var i = 0; i < anims.length; i++) {
    anims[i].commit();
  }
};

// pause all animations on a given subject
animate.pauseSubjectAnimations = function (subject) {
  var anims = this.getSubjectAnimations(subject);
  for (var i = 0; i < anims.length; i++) {
    anims[i].pause();
  }
};

// resume all animations on a given subject
animate.resumeSubjectAnimations = function (subject) {
  var anims = this.getSubjectAnimations(subject);
  for (var i = 0; i < anims.length; i++) {
    anims[i].resume();
  }
};

// clear all animations globally
animate.clearAllAnimations = function () {
  for (var id in groups) {
    groups[id].clear();
  }
};

// commit all animations globally
animate.commitAllAnimations = function () {
  for (var id in groups) {
    groups[id].commit();
  }
};

// pause all animations globally
animate.pauseAllAnimations = function () {
  for (var id in groups) {
    groups[id].pause();
  }
};

// resume all animations globally
animate.resumeAllAnimations = function () {
  for (var id in groups) {
    groups[id].resume();
  }
};

// see Group Class notes below
animate.getGroup = function (groupID) {
  return groups[groupID || DEFAULT_GROUP_ID];
};

animate.linear = 1;
animate.easeIn = 2;
animate.easeOut = 3;
animate.easeInOut = 4;
animate.easeInQuad = 5;
animate.easeOutQuad = 6;
animate.easeInOutQuad = 7;
animate.easeInCubic = 8;
animate.easeOutCubic = 9;
animate.easeInOutCubic = 10;
animate.easeInQuart = 11;
animate.easeOutQuart = 12;
animate.easeInOutQuart = 13;
animate.easeInQuint = 14;
animate.easeOutQuint = 15;
animate.easeInOutQuint = 16;
animate.easeInSine = 17;
animate.easeOutSine = 18;
animate.easeInOutSine = 19;
animate.easeInExpo = 20;
animate.easeOutExpo = 21;
animate.easeInOutExpo = 22;
animate.easeInCirc = 23;
animate.easeOutCirc = 24;
animate.easeInOutCirc = 25;
animate.easeInElastic = 26;
animate.easeOutElastic = 27;
animate.easeInOutElastic = 28;
animate.easeInBack = 29;
animate.easeOutBack = 30;
animate.easeInOutBack = 31;
animate.easeInBounce = 32;
animate.easeOutBounce = 33;
animate.easeInOutBounce = 34;

export default animate;
