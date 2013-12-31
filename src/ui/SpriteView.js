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
 * @class ui.SpriteView
 * SpriteView pulls out sprited images and renders them at a given FPS
 * interval. A sprite consists of multiple *animations* (walk, run,
 * etc) which themselves consist of multiple *frames*.
 *
 * The sprite system pulls images from a given source format. Given
 * images like the following:
 *
 *     someFolder/spriteName-animationName-0001.png
 *     someFolder/spriteName-animationName-0002.png
 *
 * You'd instantiate a Sprite like so:
 * 
 *     var mySprite = new SpriteView({url: "someFolder/spriteName"})
 * 
 * The SpriteView class automatically find the images associated with that
 * sprite and generates the configuration for each of the animations.
 *
 * Then you would call this to start an animation:
 *
 *     mySprite.startAnimation("animationName");
 *
 * @doc http://doc.gameclosure.com/api/ui-spriteview.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/spriteview.md
 */

import device;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;
import ui.resource.loader;

var SpriteView = exports = Class("SpriteView", ImageView, function (logger, supr) {
	
	this.defaults = {
		url: null, // specified as a filename prefix, without an animation name or frame count
		groupID: "default",
		frameRate: 15,
		delay: 0,
		emitFrameEvents: false,
		autoStart: false,
		loop: true
	};

	var GROUPS = {};

	this.tick = null;

	this.init = function (opts) {
		this._opts = opts = merge(opts, this.defaults);
		opts.visible = false;

		if (DEBUG && device.useDOM) {
			opts['dom:multipleImageNodes'] = true;
		}

		supr(this, 'init', [opts]);

		// toggle this flag manually to optimize SpriteViews
		this.onScreen = true;

		this.resetAllAnimations(opts);
	};

	this.resetAllAnimations = function (opts) {
		this.stopAnimation();

		this._opts = opts = merge(opts, this.defaults);

		var animations = SpriteView.allAnimations[opts.url];
		
		this.groupID = opts.groupID;
		this.frameRate = opts.frameRate;
		
		if (!GROUPS[this.groupID]) {
			GROUPS[this.groupID] = new Group();
		}

		this._animations = {};

		if (opts.sheetData) {
			var w = opts.sheetData.width || opts.width;
			var h = opts.sheetData.height || opts.height;
			for (var animName in opts.sheetData.anims) {
				if (!this._opts.defaultAnimation) {
					this._opts.defaultAnimation = animName;
				}
				this.loadFromSheet(animName, opts.sheetData.url, w, h,
					opts.sheetData.offsetX || w, opts.sheetData.offsetY || h,
					opts.sheetData.startX || 0, opts.sheetData.startY || 0,
					opts.sheetData.anims[animName]);
			}
		} else {
			for (var animName in animations) {
				if (!this._opts.defaultAnimation) {
					this._opts.defaultAnimation = animName;
				}
				this.addAnimation(animName, animations[animName]);
			}
		}

		if (opts.autoSize && this._opts.defaultAnimation) {
			var frameImages = this._animations[this._opts.defaultAnimation].frames;
			if (frameImages[0]) {
				this.style.width = frameImages[0].getWidth();
				this.style.height = frameImages[0].getHeight();
			}
		}

		opts.autoStart && this.startAnimation(this._opts.defaultAnimation, opts);
	};

	this.loadFromSheet = function (animName, sheetUrl, width, height, offsetX, offsetY, startX, startY, frames) {
		var frameImages = [];
		for (var i = 0; i < frames.length; i++) {
			frameImages.push(new Image({
				url: sheetUrl,
				sourceW: width,
				sourceH: height,
				sourceX: startX + frames[i][0] * offsetX,
				sourceY: startY + frames[i][1] * offsetY
			}));
		}
		this._animations[animName] = {
			frames: frameImages
		};
	};

	this.addAnimation = function (animName, frameData) {
		if ( ! isArray(frameData) ) {
			frameData = SpriteView.allAnimations[frameData][animName];
		}
		var frameImages = [];
		for (var i = 0, frame; frame = frameData[i]; i++) {
			if (!device.useDOM) {
				frameImages.push(this.getImageFromCache(frame.url));
			} else {
				frameImages.push(frame.url);
			}
		}
		this._animations[animName] = {
			frames: frameImages
		};
	};
	
	/** Returns a ui.resource.Image for the given animation's frame. */
	this.getFrame = function (animName, index) {
		return this._animations[animName].frames[index];
	};

	/** Returns the number of frames in a given animation. */
	this.getFrameCount = function (animName) {
		return this._animations[animName].frames.length;
	};

	this.getGroup = function (groupID) {
		return GROUPS[groupID || this.groupID];
	};

	/**
	 * Starts an animation. Default options:
	 *     loop: false
	 *     iterations: 1
	 *     callback: null (called at the end of the animation)
	 *     frame: 0 (frame to start on)
	 *     randomFrame: false (start on a random frame of the animation)
	 */
	this.startAnimation = function (name, opts) {
		opts = opts || {};

		if ( opts.randomFrame === true && opts.frame == null ) {
			opts.frame = Math.random() * this._animations[name].frames.length | 0;
		}

		if (opts.loop === true) { opts.iterations = Infinity; }

		this._iterationsLeft = opts.iterations || 1;
		this._callback = opts.callback || null;
		this._currentAnimationName = name;
		this._currentFrame = opts.frame || 0;
		this._dt = 0;
		this._delay = 0;

		if (!this._animations[name]) {
			throw new Error("Animation " + name + " does not exist: " + this._opts.url + ".");
		}

		if (!this.isPlaying) {
			this.tick = this._tickSprite;
			GROUPS[this.groupID].add(this);
			this.isPlaying = this.running = true;
			this.style.visible = true;
		}

		// align the image for the first time
		this._tickSprite(0);
	};

	/** Stops the current animation. This will make the sprite invisible. */
	this.stopAnimation = function () {
		if (this.isPlaying) {
			this.style.visible = false;
			this.tick = null;
			this.isPlaying = this.running = false;  //use isPlaying, this.running is deprecated
			this.isPaused = this._isPaused = false; //use isPaused instead, _isPaused is deprecated
			GROUPS[this.groupID].remove(this.uid);
		}
	};

	/**
	 * If this animation doesn't loop, stops the animation entirely.
	 * Otherwise restarts the default animation. For instance, if you
	 * had a default animation "idle", you could call
	 *
	 *     startAnimation('walk', {iterations: 2});
	 *
	 * and after 2 iterations of the 'walk' animation, it would go
	 * back to the 'walk' animation.
	 */
	this.resetAnimation = function () {
		if (!this._opts.loop) {
			this.stopAnimation();
		} else {
			this.startAnimation(this._opts.defaultAnimation);
		}
	};

	this.setFramerate = function (fps) {
		this.frameRate = fps || 0.00001;
	};

	this.pause = function () {
		this.isPaused = this._isPaused = true;
	};

	this.resume = function () {
		this.isPaused = this._isPaused = false;
	};

	this._tickSprite = function (dt) {
		if (this.isPaused) { return; }

		dt += this._dt;

		if (this._delay) {
			this._delay -= dt;
			if (this._delay < 0) {
				this._delay = 0;
			}
			return;
		}

		var anim = this._animations[this._currentAnimationName];
		var stepTime = (1000 / this.frameRate);
		var frameSteps = dt / stepTime | 0;
		var prevFrame = this._currentFrame;
		this._dt = dt - frameSteps * stepTime;
		this._currentFrame = (this._currentFrame + frameSteps) % anim.frames.length;

		if (this._currentFrame < 0) {
			this._currentFrame += anim.frames.length;
		}

		if (this.onScreen && (frameSteps !== 0 || dt === 0)) {
			var image = this._animations[this._currentAnimationName].frames[this._currentFrame];
			this.setImage(image);

			if (this._opts.emitFrameEvents) {
				for (var i = 0; i < frameSteps; i++) {
					var frame = (prevFrame + i) % anim.frames.length;
					this.publish(this._currentAnimationName + '_' + frame);
				}
			}
		}

		var iterationsCompleted = (prevFrame + frameSteps) / anim.frames.length | 0;
		if (iterationsCompleted) {
			this._delay = this._opts.delay;
			if (--this._iterationsLeft <= 0) {
				var cb = this._callback;
				this._callback = null;

				this.resetAnimation();
				if (cb) cb();
			}
		}
	};
});

SpriteView.allAnimations = {};
SpriteView.getGroup = SpriteView.prototype.getGroup;

(function loadAnimations() {
	// build the animation frame map
	var resourceMap = ui.resource.loader.getMap();
	var allAnimations = SpriteView.allAnimations;

	// Generate the animations from the filenames in resourceMap.
	// These names must be sorted ascending so that the frames end up
	// in the correct order.
	var filenames = Object.keys(resourceMap);
	filenames.sort();

	// Based on the filenames, add each image to an animation map (where applicable).
	for (var i in filenames) {
		var k = filenames[i];
		// split a filename like this: /resources/images/creature-walking-0001.png
		//       into parts like this: '    animKey     '  name  ' anim  ' #  '
		var match = /((?:.*)\/.*?)[-_ ](.*?)[-_ ](\d+)/.exec(k);
		if (match) {
			var animKey = match[1];
			var name = match[2];
			var frameNumber = match[3];
			var anim = (allAnimations[animKey] || (allAnimations[animKey] = {}));
			var frameList = (anim[name] || (anim[name] = []));
			var info = resourceMap[k];
			info.url = k;
			frameList.push(info);
		}
	}
})();


/**
 * Group class
 */
var Group = Class(jsio.__filename, function (logger) {

	this.init = function () {
		this.sprites = {};
	};

	this.add = function (sprite) {
		this.sprites[sprite.uid] = sprite;
	};

	this.remove = function (uid) {
		delete this.sprites[uid];
	};

	this.pause = function () {
		this._forEachSprite('pause');
	};

	this.resume = function () {
		this._forEachSprite('resume');
	};

	this.stopAnimation = function () {
		this._forEachSprite('stopAnimation');
	};

	this.resetAnimation = function () {
		this._forEachSprite('resetAnimation');
	};

	this._forEachSprite = function (method) {
		for (var i in this.sprites) {
			this.sprites[i][method]();
		}
	};
});
