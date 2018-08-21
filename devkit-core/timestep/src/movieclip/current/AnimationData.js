import { logger } from 'base';
import Matrix from 'platforms/browser/webgl/Matrix2D';

// -----------------------------------
// AnimationData
// -----------------------------------

// -----------------------------------
// Instance
// -----------------------------------

class Instance {

  constructor (element, frame, transform, color, libraryID) {
    this.element = element;

    // Optional identifiers
    this.libraryID = libraryID || null; // unique symbol identifier (aka actionscript linkage)
    // this.instanceName = instanceName; // unique instance identifier

    this.frame = frame;
    this.transform = transform;
    this.alpha = color[3];
    // TODO: replace alpha with full color transform
    // this.color = null;
  }

}

// -----------------------------------
// Sprite
// -----------------------------------

class Bounds {

  constructor (boundsData) {
    this.x = -boundsData.x;
    this.y = -boundsData.y;
    this.w = boundsData.w;
    this.h = boundsData.h;
  }

}

class Sprite {

  constructor (image, spriteData) {
    this.image = image;
    this.frameCount = 1;
    this.duration = spriteData.duration || 1;
    this.bounds = new Bounds(spriteData);
  }

  _wrapRender (ctx, transform, alpha) {
    if (this.image) {
      ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.tx, transform.ty);
      ctx.globalAlpha = alpha;

      var bounds = this.bounds;
      this.image.renderShort(ctx, bounds.x, bounds.y, bounds.w, bounds.h);
    }
  }

  _expandBoundingBox (boundingBox, elementID, transform) {
    if (elementID !== null) {
      return;
    }

    var left = this.bounds.x;
    var right = this.bounds.x + this.bounds.w;
    var top = this.bounds.y;
    var bottom = this.bounds.y + this.bounds.h;

    var a = transform.a;
    var b = transform.b;
    var c = transform.c;
    var d = transform.d;
    var tx = transform.tx;
    var ty = transform.ty;

    var x0 = left * a + top * c + tx;
    var y0 = left * b + top * d + ty;
    var x1 = right * a + top * c + tx;
    var y1 = right * b + top * d + ty;
    var x2 = left * a + bottom * c + tx;
    var y2 = left * b + bottom * d + ty;
    var x3 = right * a + bottom * c + tx;
    var y3 = right * b + bottom * d + ty;

    boundingBox.left = Math.min(boundingBox.left, x0, x1, x2, x3);
    boundingBox.top = Math.min(boundingBox.top, y0, y1, y2, y3);

    boundingBox.right = Math.max(boundingBox.right, x0, x1, x2, x3);
    boundingBox.bottom = Math.max(boundingBox.bottom, y0, y1, y2, y3);
  }

}

// -----------------------------------
// Symbol
// -----------------------------------

class Symbol {

  constructor (timeline, duration) {
    this.timeline = timeline;
    this.frameCount = timeline.length;
    this.duration = duration || this.frameCount;
    this.transform = new Matrix();
  }

  _wrapRender (ctx, parentTransform, parentAlpha, frame, elapsedFrames, substitutes) {
    var children = this.timeline[frame];

    for (var i = 0; i < children.length; i++) {
      var child = children[i];

      var alpha = parentAlpha * child.alpha;
      var transform = this.transform;
      transform.copy(parentTransform);
      transform.transform(child.transform);

      // Lookup in the substitutes map is slow, trying to avoid it
      var libraryID = child.libraryID;
      var element = libraryID ? (substitutes[libraryID] || child.element) : child.element;

      var childFrame = elapsedFrames;
      var frameCount = element.frameCount;
      if (childFrame >= frameCount) {
        childFrame = childFrame % frameCount;
      }

      // n.b element can be of 3 different types: Symbol, Sprite or MovieClip
      // therefore this method cannot be perfectly optimized by optimizer-compilers
      element._wrapRender(ctx, transform, alpha, childFrame, elapsedFrames, substitutes);
    }
  }

  _expandBoundingBox (boundingBox, elementID, parentTransform, frame, elapsedFrames, substitutes) {
    var children = this.timeline[frame];
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.alpha === 0) {
        // No need to expand bounds to include invisible elements
        continue;
      }

      var transform = this.transform;
      transform.copy(parentTransform);
      transform.transform(child.transform);

      var libraryID = child.libraryID;
      var element = libraryID ? (substitutes[libraryID] || child.element) : child.element;

      var childFrame = elapsedFrames;
      var frameCount = element.frameCount;
      if (childFrame >= frameCount) {
        childFrame = childFrame % frameCount;
      }

      var searchedElementID = (elementID === libraryID) ? null : elementID;
      element._expandBoundingBox(boundingBox, searchedElementID, transform, childFrame, elapsedFrames, substitutes);
    }
  }

}

export default class AnimationData {

  constructor (data, url, images) {
    this.url = url;

    // parsing meta
    // example of meta data:
    // "meta": {
    //   "app": "https://www.npmjs.com/package/jeff",
    //   "version": "0.3.0",
    //   "frameRate": 24,
    //   "frameSize": {
    //       "left": 0,
    //       "right": 1000,
    //       "top": 0,
    //       "bottom": 1500
    //   },
    //   "scale": 1,
    //   "filtering": ["linear", "linear"],
    //   "mipmapCompatible": true,
    //   "prerendered": false
    // }

    var meta = data.meta;
    this.frameRate = meta.frameRate;

    // Pool of transformation and color matrices
    var transformArrays = data.transforms || [];
    var transforms = new Array(transformArrays.length);
    for (var t = 0; t < transformArrays.length; t += 1) {
      var transformArray = transformArrays[t];
      var transform = new Matrix();
      transform.a = transformArray[0];
      transform.b = transformArray[1];
      transform.c = transformArray[2];
      transform.d = transformArray[3];
      transform.tx = transformArray[4];
      transform.ty = transformArray[5];
      transforms[t] = transform;
    }

    var colors = data.colors;

    var symbols = data.symbols;
    this.symbolList = Object.keys(symbols);

    // Exposed symbols can either be substituted or used as substitutes
    this.library = {};
    this.libraryIDs = {};

    // Map of all the Flash elements in the animation data
    var elements = {};

    // TODO: make these properties private
    this.animations = this.library;
    this.animationList = [];

    // Keeping track of image names
    this.imageNames = {};

    // populating library and list of elements with sprites
    var spritesData = data.sprites;
    for (var spriteID in spritesData) {
      var spriteData = spritesData[spriteID];
      var image = images[spriteData.image];
      var sprite = new Sprite(image, spriteData);
      elements[spriteID] = sprite;

      var libraryID = spriteData.className;
      if (libraryID) {
        this.animationList.push(libraryID);
        this.library[libraryID] = sprite;
        this.libraryIDs[spriteID] = libraryID;
      }
    }


    // populating library and list of elements with symbols
    for (var s = 0; s < this.symbolList.length; s += 1) {
      this.processSymbol(symbols, this.symbolList[s], elements, transforms, colors);
    }
  }

  processSymbol (symbols, symbolID, elements, transforms, colors) {
    var symbolData = symbols[symbolID];
    if (!symbolData) {
      logger.warn('Reference to non-existent symbol: ' + symbolID);
    }

    var children = symbolData.children;
    var frameCount = symbolData.frameCount;

    var timeline = new Array(frameCount);
    for (var f = 0; f < timeline.length; f += 1) {
      timeline[f] = [];
    }

    for (var c = children.length - 1; c >= 0; c -= 1) {
      var instanceData = children[c];
      var frames = instanceData.frames;
      var instanceFirstFrame = frames[0];
      var instanceFrameCount = frames[1] - instanceFirstFrame + 1;
      var instanceTransforms = instanceData.transforms;
      var instanceColors = instanceData.colors;
      var elementID = instanceData.id;
      var childLibraryID = this.libraryIDs[elementID];

      for (var frame = 0; frame < instanceFrameCount; frame += 1) {
        var transform = transforms[instanceTransforms[frame]];
        var color = colors[instanceColors[frame]];

        var element = elements[elementID];
        if (!element) {
          this.processSymbol(symbols, elementID, elements, transforms, colors);
          element = elements[elementID];
        }

        var instance = new Instance(element, frame, transform, color, childLibraryID);
        timeline[instanceFirstFrame + frame].push(instance);
      }
    }

    var symbol = new Symbol(timeline);
    elements[symbolID] = symbol;

    var libraryID = symbolData.className;
    if (libraryID) {
      this.animationList.push(libraryID);
      this.library[libraryID] = symbol;
      this.libraryIDs[symbolID] = libraryID;
    }
  }

  getImage (libraryID) {
    var sprite = this.library[libraryID];
    return (sprite && sprite.image) || null;
  }

}

var emptyTimeline = [[]];
AnimationData.EMPTY_SYMBOL = new Symbol(emptyTimeline, 1);
