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

import event.Emitter as Emitter;
import animate.transitions as transitions;
import timer;

var anim_uid = 0;

exports = function (subject, groupId) {

	// TODO: we have a circular import, so do the Engine import on first use
	if (typeof Engine == 'undefined') {
		import ui.Engine as Engine;
		import ui.View as View;
		import device;
	}

	if (device.useDOM && subject instanceof View && !groupId) {
		return subject.getAnimation();
	}

	var groupId = groupId || 0,
		group = groups[groupId] || (groups[groupId] = new Group()),
		animID = subject.__anim_id || (subject.__anim_id = '__anim_' + (++anim_uid)),
		anim = group.get(animID);

	if (!anim) {
		anim = subject instanceof View
				? new ViewAnimator(subject, group)
				: new Animator(subject, group);

		group.add(animID, anim);
	}

	return anim;
}

exports.getViewAnimator = function () {
	return ViewAnimator;
};

exports.setViewAnimator = function (ctor) {
	ViewAnimator = ctor;
};

var Group = Class(Emitter, function (supr) {
	this.init = function () {
		this._anims = {};
		this._pending = [];
	};

	this.get = function (id) { return this._anims[id]; };

	this.add = function (id, q) {
		this._anims[id] = q;
		q.id = id;
		return q;
	};

	this.isActive = function () {
		for (var id in this._anims) {
			if (this._anims[id].hasFrames()) { return true; }
		}

		return false;
	};

	this.onAnimationFinish = function (anim) {
		delete this._anims[anim.id];

		if (!this.isActive()) {
			// if called from a Finish event, republish it
			this.publish('Finish');
		}
	};
});

var groups = {
	0: new Group()
};

exports.getGroup = function (i) {
	return groups[i || 0];
};

var TRANSITIONS = [
	transitions.easeInOut,         // 0: default
	transitions.linear,            // 1
	transitions.easeIn,            // 2
	transitions.easeOut,           // 3
	transitions.easeInOut,         // 4
	transitions.easeInQuad,        // 5: this was previously "bounce" but that appeared unfinished
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
exports.easeInQuad        = 5; // this was previously "bounce" but that appeared unfinished
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
}

var Frame = Class(function () {
	this.init = function (opts) {
		this.subject = opts.subject;
		this.target = opts.target;
		this.duration = opts.duration || 0;
		this.transition = getTransition(opts.transition);
		this.onTick = opts.onTick;
	};

	this.exec = function () {};
	this.onInterrupt = function () {};
});

var CallbackFrame = Class(Frame, function () {
	this.exec = function (tt, t) {
		this.target.apply(this.subject, arguments);
	};
});

// a wait frame is just a frame that does nothing... so we
// don't need to do anything!
var WaitFrame = Frame;

var ObjectFrame = Class(Frame, function () {
	this.exec = function (tt, t, debug) {
		if (!this.base) {
			this.base = {};
			for (var key in this.target) {
				this.base[key] = this.subject[key];
			}
		}

		for (var key in this.target) {
			this.subject[key] = (this.target[key] - this.base[key]) * tt + this.base[key];
		}

		if (debug) {
			var changed = {};
			for (var key in this.target) {
				changed[key] = this.subject[key] + ' -> ' + this.target[key];
			}
			logger.log(this.duration, tt, JSON.stringify(changed));
		}
	};
});

// a ViewStyleFrame updates a view's style in exec
var ViewStyleFrame = Class(Frame, function () {

	this._resolvedDeltas = false;

	this.init = function (opts) {
		this.subject = opts.subject;
		this.target = merge({}, opts.target);
		this.duration = opts.duration === 0 ? 0 : (opts.duration || 500);
		this.transition = getTransition(opts && opts.transition);
		this.onTick = opts.onTick;
	};

	this.resolveDeltas = function (againstStyle) {
		var style = this.target;
		this._resolvedDeltas = true;
		for (var key in style) {
			var baseKey = key.substring(1);
			if (key.charAt(0) == 'd' && !(key in againstStyle) && (baseKey in againstStyle)) {
				style[baseKey] = style[key] + againstStyle[baseKey];
				delete style[key];
			}
		}
	};

	this.exec = function (tt, t, debug) {
		var oldStyle = this._baseStyle || (this._baseStyle = this.subject.style.copy()),
			newStyle = this.target;

		if (!this._resolvedDeltas) { this.resolveDeltas(this._baseStyle); }

		var oldStyle = this._baseStyle;
		for (var key in newStyle) {
			if (key in oldStyle) {
				this.subject.style[key] = (newStyle[key] - oldStyle[key]) * tt + oldStyle[key];
			}
		}

		// this.subject.needsRepaint();

		if (debug) {
			var changed = {};
			for (var key in newStyle) {
				changed[key] = this.subject.style[key] + ' -> ' + newStyle[key];
			}
			logger.log(timer.now, this.duration, tt, JSON.stringify(changed));
		}
	};

	this.onInterrupt = function (newFrame) {
		// var preStyle = this.subject.style.copy();

		// You might want to resolve any deltas against the post-committed style.
		// But I think this should be off by default.  You can commit the style,
		// resolve your deltas, then restore the old style yourself if you want.
		// I don't think you _always_ want this to be the behavior?
		//
		// this.commit(true);
		// newFrame.resolveDeltas(this.subject.style);

		// If you're animating multiple properties, and you've only
		// interrupted some of them, you may want the rest to continue.
		// This only looks good if the timing is the same too -- to do
		// this properly, you'd have to branch animations based on the
		// style property being animated...
		//
		// for (var i in ViewStyle.keys) {
		// 	if (postCommitStyle[i] != preStyle[i] && !(i in newStyle)) {
		// 		newStyle[i] = postCommitStyle[i];
		// 	}
		// }

		// this.subject.style.update(preStyle);
	};
});

var Animator = exports.Animator = Class(Emitter, function () {
	this.init = function (subject, group) {
		this.subject = subject;
		this._group = group;
		this.clear();
		this._isPaused = false;
	};

	this.clear = function () {
		this._elapsed = 0;
		this._queue = [];
		this._unschedule();
		return this;
	};

	// this.getQueue = function () { return this._queue; }

	// Careful: pause will *not* fire the finish event, so anything pending the end of the
	// animation will have to wait until the animation is resumed.
	this.pause = function () {
		if (!this._isPaused) {
			this._isPaused = true;
			this._unschedule();
		}
	};

	this.resume = function () {
		if (this._isPaused) {
			this._isPaused = false;
			this._schedule();
		}
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
		return this.then(new WaitFrame({duration: duration}));
	};

	this.buildFrame = function (opts) {
		if (typeof opts.target == 'function') {
			return new CallbackFrame(opts);
		}

		if (typeof opts.target == 'object') {
			return new ObjectFrame(opts);
		}

		return new WaitFrame(opts);
	};

	this.now = function (target, duration, transition, onTick) {
		transition = transition || (this._queue[0] ? exports.easeOut : exports.easeInOut);

		var nextFrame = target instanceof Frame
				? target
				: this.buildFrame({
						subject: this.subject,
						target: target,
						duration: duration,
						transition: transition,
						onTick: onTick
					});

		var frame = this._queue[0];
		frame && frame.onInterrupt(nextFrame);

		this.clear();
		return this.then(nextFrame);
	};

	this.then = function (target, duration, transition, onTick) {
		var nextFrame = target instanceof Frame
				? target
				: this.buildFrame({
						subject: this.subject,
						target: target,
						duration: duration,
						transition: transition,
						onTick: onTick
					});

		if (!this._queue.length) {
			this._elapsed = 0;
		}

		this._queue.push(nextFrame);
		this._schedule();
		return this;
	};

	this.debug = function () { this._debug = true; return this; };

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

		if (!this._isScheduled) {
			this._group.onAnimationFinish(this);
		}
	};

	this.next = function () {
		var p,
			target;

		if (!this._queue[0]) { return; }

		while ((p = this._queue[0])) {
			var frameFinished = this._elapsed >= p.duration,
				t = frameFinished ? 1 : this._elapsed / p.duration,
				tt = p.transition(t);

			if (frameFinished) {
				this._elapsed -= p.duration;
			}

			try {
				p.exec(tt, t, this._debug);
				if (p.onTick) { p.onTick.call(p.subject, tt, t); }
			} finally {
				// if we haven't modified the queue in a callback, remove the frame if it is finished
				if (frameFinished && p == this._queue[0]) {
					this._queue.shift();
				}

				// if we got paused during a callback or the
				// frame is not finished yet, don't continue
				if (!frameFinished || this._isPaused) { return; }
			}
		}

		// nothing left in the queue!
		this._unschedule();
	};
});

var ViewAnimator = Class(Animator, function (supr) {
	this.buildFrame = function (opts) {
		if (typeof opts.target == 'object') {
			return new ViewStyleFrame(opts);
		}

		return supr(this, 'buildFrame', arguments);
	};
});
