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

import { merge } from 'base';
import View from 'ui/View';
import ImageView from 'ui/ImageView';
import Image from 'ui/resource/Image';
import loader from 'ui/resource/loader';

var FOREVER = 999999999999;
var GROUPS = {};

var defaults = {
  url: '',
  // specified as a filename prefix, without an animation name or frame count
  groupID: 'default',
  frameRate: 15,
  delay: 0,
  autoStart: false,
  loop: true
};


/**
 * Group class
 */

class Group extends View {

  constructor () {
    super();

    this.sprites = {};
  }

  add (sprite) {
    this.sprites[sprite.uid] = sprite;
  }

  remove (uid) {
    delete this.sprites[uid];
  }

  pause () {
    this._forEachSprite('pause');
  }

  resume () {
    this._forEachSprite('resume');
  }

  stopAnimation () {
    this._forEachSprite('stopAnimation');
  }

  resetAnimation () {
    this._forEachSprite('resetAnimation');
  }

  _forEachSprite (method) {
    for (var i in this.sprites) {
      this.sprites[i][method]();
    }
  }

}

export default class SpriteView extends ImageView {

  constructor (opts) {
    opts = merge(opts, defaults);
    opts.visible = false;

    super(opts);
    this._opts = opts;
    this._animations = {};
    this._iterationsLeft = 0;
    this._callback = null;
    this._currentAnimationName = '';
    this._currentFrame = 0;
    this._dt = 0;
    this._delay = 0;

    this.groupID = '';
    this.frameRate = 0;
    // toggle this flag manually to optimize SpriteViews
    this.onScreen = true;
    this.isPlaying = false;
    this.isPaused = false;

    this.resetAllAnimations(opts);
  }

  resetAllAnimations (opts) {
    this.stopAnimation();

    this._opts = opts = merge(opts, defaults);

    var animations = SpriteView.allAnimations[opts.url];
    var defaultAnimation = opts.defaultAnimation || '';

    this.groupID = opts.groupID;
    this.frameRate = opts.frameRate;

    if (!GROUPS[this.groupID]) {
      GROUPS[this.groupID] = new Group();
    }

    this._animations = {};

    if (opts.sheetData) {
      this.processSheetData(opts);
    } else {
      for (var animName in animations) {
        if (!defaultAnimation) {
          opts.defaultAnimation = defaultAnimation = animName;
        }
        this.addAnimation(animName, animations[animName]);
      }
    }

    if (opts.autoSize && defaultAnimation) {
      var frameImages = this._animations[defaultAnimation].frames;
      if (frameImages[0]) {
        this.style.width = frameImages[0].getWidth();
        this.style.height = frameImages[0].getHeight();
      }
    }

    opts.autoStart && this.startAnimation(defaultAnimation, opts);
  }

  processSheetData (opts) {
    var url = opts.sheetData.url;
    var w = opts.sheetData.width || opts.width;
    var h = opts.sheetData.height || opts.height;
    var ox = opts.sheetData.offsetX || w;
    var oy = opts.sheetData.offsetY || h;
    var sx = opts.sheetData.startX || 0;
    var sy = opts.sheetData.startY || 0;
    var anims = opts.sheetData.anims;

    for (var animName in anims) {
      if (!this._opts.defaultAnimation) {
        this._opts.defaultAnimation = animName;
      }

      var frames = anims[animName];
      this.loadFromSheet(animName, url, w, h, ox, oy, sx, sy, frames);
    }
  }

  loadFromSheet (animName, url, w, h, ox, oy, sx, sy, frames) {
    var frameImages = [];

    for (var i = 0; i < frames.length; i++) {
      frameImages.push(new Image({
        url: url,
        sourceW: w,
        sourceH: h,
        sourceX: sx + frames[i][0] * ox,
        sourceY: sy + frames[i][1] * oy
      }));
    }

    this._animations[animName] = { frames: frameImages };
  }

  addAnimation (animName, frameData) {
    var frameImages = [];

    for (var i = 0; i < frameData.length; i++) {
      frameImages.push(this.getImageFromCache(frameData[i].url));
    }

    this._animations[animName] = { frames: frameImages };
  }

  getFrame (animName, index) {
    return this._animations[animName].frames[index];
  }

  getFrameCount (animName) {
    return this._animations[animName].frames.length;
  }

  getGroup (groupID) {
    return GROUPS[groupID || this.groupID];
  }

  startAnimation (name, opts) {
    opts = opts || {};

    if (opts.randomFrame === true && opts.frame === undefined) {
      opts.frame = Math.random() * this._animations[name].frames.length | 0;
    }

    if (opts.loop === true) {
      opts.iterations = FOREVER;
    }

    this._iterationsLeft = opts.iterations || 1;
    this._callback = opts.callback || null;
    this._currentAnimationName = name;
    this._currentFrame = opts.frame || 0;
    this._dt = 0;
    this._delay = 0;

    if (!this._animations[name]) {
      this.throwAnimationError(name);
    }

    if (!this.isPlaying) {
      this.tick = this._tickSprite;
      GROUPS[this.groupID].add(this);
      this.isPlaying = true;
      this.style.visible = true;
    }

    // align the image for the first time
    this._tickSprite(0);
  }

  stopAnimation () {
    if (this.isPlaying) {
      this.style.visible = false;
      this.tick = null;
      this.isPlaying = false;
      this.isPaused = false;
      GROUPS[this.groupID].remove(this.uid);
    }
  }

  resetAnimation () {
    if (!this._opts.loop) {
      this.stopAnimation();
    } else {
      this.startAnimation(this._opts.defaultAnimation);
    }
  }

  throwAnimationError (name) {
    throw new Error('Animation ' + name + ' does not exist: ' + this._opts.url + '.');
  }

  hasAnimation (name) {
    return !!this._animations[name];
  }

  setFramerate (fps) {
    this.frameRate = fps || 0.00001;
  }

  pause () {
    this.isPaused = true;
  }

  resume () {
    this.isPaused = false;
  }

  _tickSprite (dt) {
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
    var stepTime = 1000 / this.frameRate;
    var frameSteps = dt / stepTime | 0;
    var prevFrame = this._currentFrame;
    this._dt = dt - frameSteps * stepTime;
    this._currentFrame = (this._currentFrame + frameSteps) % anim.frames.length;

    if (this._currentFrame < 0) {
      this._currentFrame += anim.frames.length;
    }

    if (this.onScreen && (frameSteps !== 0 || dt === 0)) {
      // avoid calling setImage as a performance optimization
      this._img = anim.frames[this._currentFrame];
    }

    var iterationsCompleted = (prevFrame + frameSteps) / anim.frames.length | 0;
    if (iterationsCompleted) {
      this._delay = this._opts.delay;
      if (--this._iterationsLeft <= 0) {
        var cb = this._callback;
        this._callback = null;
        this.resetAnimation();
        cb && cb();
      }
    }
  }

}


SpriteView.prototype.defaults = defaults;
SpriteView.allAnimations = {};
SpriteView.getGroup = SpriteView.prototype.getGroup;


(function loadAnimations () {
  // build the animation frame map
  var resourceMap = loader.getMap();
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
      var anim = allAnimations[animKey] || (allAnimations[animKey] = {});
      var frameList = anim[name] || (anim[name] = []);
      var info = resourceMap[k];
      info.url = k;
      frameList.push(info);
    }
  }
}());
