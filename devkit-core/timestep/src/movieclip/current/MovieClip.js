import { logger } from 'base';
import loader from 'ui/resource/loader';
import Image from 'ui/resource/Image';

import Rect from 'math/geom/Rect';
import View from 'ui/View';

import Matrix from 'platforms/browser/webgl/Matrix2D';
import Canvas from 'platforms/browser/Canvas';

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
 * MovieClip: an object that exposes an API to load and play Flash animations.
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

const canvasPool = [];

function obtainCanvasFromPool () {
  return canvasPool.length > 0 ? canvasPool.pop() : new Canvas({ useWebGL: true });
}

function returnCanvasToPool (canvas) {
  canvasPool.push(canvas);
}

const IDENTITY_MATRIX = new Matrix();
const NULL_BOUNDS = new Rect();

var viewCount = 0;
var EMPTY = {};

export default class MovieClip extends View {

  constructor (opts) {
    super(opts);

    opts = opts || EMPTY;

    this.id = viewCount++;

    this._elapsed = 0;

    this.frame = 0;
    this.framesElapsed = 0;
    this.looping = false;
    this.duration = 0;
    this.frameCount = 0;
    this.isPlaying = false;
    this._playOnLoadCallback = null;
    this._animationName = '';

    this._callback = null;
    this._boundsMap = {};

    this._canvas = null;
    this._ctx = null;
    this._frameDirty = true;
    this.speed = 1;

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
    this._data = null;

    this.fps = opts.fps ? opts.fps : 30;
    this.data = opts.data ? opts.data : null;
    this.buffered = opts.buffered ? opts.buffered : null;

    if (!this._data && opts.url) {
      this.url = opts.url;
    }

    if (opts.defaultAnimation) {
      this.loop(opts.defaultAnimation);
    }
  }

  _forceLoad () {
    if (this._url) {
      var url = this._url;
      loadAnimation(url, data => {
        if (this._url !== url) {
          return;
        }
        this.setData(data);
      });
      this._loaded = true;
    }
  }

  _addAssetsToList (assetURLs) {
    if (this._url) {
      // checking if url already presents
      for (var u = 0; u < assetURLs.length; u += 1) {
        var url = assetURLs[u];
        if (typeof url === 'object' && url.url === this._url) {
          // already presents!
          return;
        }
      }

      assetURLs.push({ url: this._url, loadMethod: loadAnimationMethod });
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
    if (this.duration === 0) { return; }
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

  getAnimationBounds (animationName, frame) {
    var currentAnimation = this.animation;
    var currentAnimationName = this._animationName;

    var animation = this._getAnimation(animationName);
    if (!animation) {
      return new Rect(0, 0, 0, 0);
    }

    // substituting animation just to get its bounding box
    this._animationName = animationName;
    this.animation = animation;
    var bounds = this.getBounds(null, frame);

    this.animation = currentAnimation;
    this._animationName = currentAnimationName;

    return bounds;
  }

  getBounds (elementID, frame) {
    if (frame === undefined) {
      frame = null;
    }

    if (!elementID) {
      if (frame === null) {
        var animationBounds = this._boundsMap[this._animationName];
        if (animationBounds) {
          return animationBounds;
        }
      }

      elementID = null;
    }

    this._updateBoundingBox(this.animation, elementID, IDENTITY_MATRIX, frame);

    var bounds = new Rect(0, 0, Infinity, Infinity);
    bounds.x = Math.floor(this._bbox.left);
    bounds.y = Math.floor(this._bbox.top);
    bounds.width = Math.ceil(this._bbox.right - this._bbox.left);
    bounds.height = Math.ceil(this._bbox.bottom - this._bbox.top);

    if (elementID === null && frame === null) {
      this._boundsMap[this._animationName] = bounds;
    }

    // TODO: bounds with negative dimensions should be compatible with timestep engine
    if (bounds.width === -Infinity) { bounds.width = 0; }
    if (bounds.height === -Infinity) { bounds.height = 0; }

    return bounds;
  }

  getCurrentBounds (elementID) {
    return this.getBounds(elementID, this.frame);
  }

  _updateBoundingBox (animation, elementID, transform, frame) {
    this._bbox.reset();
    if (!animation || !animation.frameCount) {
      return;
    }

    if (frame !== null) {
      animation._expandBoundingBox(this._bbox, elementID, transform, frame, frame, this._substitutes);
      return;
    }

    var frameCount = animation.frameCount;
    for (var f = 0; f < frameCount; f++) {
      animation._expandBoundingBox(this._bbox, elementID, transform, f, f, this._substitutes);
    }
  }

  _expandBoundingBox (boundingBox, elementID, transform, frame, framesElapsed) {
    this._updateBoundingBox(this.animation, elementID, transform, framesElapsed);

    boundingBox.left = Math.min(this._bbox.left, boundingBox.left);
    boundingBox.top = Math.min(this._bbox.top, boundingBox.top);
    boundingBox.right = Math.max(this._bbox.right, boundingBox.right);
    boundingBox.bottom = Math.max(this._bbox.bottom, boundingBox.bottom);
  }

  clearBoundsMap () {
    this._boundsMap = {};
  }

  _getAnimation (animationName) {
    var animation = this._substitutes[animationName] || this._library[animationName];

    if (!animation) {
      // Attempt at behavior divergence for error message

      var errorMessage = 'Missing animation: ' + animationName + '. URL: ' + this._url;

      /// #if IS_DEVELOPMENT
      if (MovieClip.crashOnMissingAnimation) {
        throw new Error(errorMessage);
      } else {
        console.error(errorMessage);
      }
      /// #else
      logger.warn(errorMessage);
      /// #endif
    }

    return animation;
  }

  play (animationName, callback, loop) {
    // be sure to remove any pending play callbacks
    if (this._playOnLoadCallback) {
      this.removeListener(MovieClip.LOADED, this._playOnLoadCallback);
      this._playOnLoadCallback = null;
    }

    // if data is not set, we should play as soon as data is loaded
    if (!this.data) {
      // save a reference to our callback so we can unschedule it if necessary
      this._playOnLoadCallback = () => {
        // we scheduled with once, so we can remove this before calling play
        this._playOnLoadCallback = null;
        this.play(animationName, callback, loop);
      };

      this.once(MovieClip.LOADED, this._playOnLoadCallback);
      return;
    }

    var animation = this._getAnimation(animationName);
    if (!animation) {
      // bail if we don't actually find an animation to play
      this.animation = null;
      this.looping = false;
      this.isPlaying = false;
      return;
    }

    this._frameDirty = animationName !== this._animationName;
    this._animationName = animationName;
    this.looping = loop || false;
    this.isPlaying = true;
    this.animation = animation;
    this.timeline = this.animation.timeline;
    this.duration = this.animation.duration;
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

  pause () {
    this.isPlaying = false;
  }

  resume () {
    this.isPlaying = true;
  }

  tick (dt) {
    if (!this.animation || !this.isPlaying) {
      return;
    }

    this._elapsed += dt * this.speed;

    var currentFrame = this.frame;

    while (this._elapsed > this._frameMS) {
      this.frame++;
      this.framesElapsed++;
      this._elapsed -= this._frameMS;
    }

    if (this.framesElapsed >= this.duration && !this.looping) {
      this.frame = this.frameCount > 0 ? this.frameCount - 1 : 0;
      this.stop();
      if (this._callback) {
        var callback = this._callback;
        this._callback = null;
        callback();
      }
    } else if (this.frame >= this.frameCount) {
      this.frame = this.frame % this.frameCount;
    }

    if (this.frame !== currentFrame) {
      this._frameDirty = true;
    }
  }

  getAnimationDuration (animationName) {
    var animation = animationName ? this._getAnimation(animationName) : this.animation;

    // duration in frames
    var duration = animation.duration;

    // returning duration in ms
    return 1000 * duration / this.fps / this.speed;
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
    var animationList = animationData.animationList;
    for (var a = 0; a < animationList.length; a += 1) {
      var animationID = animationList[a];
      this._substitutes[animationID] = library[animationID];
    }
    this.clearBoundsMap();
  }

  setData (data) {
    if (this._data === data) { return; }

    if (data) {
      this._data = data;
      this._url = data.url;
      this.fps = this._opts.fps || this.data.frameRate || 30;
      this._url = data.url;
      this._library = data.library;
      this._loaded = true;
      this.emit(MovieClip.LOADED);
    } else {
      this._data = null;
      this._url = null;
      this.animation = null;
      this._library = null;
      this._loaded = false;
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
    var substituteIDs = Object.keys(this._substitutes);
    var animations = substituteIDs.slice();

    if (this.data && this.data.animationList) {
      var animationList = this.data.animationList;
      for (var a = 0; a < animationList.length; a += 1) {
        var animation = animationList[a];
        if (!this._substitutes[animation]) {
          animations.push(animation);
        }
      }
    }

    return animations;
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

  get data () {
    return this._data;
  }

  set data (data) {
    this.setData(data);
  }

  get url () {
    return this._url;
  }

  set url (url) {
    if (this._url === url) {
      return;
    }

    var animationData = getAnimation(url);
    if (animationData) {
      this.setData(animationData);
      this._url = url;
      return;
    }

    this.setData(null);
    this._url = url;

    // transition period during which no animation data is attached to this view
    _loadAnimation(url, data => {
      if (this._url !== url) {
        return;
      }
      this.setData(data);
    });
  }
}

function _loadAnimation (url, cb, priority, explicit) {
  loader._loadAsset(url, loadAnimationMethod, cb, priority, explicit);
}

function loadAnimation (url, cb, priority) {
  _loadAnimation(url, cb, priority, true);
}

function _loadAnimations (urls, cb, priority, explicit) {
  loader._loadAssets(urls, loadAnimationMethod, cb, priority, explicit);
}

function loadAnimations (urls, cb, priority) {
  _loadAnimations(urls, cb, priority, true);
}

const ANIMATION_CACHE = {};
function getAnimation (url) {
  return ANIMATION_CACHE[url];
}

function loadAnimationMethod (url, cb, loader, priority, isExplicit) {
  loader.loadJSON(url + '/data.json', jsonData => {
    if (jsonData === null) {
      return cb && cb(null);
    }

    var imagePath = url + '/';
    var imageURLs = jsonData.images.map(function (imageURL) {
      return imagePath + imageURL;
    });

    loader.loadImages(imageURLs, domImages => {

      var images = [];
      for (var i = 0; i < domImages.length; i += 1) {
        images[i] = new Image({
          srcImage: domImages[i],
          url: imageURLs[i]
        });
      }

      return cb && cb(new AnimationData(jsonData, url, images));
    }, priority, isExplicit);
  }, priority);
}
loadAnimationMethod.cache = ANIMATION_CACHE;
loader.loadMethods.loadMovieClip = loadAnimationMethod;

/// #if IS_DEVELOPMENT
MovieClip.crashOnMissingAnimation = false;
/// #endif

MovieClip.getAnimation = getAnimation;
MovieClip.loadAnimation = loadAnimation;
MovieClip.loadAnimations = loadAnimations;
MovieClip.animationLoader = loadAnimationMethod;

MovieClip.LOADED = 'loaded';
MovieClip.EMPTY_SYMBOL = AnimationData.EMPTY_SYMBOL;
