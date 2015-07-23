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
 */

import lib.Callback as Callback;
import event.Emitter as Emitter;
import animate.transitions as transitions;
import timer;

var DEFAULT_GROUP_ID = "__default_group";
var viewIDCache = {};

exports = function (subject, groupID) {
	// TODO: we have a circular import, so do the Engine import on first use
	if (typeof Engine === 'undefined') {
		import ui.Engine as Engine;
		import ui.View as View;
		import device;
	}

	if (device.useDOM && subject instanceof View && !groupID) {
		return subject.getAnimation();
	}

	// animators created once and cached on subject '__anims' object by groupID
	// so they're only garbage collected when the subject is garbage collected
	groupID = groupID || DEFAULT_GROUP_ID;
	var anims = subject.__anims || (subject.__anims = {});
	var anim = anims[groupID];
	if (!anim) {
		if (subject instanceof View) {
			anim = new ViewAnimator(subject, groupID);
			var viewIDs = viewIDCache[groupID] || (viewIDCache[groupID] = []);
			viewIDs.push(subject.uid);
		} else {
			anim = new Animator(subject, groupID);
		}
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

// used to get/set native or browser ViewAnimator constructors
exports.getViewAnimator = function () { return ViewAnimator; };
exports.setViewAnimator = function (ctor) { ViewAnimator = ctor; };

// class for tracking sets of animations w same groupID across different subjects
var Group = Class(Emitter, function () {
	this.init = function (groupID) {
		this.groupID = groupID;
		this.anims = [];
		this.reset();
	};

	// populate w all active animators w matching groupIDs across any subject
	this.reset = function () {
		var finishCallback = new Callback();
		this._isFinished = false;
		this.anims.length = 0;

		// find all animating view subjects in the group
		var viewIDs = viewIDCache[this.groupID] || [];
		for (var i = 0; i < viewIDs.length; i++) {
			var id = viewIDs[i];
			var view = View.findViewByID(id);
			var anim = view && view.__anims && view.__anims[this.groupID];
			if (anim) {
				this.anims.push(anim);
				anim.once('Finish', finishCallback.chain());
			}
		}

		// find all animating non-view subjects in the group
		var engine = Engine.get();
		var listeners = engine.listeners('Tick');
		for (var i = 0; i < listeners.length; i++) {
			var listener = listeners[i];
			var anim = listener._ctx;
			if (anim
				&& anim.groupID === this.groupID
				&& this.anims.indexOf(anim) === -1)
			{
				this.anims.push(anim);
				anim.once('Finish', finishCallback.chain());
			}
		}

		// when all anims within this group finish, publish a Finish event
		var onGroupFinish = bind(this, '_onGroupFinish');
		if (this.anims.length) {
			finishCallback.run(onGroupFinish);
		} else {
			// if there weren't any active Animators, publish Finish next tick
			this._isFinished = true;
			setTimeout(onGroupFinish, 0);
		}
		return this;
	};

	// called internally when all animations complete
	this._onGroupFinish = function () {
		this._isFinished = true;
		this.publish('Finish');
	};

	// have all the animations in the group completed?
	this.isFinished = function () {
		return this._isFinished;
	};

	// clear all the animations in the group
	this.clear = function () {
		var anims = this.anims;
		for (var i = 0; i < anims.length; i++) {
			anims[i].clear();
		}
		return this;
	};

	// commit all the animations in the group
	this.commit = function () {
		var anims = this.anims;
		for (var i = 0; i < anims.length; i++) {
			anims[i].commit();
		}
		return this;
	};

	// pause all the animations in the group
	this.pause = function () {
		var anims = this.anims;
		for (var i = 0; i < anims.length; i++) {
			anims[i].pause();
		}
		return this;
	};

	// resume all the animations in the group
	this.resume = function () {
		var anims = this.anims;
		for (var i = 0; i < anims.length; i++) {
			anims[i].resume();
		}
		return this;
	};
});

// returns a new Group containing a set of Animators w the same groupID
exports.getGroup = function (groupID) {
	return new Group('' + (groupID || DEFAULT_GROUP_ID));
};

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
	this.init = function (opts) {
		this.subject = opts.subject;
		this.target = opts.target;
		this.duration = opts.duration === 0 ? 0 : (opts.duration || 500);
		this.transition = getTransition(opts.transition);
		this.onTick = opts.onTick;
	};

	this.exec = function () {};
	this.debugLog = function () {};
});

var CallbackFrame = Class(Frame, function () {
	this.init = function (opts) {
		Frame.prototype.init.call(this, opts);
		// CallbackFrames act like tick functions when given durations
		this.duration = opts.duration || 0;
	};

	this.exec = function (tt, t) {
		this.target.apply(this.subject, arguments);
	};
});

// a wait frame is just a frame that does nothing... so don't do anything!
var WaitFrame = Frame;

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
	this.init = function (opts) {
		Frame.prototype.init.call(this, opts);
		this.target = merge({}, this.target);
	};

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
	this.init = function (subject, groupID) {
		this.groupID = groupID;
		this.subject = subject;
		this.clear();
		this._isPaused = false;
	};

	this.clear = function () {
		this._elapsed = 0;
		this._queue = [];
		this._unschedule();
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
			Engine.get().subscribe('Tick', this, 'onTick');
		}
	};

	this._unschedule = function () {
		if (this._isScheduled) {
			this._isScheduled = false;
			Engine.get().unsubscribe('Tick', this, 'onTick');
		}
	};

	this.isPaused = function () { return this._isPaused; };
	this.hasFrames = function () { return !!this._queue[0]; };

	this.wait = function (duration) {
		return this.then(undefined, duration);
	};

	this.buildFrame = function (opts) {
		var targetType = typeof opts.target;
		if (targetType === 'function') {
			return new CallbackFrame(opts);
		} else if (targetType === 'object') {
			return new ObjectFrame(opts);
		} else {
			return new WaitFrame(opts);
		}
	};

	this.now = function (target, duration, transition, onTick) {
		transition = transition || (this._queue[0] ? exports.easeOut : exports.easeInOut);
		this.clear();
		return this.then(target, duration, transition, onTick);
	};

	this.then = function (target, duration, transition, onTick) {
		if (!this._queue.length) {
			this._elapsed = 0;
		}

		this._queue.push(this.buildFrame({
			subject: this.subject,
			target: target,
			duration: duration,
			transition: transition,
			onTick: onTick
		}));
		this._schedule();
		return this;
	};

	this.debug = function () {
		this._debug = true;
		return this;
	};

	this.commit = function () {
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
			p.onTick && p.onTick.call(p.subject, tt, t);

			// remove frame if finished and queue wasn't modified by a callback
			if (frameFinished && p === this._queue[0]) {
				this._queue.shift();
			}

			// if paused during a callback or frame not finished, don't continue
			if (!frameFinished || this._isPaused) { return; }

			p = this._queue[0];
		}

		// nothing left in the queue!
		this._unschedule();
		this._onAnimationFinish();
	};

	// fire a 'Finish' event when all queued frames complete
	this._onAnimationFinish = function () {
		this.publish('Finish');
	};
});

var ViewAnimator = Class(Animator, function () {
	this.buildFrame = function (opts) {
		if (typeof opts.target === 'object') {
			return new ViewStyleFrame(opts);
		} else {
			return Animator.prototype.buildFrame.call(this, opts);
		}
	};
});
