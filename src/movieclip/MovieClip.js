import { CACHE } from 'base';
import Promise from 'bluebird';
import loader from 'ui/resource/loader';
import loaders from 'ui/resource/primitiveLoaders'
import Image from 'ui/resource/Image';

import Rect from 'math/geom/Rect';
import View from 'ui/View';

import Matrix from 'platforms/browser/webgl/Matrix2D';
import Canvas from 'platforms/browser/Canvas';
import ImageViewCache from 'ui/resource/ImageViewCache';

import AnimationData from './AnimationData';

var LoadRequest = loader.LoadRequest;

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
    var animationBounds = this._boundsMap[this._animationName];
    if (animationBounds) {
      return animationBounds;
    }

    var animation = this.animation;
    elementID = elementID || null;
    this.updateBoundingBox(animation, elementID, IDENTITY_MATRIX);

    var bounds = new Rect(0, 0, Infinity, Infinity);
    bounds.x = Math.floor(this._bbox.left);
    bounds.y = Math.floor(this._bbox.top);
    bounds.width = Math.ceil(this._bbox.right - this._bbox.left);
    bounds.height = Math.ceil(this._bbox.bottom - this._bbox.top);

    if (elementID === null) {
      this._boundsMap[this._animationName] = bounds;
    }

    // TODO: bounds with negative dimensions should be compatible with timestep engine
    if (bounds.width === -Infinity) { bounds.width = 0; }
    if (bounds.height === -Infinity) { bounds.height = 0; }

    return bounds;
  }

  getCurrentBounds (elementID) {
    elementID = elementID || null;
    var animation = this.animation;

    this.updateCurrentBoundingBox(animation, elementID, IDENTITY_MATRIX);

    var left = Math.floor(this._bbox.left);
    var top = Math.floor(this._bbox.top);
    var bounds = new Rect(
      left,
      top,
      Math.ceil(this._bbox.right - left),
      Math.ceil(this._bbox.bottom - top)
    );

    if (bounds.width === -Infinity) { bounds.width = 0; }
    if (bounds.height === -Infinity) { bounds.height = 0; }

    return bounds;
  }

  updateBoundingBox (animation, elementID, transform) {
    this._bbox.reset();
    if (!animation || !animation.timeline) {
      return;
    }

    var actualFrame = this.frame;
    var timeline = animation.timeline;
    for (var frame = 0; frame < timeline.length; frame++) {
      animation.expandBoundingBox(this._bbox, elementID, transform, frame, frame, this._substitutes);
    }
  }

  expandBoundingBox (boundingBox, elementID, transform, frame, framesElapsed, substitutes, currentBounds) {
    if (currentBounds) {
      this.updateCurrentBoundingBox(this.animation, elementID, transform);
    } else {
      this.updateBoundingBox(this.animation, elementID, transform);
    }

    boundingBox.left = Math.min(this._bbox.left, boundingBox.left);
    boundingBox.top = Math.min(this._bbox.top, boundingBox.top);
    boundingBox.right = Math.max(this._bbox.right, boundingBox.right);
    boundingBox.bottom = Math.max(this._bbox.bottom, boundingBox.bottom);
  }

  updateCurrentBoundingBox (animation, elementID, transform) {
    this._bbox.reset();
    if (!animation) {
      return;
    }

    animation.expandBoundingBox(this._bbox, elementID, transform, this.frame, this.framesElapsed, this._substitutes, true);
  }

  clearBoundsMap () {
    this._boundsMap = {};
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

        // make sure this animation exists in the current data
        if (this._library[animationName]) {
          this.play(animationName, callback, loop);
        }
      };

      this.once(MovieClip.LOADED, this._playOnLoadCallback);
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

    this._elapsed += dt * this.speed;

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
      this._url = data.url;
      this.fps = this._opts.fps || this.data.frameRate || 30;
      this._url = data.url;
      this._library = data.library;
      this.emit(MovieClip.LOADED);
    } else {
      this.data = null;
      this.animation = null;
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
    var animationData = getAnimation(url);
    if (animationData) {
      this.setData(animationData);
      return;
    }

    this.setData(null);
    // transition period during which no animation data is attached to this view
    _loadAnimation(url, data => {
      if (this._url !== url) {
        return;
      }
      this.setData(data);
    });
  }
}

function obtainCanvasFromPool () {
  return canvasPool.length > 0 ? canvasPool.pop() : new Canvas({ useWebGL: true });
}

function returnCanvasToPool (canvas) {
  canvasPool.push(canvas);
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
  var animationData = ANIMATION_CACHE[url];
  if (!animationData) {
    // TODO: remove this whole block of code when animations are properly preloaded
    var fullURL = url + '/data.js';

    var dataString = CACHE[fullURL];
    if (dataString) {
      var jsonData = JSON.parse(dataString);

      var imageMap = [];
      var spritesData = jsonData.textureOffsets;
      for (var spriteID in spritesData) {
        var spriteData = spritesData[spriteID];
        var imageURL = spriteData.url;

        imageMap[imageURL] = ImageViewCache.getImage(url + '/' + imageURL);
      }

      animationData = ANIMATION_CACHE[fullURL] = new AnimationData(jsonData, url, imageMap);
    }
  }
  return animationData;
}

function loadAnimationMethod (url, cb, loader, priority, isExplicit) {
  var jsonURL = url + '/data.js';

  loaders.loadJSON(jsonURL, jsonData => {
    if (jsonData === null) {
      return cb && cb(null);
    }

    var imageURLs = [];
    var spritesData = jsonData.textureOffsets;
    var imageNames = [];
    for (var spriteID in spritesData) {
      var spriteData = spritesData[spriteID];
      var imageName = spriteData.url;
      imageNames.push(imageName);
      imageURLs.push(url + '/' + imageName);
    }

    var uniqueImageURLs = [];
    imageURLs.reduce((urls, url) => {
      if (urls.indexOf(url) === -1) { urls.push(url); }
      return urls;
    }, uniqueImageURLs);

    loader.loadImages(uniqueImageURLs, images => {
      var imageMap = {};
      for (var i = 0; i < images.length; i += 1) {
        imageMap[imageNames[i]] = new Image({
          srcImage: images[i],
          url: imageURLs[i]
        });
      }

      var animationData = new AnimationData(jsonData, url, imageMap);
      return cb && cb(animationData);
    }, priority, isExplicit);
  }, loader, priority, isExplicit);
}
loadAnimationMethod.cache = ANIMATION_CACHE;
loader.loadMethods.loadMovieClip = loadAnimationMethod;


function obtainCanvasFromPool () {
  return (canvasPool.length > 0) ? canvasPool.pop() : new Canvas({ useWebGL: true });
}

function returnCanvasToPool (canvas) {
  canvasPool.push(canvas);
}

MovieClip.getAnimation = getAnimation;
MovieClip.loadAnimation = loadAnimation;
MovieClip.loadAnimations = loadAnimations;
MovieClip.animationLoader = loadAnimationMethod;

MovieClip.LOADED = 'loaded';
MovieClip.EMPTY_SYMBOL = AnimationData.EMPTY_SYMBOL;
