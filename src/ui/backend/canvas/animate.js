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

import event.Emitter as Emitter;
import animate.transitions as transitions;
import timer;
import ObjectPool;

var engine = null;
var groups = {};
var DEFAULT_GROUP_ID = "__default_group";

exports = function (subject, groupID) {
  // TODO: we have a circular import, so do the Engine import on first use
  if (engine === null) {
    import ui.Engine as Engine;
    import ui.View as View;
    import device;
    engine = Engine.get();
  }

  if (device.useDOM && subject instanceof View && !groupID) {
    return subject.getAnimation();
  }

  // create a group for this groupID if it doesn't exist
  groupID = groupID || DEFAULT_GROUP_ID;
  !groups[groupID] && (groups[groupID] = new Group(groupID));

  // animators created once and cached on subject '__anims' object by groupID
  // so they're only garbage collected when the subject is garbage collected
  var anims = subject.__anims || (subject.__anims = {});
  var anim = anims[groupID];
  if (!anim) {
    anim = subject instanceof View
      ? new ViewAnimator(subject)
      : new Animator(subject);
    anim.groupID = groupID;
    anims[groupID] = anim;
  }

  return anim;
};

// get all animations on a given subject
exports.getSubjectAnimations = function (subject) {
  var anims = subject.__anims || {};
  var animsArray = [];
  for (var id in anims) {
    animsArray.push(anims[id]);
  }
  return animsArray;
};

// clear all animations on a given subject
exports.clearSubjectAnimations = function (subject) {
  var anims = this.getSubjectAnimations(subject);
  for (var i = 0; i < anims.length; i++) {
    anims[i].clear();
  }
};

// commit all animations on a given subject
exports.commitSubjectAnimations = function (subject) {
  var anims = this.getSubjectAnimations(subject);
  for (var i = 0; i < anims.length; i++) {
    anims[i].commit();
  }
};

// pause all animations on a given subject
exports.pauseSubjectAnimations = function (subject) {
  var anims = this.getSubjectAnimations(subject);
  for (var i = 0; i < anims.length; i++) {
    anims[i].pause();
  }
};

// resume all animations on a given subject
exports.resumeSubjectAnimations = function (subject) {
  var anims = this.getSubjectAnimations(subject);
  for (var i = 0; i < anims.length; i++) {
    anims[i].resume();
  }
};

// clear all animations globally
exports.clearAllAnimations = function () {
  for (var id in groups) {
    groups[id].clear();
  }
};

// commit all animations globally
exports.commitAllAnimations = function () {
  for (var id in groups) {
    groups[id].commit();
  }
};

// pause all animations globally
exports.pauseAllAnimations = function () {
  for (var id in groups) {
    groups[id].pause();
  }
};

// resume all animations globally
exports.resumeAllAnimations = function () {
  for (var id in groups) {
    groups[id].resume();
  }
};

// see Group Class notes below
exports.getGroup = function (groupID) {
  return groups[groupID || DEFAULT_GROUP_ID];
};

/**
 * Group Class
 * - a collection of animations by groupID across different subjects
 * - accessed by animate.getGroup()
 * - subscribe to the 'Finish' event to fire a callback when
 *     all animations in the group are complete or cleared, for example:
 *     myGroup.once('Finish', function () { ... });
 * - exposes clear, commit, pause, and resume to apply to all group animations
 */
var Group = Class(Emitter, function () {
  this.init = function (groupID) {
    this.groupID = groupID + '';
    this.anims = [];
  };

  // add an active animator to the group
  this.add = function (anim) {
    if (this.anims.indexOf(anim) === -1) {
      this.anims.push(anim);
    }
  };

  // remove an inactive animator from the group
  this.remove = function (anim) {
    var index = this.anims.indexOf(anim);
    if (index !== -1) {
      this.anims.splice(index, 1);

      // fire Finish event after final animation removed
      if (this.anims.length === 0) {
        this.publish('Finish');
      }
    }
  };

  // are there any active animators in the group?
  this.isActive = function () {
    return this.anims.length > 0;
  };

  // clear all the animators in the group
  this.clear = function () {
    var anims = this.anims;
    for (var i = anims.length - 1; i >= 0; i--) {
      anims[i].clear();
    }
    return this;
  };

  // commit all the animators in the group
  this.commit = function () {
    var anims = this.anims;
    for (var i = anims.length - 1; i >= 0; i--) {
      anims[i].commit();
    }
    return this;
  };

  // pause all the animators in the group
  this.pause = function () {
    var anims = this.anims;
    for (var i = anims.length - 1; i >= 0; i--) {
      anims[i].pause();
    }
    return this;
  };

  // resume all the animators in the group
  this.resume = function () {
    var anims = this.anims;
    for (var i = anims.length - 1; i >= 0; i--) {
      anims[i].resume();
    }
    return this;
  };
});

var TRANSITIONS = [
  transitions.easeInOut,         // 0: default
  transitions.linear,            // 1
  transitions.easeIn,            // 2
  transitions.easeOut,           // 3
  transitions.easeInOut,         // 4
  transitions.easeInQuad,        // 5
  transitions.easeOutQuad,       // 6
  transitions.easeInOutQuad,     // 7
  transitions.easeInCubic,       // 8
  transitions.easeOutCubic,      // 9
  transitions.easeInOutCubic,    // 10
  transitions.easeInQuart,       // 11
  transitions.easeOutQuart,      // 12
  transitions.easeInOutQuart,    // 13
  transitions.easeInQuint,       // 14
  transitions.easeOutQuint,      // 15
  transitions.easeInOutQuint,    // 16
  transitions.easeInSine,        // 17
  transitions.easeOutSine,       // 18
  transitions.easeInOutSine,     // 19
  transitions.easeInExpo,        // 20
  transitions.easeOutExpo,       // 21
  transitions.easeInOutExpo,     // 22
  transitions.easeInCirc,        // 23
  transitions.easeOutCirc,       // 24
  transitions.easeInOutCirc,     // 25
  transitions.easeInElastic,     // 26
  transitions.easeOutElastic,    // 27
  transitions.easeInOutElastic,  // 28
  transitions.easeInBack,        // 29
  transitions.easeOutBack,       // 30
  transitions.easeInOutBack,     // 31
  transitions.easeInBounce,      // 32
  transitions.easeOutBounce,     // 33
  transitions.easeInOutBounce    // 34
];

exports.linear            = 1;
exports.easeIn            = 2;
exports.easeOut           = 3;
exports.easeInOut         = 4;
exports.easeInQuad        = 5;
exports.easeOutQuad       = 6;
exports.easeInOutQuad     = 7;
exports.easeInCubic       = 8;
exports.easeOutCubic      = 9;
exports.easeInOutCubic    = 10;
exports.easeInQuart       = 11;
exports.easeOutQuart      = 12;
exports.easeInOutQuart    = 13;
exports.easeInQuint       = 14;
exports.easeOutQuint      = 15;
exports.easeInOutQuint    = 16;
exports.easeInSine        = 17;
exports.easeOutSine       = 18;
exports.easeInOutSine     = 19;
exports.easeInExpo        = 20;
exports.easeOutExpo       = 21;
exports.easeInOutExpo     = 22;
exports.easeInCirc        = 23;
exports.easeOutCirc       = 24;
exports.easeInOutCirc     = 25;
exports.easeInElastic     = 26;
exports.easeOutElastic    = 27;
exports.easeInOutElastic  = 28;
exports.easeInBack        = 29;
exports.easeOutBack       = 30;
exports.easeInOutBack     = 31;
exports.easeInBounce      = 32;
exports.easeOutBounce     = 33;
exports.easeInOutBounce   = 34;

function getTransition(n) {
  return (typeof n == 'function' ? n : TRANSITIONS[n | 0]);
};

var Frame = Class(function () {
  this.init = function () {
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
  };

  this.reset = function (subject, target, duration, transition) {
    this.subject = subject;
    this.target = target;
    this.duration = duration === 0 ? 0 : (duration || 500);
    this.transition = getTransition(transition);
    this.base = null;
    this._baseStyle = null;
    if (this.duration < 0) {
      throw new Error("Animations cannot have negative durations!");
    }
  };

  this.recycle = function () {
    this.pool.release(this);
  };

  this.exec = function (tt, t, debug) {};
  this.debugLog = function (tt) {};
});

var CallbackFrame = Class(Frame, function () {
  var supr = Frame.prototype;

  this.reset = function (subject, target, duration, transition) {
    supr.reset.call(this, subject, target, duration, transition);
    // CallbackFrames act like tick functions when given durations
    this.duration = duration || 0;
  };

  this.exec = function (tt, t, debug) {
    this.target.call(this.subject, tt, t, debug);
  };
});

var ObjectFrame = Class(Frame, function () {
  this.exec = function (tt, t, debug) {
    // set starting values on first execution
    if (!this.base) {
      this.base = {};
      for (var key in this.target) {
        this.base[key] = this.subject[key];
      }
    }

    for (var key in this.target) {
      var baseValue = this.base[key];
      this.subject[key] = baseValue + tt * (this.target[key] - baseValue);
    }
    debug && this.debugLog(tt);
  };

  this.debugLog = function (tt) {
    var changed = {};
    for (var key in this.target) {
      changed[key] = this.subject[key] + ' -> ' + this.target[key];
    }
    logger.log(this.duration, tt, JSON.stringify(changed));
  };
});

// a ViewStyleFrame updates a view's style in exec
var ViewStyleFrame = Class(Frame, function () {
  this.resolveDeltas = function (againstStyle) {
    var style = this.target;
    for (var key in style) {
      var baseKey = key.substring(1);
      if (key.charAt(0) == 'd'
        && !(key in againstStyle)
        && (baseKey in againstStyle))
      {
        style[baseKey] = style[key] + againstStyle[baseKey];
        delete style[key];
      }
    }
  };

  this.exec = function (tt, t, debug) {
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
    debug && this.debugLog(tt);
  };

  this.debugLog = function (tt) {
    var changed = {};
    var newStyle = this.target;
    var viewStyle = this.subject.style;
    for (var key in newStyle) {
      changed[key] = viewStyle[key] + ' -> ' + newStyle[key];
    }
    logger.log(timer.now, this.duration, tt, JSON.stringify(changed));
  };
});

var Animator = exports.Animator = Class(Emitter, function () {
  this.init = function (subject) {
    this.subject = subject;
    this._queue = [];
    this._elapsed = 0;
    this._isPaused = false;
    this._isScheduled = false;
    this._debug = false;
  };

  this.clear = function () {
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
  };

  // Careful: pause will *not* fire the finish event, so anything pending the end of the
  // animation will have to wait until the animation is resumed.
  this.pause = function () {
    if (!this._isPaused) {
      this._isPaused = true;
      this._unschedule();
    }
    return this;
  };

  this.resume = function () {
    if (this._isPaused) {
      this._isPaused = false;
      this._schedule();
    }
    return this;
  };

  this._schedule = function () {
    if (!this._isScheduled) {
      this._isScheduled = true;
      engine.subscribe('Tick', this, 'onTick');
    }
  };

  this._unschedule = function () {
    if (this._isScheduled) {
      this._isScheduled = false;
      engine.unsubscribe('Tick', this, 'onTick');
    }
  };

  this.isPaused = function () { return this._isPaused; };
  this.hasFrames = function () { return !!this._queue[0]; };

  this.wait = function (duration) {
    return this.then(undefined, duration);
  };

  this.buildFrame = function (target, duration, transition) {
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
  };

  this.now = function (target, duration, transition) {
    this.clear();
    return this.then(target, duration, transition);
  };

  this.then = function (target, duration, transition) {
    if (!this._queue.length) {
      this._elapsed = 0;
    }

    this._queue.push(this.buildFrame(target, duration, transition));
    this._schedule();
    this._addToGroup();
    return this;
  };

  this.debug = function () {
    this._debug = true;
    return this;
  };

  this.commit = function () {
    this.resume();
    this._elapsed = 0;
    for (var i = 0, p; p = this._queue[i]; ++i) {
      this._elapsed += p.duration;
    }

    this.next();
    return this;
  };

  this.onTick = function (dt) {
    if (!this._isScheduled) {
      return;
    }

    this._elapsed += dt;
    this.next();
  };

  this.next = function () {
    var p = this._queue[0];
    while (p) {
      var duration = p.duration;
      var frameFinished = this._elapsed >= duration;
      var t = frameFinished ? 1 : this._elapsed / duration;
      var tt = p.transition(t);

      if (frameFinished) {
        this._elapsed -= duration;
      }

      p.exec(tt, t, this._debug);

      // remove frame if finished and queue wasn't modified by a callback
      if (frameFinished && p === this._queue[0]) {
        var frame = this._queue.shift();
        frame.recycle();
      }

      // if paused during a callback or frame not finished, don't continue
      if (!frameFinished || this._isPaused) { return; }

      p = this._queue[0];
    }

    // nothing left in the queue!
    this._unschedule();
    this._removeFromGroup();
  };

  this._addToGroup = function () {
    var group = groups[this.groupID];
    group && group.add(this);
  };

  this._removeFromGroup = function () {
    var group = groups[this.groupID];
    group && group.remove(this);
  };
});

var ViewAnimator = Class(Animator, function () {
  var supr = Animator.prototype;

  this.buildFrame = function (target, duration, transition) {
    if (typeof target === 'object') {
      var frame = viewStyleFramePool.obtain();
      frame.pool = viewStyleFramePool;
      frame.reset(this.subject, target, duration, transition);
      return frame;
    } else {
      return supr.buildFrame.call(this, target, duration, transition);
    }
  };
});

// used to get/set native or browser ViewAnimator constructors
exports.getViewAnimator = function () { return ViewAnimator; };
exports.setViewAnimator = function (ctor) { ViewAnimator = ctor; };



// pool frame classes to minimize mem allocation and garbage collection
var framePool = new ObjectPool({ ctor: Frame });
var objectFramePool = new ObjectPool({ ctor: ObjectFrame });
var callbackFramePool = new ObjectPool({ ctor: CallbackFrame });
var viewStyleFramePool = new ObjectPool({ ctor: ViewStyleFrame });

// API for pre-populating frame pools
//   this is useful if you plan on launching many animations at once
exports.initializeFrameCount = function (count) {
  count -= framePool.getTotalCount();
  for (var i = 0; i < count; i++) {
    framePool.create();
  }
};

exports.initializeObjectFrameCount = function (count) {
  count -= objectFramePool.getTotalCount();
  for (var i = 0; i < count; i++) {
    objectFramePool.create();
  }
};

exports.initializeCallbackFrameCount = function (count) {
  count -= callbackFramePool.getTotalCount();
  for (var i = 0; i < count; i++) {
    callbackFramePool.create();
  }
};

exports.initializeViewStyleFrameCount = function (count) {
  count -= viewStyleFramePool.getTotalCount();
  for (var i = 0; i < count; i++) {
    viewStyleFramePool.create();
  }
};
