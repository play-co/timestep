
import device from 'device';
import Rect from 'math/geom/Rect';
import View from 'ui/View';

import Matrix from 'platforms/browser/webgl/Matrix2D';

import AnimationData from './AnimationData';

/* TERMINOLOGY
 *
 * Sprite: an image or a rasterized Flash vectorial shape.
 *   Corresponds to an Image object in this implementation.
 *
 * Element: an object equivalent to a Flash element (can be a Sprite or a Symbol)
 *
 * Library: a list of elements.
 *
 * Instance: an element with a particular state (position, color, filter, etc...).
 *
 * Timeline: a list of instances and their frame indexes.
 *
 * Symbol: an element that has a timeline.
 *
 * MovieClip: an instance of a Symbol within a timeline
 *   whose frame is independent from the frame of the timeline it belongs to.
 *
 * Graphic: an instance of a Symbol within a timeline
 *   whose frame is dependent from the frame of the timeline it belongs to.
 *
 * FlashPlayerView (currently named MovieClip): an object that exposes an API to load and play Flash animations.
 *   It has a library, an FPS and a set of API to control and combine Flash animations data.
 *   It also inherits from a timestep View and be handled as such.
 *
 */

class BBox {

  constructor () {
    this.reset();
  }

  reset () {
    this.left = Infinity;
    this.top = Infinity;
    this.right = -Infinity;
    this.bottom = -Infinity;
  }

}

const Canvas = device.get('Canvas');
const canvasPool = [];

const IDENTITY_MATRIX = new Matrix();
const NULL_BOUNDS = new Rect();

var viewCount = 0;
var EMPTY = {};

// TODO: rename to FlashPlayerView
export default class MovieClip extends View {

  constructor (opts) {
    super(opts);

    opts = opts || EMPTY;

    this.id = viewCount++;

    this._elapsed = 0;

    this.frame = 0;
    this.framesElapsed = 0;
    this.looping = false;
    this.frameCount = 0;
    this.isPlaying = false;
    this._animationName = '';

    this._callback = null;
    this._boundsMap = {};

    this._canvas = null;
    this._ctx = null;
    this._frameDirty = true;

    this._library = null;
    this._substitutes = {};

    this._originalTransforms = {};
    this._currentSkin = null;

    this.animation = null;
    this.timeline = null;

    this._bounds = new Rect();
    this._bbox = new BBox();
    this._transform = new Matrix();

    this._nbViewSubstitutions = 0;

    this._url = null;

    this.fps = opts.fps ? opts.fps : 30;
    this.data = opts.data ? opts.data : null;
    this.buffered = opts.buffered ? opts.buffered : null;

    if (!this.data && opts.url) {
      this.url = opts.url;
    }

    if (opts.defaultAnimation) {
      this.loop(opts.defaultAnimation);
    }
  }

  updateOpts (opts) {
    super.updateOpts(opts);

    if (!opts) {
      return;
    }

    if (opts.fps !== undefined) {
      this.fps = opts.fps;
    }

    if (opts.url !== undefined) {
      this.url = opts.url;
    }

    if (opts.buffered !== undefined) {
      this.buffered = !!opts.buffered;
    }
  }

  goto (frameIndex) {
    if (this.frameCount === 0) { return; }
    this.frame = frameIndex % this.frameCount;
    this.framesElapsed = frameIndex;
  }

  render (ctx, transform) {
    if (!this.animation) {
      return;
    }

    if (this._buffered && this._nbViewSubstitutions === 0) {
      // Update and render internal canvas to context
      var bounds = this.getBounds();
      if (bounds === NULL_BOUNDS) {
        return;
      }

      if (this._frameDirty) {
        this.updateCanvasBounds(bounds);
        this._ctx.clear();
        this._transform.setTo(1, 0, 0, 1, -bounds.x, -bounds.y);
        this.animation._wrapRender(this._ctx, this._transform, 1, this.frame, this.framesElapsed, this._substitutes);
        this._frameDirty = false;
      }

      ctx.drawImage(this._canvas, 0, 0, bounds.width, bounds.height, bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      // Render directly to context
      this._transform.copy(transform);
      this.animation._wrapRender(ctx, this._transform, ctx.globalAlpha, this.frame, this.framesElapsed, this._substitutes);
    }
  }

  getBounds (elementID) {
    if (!elementID) {
      var animationBounds = this._boundsMap[this._animationName];
      if (animationBounds) {
        return animationBounds;
      }

      elementID = this._animationName;
    }

    var animation = this._substitutes[elementID] || this._library[elementID];
    this.updateBoundingBox(animation, IDENTITY_MATRIX);

    var bounds = new Rect(0, 0, Infinity, Infinity);
    bounds.x = Math.floor(this._bbox.left);
    bounds.y = Math.floor(this._bbox.top);
    bounds.width = Math.ceil(this._bbox.right - this._bbox.left);
    bounds.height = Math.ceil(this._bbox.bottom - this._bbox.top);

    if (elementID === this._animationName) {
      this._boundsMap[this._animationName] = bounds;
    }

    // TODO: bounds with negative dimensions should be compatible with timestep engine
    if (bounds.width === -Infinity) { bounds.width = 0; }
    if (bounds.height === -Infinity) { bounds.height = 0; }

    return bounds;
  }

  getCurrentBounds (elementID) {
    var animation = this.animation;
    if (elementID) {
      animation = this._substitutes[elementID] || this._library[elementID];
    }

    this.updateCurrentBoundingBox(animation);

    var bounds = new Rect(
      Math.floor(this._bbox.left),
      Math.floor(this._bbox.top),
      Math.ceil(this._bbox.right - this._bbox.left),
      Math.ceil(this._bbox.bottom - this._bbox.top)
    );

    if (bounds.width === -Infinity) { bounds.width = 0; }
    if (bounds.height === -Infinity) { bounds.height = 0; }

    return bounds;
  }

  updateBoundingBox (animation, transform) {
    this._bbox.reset();
    if (!animation || !animation.timeline) {
      return;
    }

    var actualFrame = this.frame;
    var timeline = animation.timeline;
    for (var frame = 0; frame < timeline.length; frame++) {
      animation.expandBoundingBox(this._bbox, transform, frame, frame, this._substitutes);
    }
  }

  expandBoundingBox (boundingBox, transform, frame, framesElapsed, substitutes, currentBounds) {
    if (currentBounds) {
      this.updateCurrentBoundingBox(this.animation);
    } else {
      this.updateBoundingBox(this.animation, transform);
    }

    boundingBox.left = Math.min(this._bbox.left, boundingBox.left);
    boundingBox.top = Math.min(this._bbox.top, boundingBox.top);
    boundingBox.right = Math.max(this._bbox.right, boundingBox.right);
    boundingBox.bottom = Math.max(this._bbox.bottom, boundingBox.left);
  }

  updateCurrentBoundingBox (animation) {
    this._bbox.reset();
    if (!animation) {
      return;
    }

    animation.expandBoundingBox(this._bbox, IDENTITY_MATRIX, this.frame, this.framesElapsed, this._substitutes, true);
  }

  clearBoundsMap () {
    this._boundsMap = {};
  }

  play (animationName, callback, loop) {
    if (!this.data) {
      this.once(MovieClip.LOADED, () => {
        this.play(animationName, callback, loop)
      });
      return;
    }

    this._frameDirty = animationName !== this._animationName;
    this._animationName = animationName;
    this.looping = loop || false;
    this.isPlaying = true;
    this.animation = this._library[animationName];
    this.timeline = this.animation.timeline;
    this.frameCount = this.animation.duration;
    this.frame = 0;
    this.framesElapsed = 0;
    this._callback = callback || null;
  }

  loop (animationName) {
    this.play(animationName, null, true);
  }

  stop () {
    this.isPlaying = false;
  }

  tick (dt) {
    if (!this.animation || !this.isPlaying) {
      return;
    }

    this._elapsed += dt;

    var currentFrame = this.frame;

    while (this._elapsed > this._frameMS) {
      this.frame++;
      this.framesElapsed++;
      this._elapsed -= this._frameMS;
    }

    if (this.frame >= this.frameCount) {
      if (this.looping) {
        this.frame = this.frame % this.animation.duration;
      } else {
        this.frame = this.frameCount > 0 ? this.frameCount - 1 : 0;
        this.stop();
        if (this._callback) {
          var callback = this._callback;
          this._callback = null;
          callback();
        }
      }
    }

    if (this.frame !== currentFrame) {
      this._frameDirty = true;
    }
  }

  updateCanvasBounds (bounds) {
    var canvasNeedsUpdate = this._buffered && bounds.width > 0 &&
      (this._canvas.width !== bounds.width || this._canvas.height !== bounds.height);

    if (canvasNeedsUpdate) {
      this._canvas.width = bounds.width;
      this._canvas.height = bounds.height;
    }
  }

  addViewSubstitution (libraryID, replacement) {
    this._substitutes[libraryID] = replacement;
    this._nbViewSubstitutions += 1;
    this.clearBoundsMap();
  }

  removeViewSubstitution (libraryID) {
    if (this._substitutes[libraryID]) {
      delete this._substitutes[libraryID];
      this._nbViewSubstitutions -= 1;
      this.clearBoundsMap();
    }
  }

  addAnimationSubstitution (libraryID, replacementLibraryID, animationData = null, optional = false) {
    var library = animationData ? animationData.library : this._library;
    var replacement = library[replacementLibraryID];
    if (!optional || replacement) {
      this._substitutes[libraryID] = replacement;
      this.clearBoundsMap();
    }
  }

  removeAnimationSubstitution (libraryID) {
    if (this._substitutes[libraryID]) {
      delete this._substitutes[libraryID];
      this.clearBoundsMap();
    }
  }

  removeAllSubstitutions () {
    this._substitutes = {};
    this.clearBoundsMap();
  }

  addAnimationSubstitutions (libraryIDs, animationData) {
    var library = animationData.library;
    for (var i = 0; i < libraryIDs.length; i++) {
      var libraryID = libraryIDs[i];
      this._substitutes[libraryID] = library[libraryID];
    }
    this.clearBoundsMap();
  }

  substituteAllAnimations (animationData) {
    var library = animationData.library;
    var symbolList = animationData.symbolList;
    for (var s = 0; s < symbolList.length; s += 1) {
      var symbolID = symbolList[s];
      this._substitutes[symbolID] = library[symbolID];
    }
    this.clearBoundsMap();
  }

  setData (data) {
    if (this.data === data) { return; }

    if (data) {
      this.data = data;
      this.fps = this._opts.fps || this.data.frameRate || 30;
      this._url = data.url;
      this._library = data.library;
      this.emit(MovieClip.LOADED);
    } else {
      this.data = null;
      this.animation = null;
    }
  }

  get buffered () {
    return this._buffered;
  }

  set buffered (buffered) {
    if (this._buffered === buffered) { return; }

    this._buffered = buffered;
    this._frameDirty = true;

    if (this.buffered) {
      this._canvas = obtainCanvasFromPool();
      this._ctx = this._canvas.getContext('2d');
    } else if (this._canvas) {
      returnCanvasToPool(this._canvas);
      this._canvas = this._ctx = null;
    }
  }

  get animationList () {
    return this.data && this.data.symbolList || [];
  }

  get fps () {
    return this._fps;
  }

  set fps (fps) {
    this._fps = fps;
    this._frameMS = 1000 / fps;
  }

  get loaded () {
    return !!this.data;
  }

  get url () {
    return this._url;
  }

  set url (url) {
    if (this._url === url) {
      return;
    }

    this._url = url;

    if (!url) { return; }

    var animationData = AnimationData.getAnimation(url);
    if (animationData) {
      this.setData(animationData);
      return;
    }

    AnimationData
      .loadFromURL(url)
      .then(data => {
        if (this._url === url) {
          this.setData(data);
        }
      });
  }
}

function obtainCanvasFromPool () {
  return canvasPool.length > 0 ? canvasPool.pop() : new Canvas({ useWebGL: true });
}

function returnCanvasToPool (canvas) {
  canvasPool.push(canvas);
}

MovieClip.LOADED = 'loaded';

MovieClip.getAnimation = AnimationData.getAnimation;
MovieClip.loadAnimation = AnimationData.loadFromURL;