
import Matrix from 'platforms/browser/webgl/Matrix2D';

const NULL_ANIMATION = '__none';

// -----------------------------------
// AnimationData
// -----------------------------------

export default class AnimationData {

  constructor (data, url, images) {
    this.url = url;
    this.frameRate = data.frameRate;

    // TODO: simplify export format of skins, symbols, ids and sprites
    // using a reverse hierarchical ordering of symbols
    // for faster data generation

    var transformsBuffer = data.transforms;
    var transformSize = 6;
    var transformCount = transformsBuffer.length / transformSize;
    var transforms = new Array(transformCount);
    for (var t = 0; t < transformCount; t++) {
      var id = t * transformSize;
      var transform = transforms[t] = new Matrix();
      transform.a = transformsBuffer[id];
      transform.b = transformsBuffer[id + 1];
      transform.c = transformsBuffer[id + 2];
      transform.d = transformsBuffer[id + 3];
      transform.tx = transformsBuffer[id + 4];
      transform.ty = transformsBuffer[id + 5];
    }

    var symbols = data.animations;
    this.symbolList = Object.keys(symbols);

    this.library = {};
    // TODO: remove these properties, is used in Cats PropView & CatView
    this.animations = this.library;
    this.animationList = this.symbolList;

    // reference to all instances
    // used to setup quick access to library elements
    var allInstances = [];
    var ids = data.ids;

    // populating library with symbols
    for (var s = 0; s < this.symbolList.length; s += 1) {
      var symbolID = this.symbolList[s];
      var frames = symbols[symbolID];

      var timeline = [];
      for (var f = 0; f < frames.length; f += 1) {
        var instancesData = frames[f];
        var instances = timeline[f] = [];
        for (var i = 0; i < instancesData.length; i += 1) {
          var instanceData = instancesData[i];
          var transform = transforms[instanceData[0]];
          // var instanceType = instanceData[1]; // TODO: remove type info from export data
          var libraryID = ids[instanceData[2]];
          var frame = instanceData[3];
          var alpha = instanceData[4];

          var instance = new Instance(libraryID, frame, transform, alpha);
          instances.push(instance);
          allInstances.push(instance);
        }
      }

      this.library[symbolID] = new Symbol(timeline);
    }

    // adding a null animation to the library
    var emptyTimeline = [[]]; 
    this.library[NULL_ANIMATION] = new Symbol(emptyTimeline);

    // populating library with sprites
    var spritesData = data.textureOffsets;
    for (var spriteID in spritesData) {
      var spriteData = spritesData[spriteID];
      var image = images[spriteData.url];
      this.library[spriteID] = new Sprite(image, spriteData);
    }

    for (var i = 0; i < allInstances.length; i += 1) {
      allInstances[i].linkElement(this.library);
    }
  }

}

// -----------------------------------
// Sprite
// -----------------------------------

class Bounds {

  constructor (boundsData) {
    this.x = boundsData.x;
    this.y = boundsData.y;
    this.width = boundsData.width;
    this.height = boundsData.height;
  }

}

class Sprite {

  constructor (image, spriteData) {
    this.image = image;
    this.bounds = new Bounds(spriteData);
  }

  _wrapRender (ctx, transform, alpha) {
    ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.tx, transform.ty);
    ctx.globalAlpha = alpha;

    var bounds = this.bounds;
    if (this.image) {
      this.image.renderShort(ctx, bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }

  expandBoundingBox (boundingBox, elementID, transform) {
    if (elementID !== null) {
      return;
    }

    var left = this.bounds.x;
    var right = this.bounds.x + this.bounds.width;
    var top = this.bounds.y;
    var bottom = this.bounds.y + this.bounds.height;

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

  constructor (timeline) {
    this.timeline = timeline;
    this.duration = timeline.length;
    // this.className = className // unique symbol identifier, aka actionscript linkage

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


      var childFrame;
      var element = substitutes[child.libraryID];
      if (element) {
        // hack
        // with the current export format it is not possible to determine
        // whether an instance of a symbol is a movie clip or a graphic
        // therefore we consider any element that is substituted
        // as behaving as a movieclip with an independant timeline
        childFrame = child.getFrame(element.duration, elapsedFrames);
      } else {
        element = child.element;
        childFrame = child.getFrame(element.duration, child.frame);
      }

      // n.b element can be of 3 different types: Symnbol, Sprite or FlashPlayerView
      // therefore this method cannot be perfectly optimized by optimizer-compilers
      // also, the lookup in the substitutes map is slow
      element._wrapRender(ctx, transform, alpha, childFrame, elapsedFrames, substitutes);
    }
  }

  expandBoundingBox (boundingBox, elementID, parentTransform, frame, elapsedFrames, substitutes, currentBounds) {
    // TODO: if instance is movie clip, the bounds should include all its frames
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

      var childFrame;
      var childID = child.libraryID;
      var element = substitutes[childID];
      if (element) {
        childFrame = child.getFrame(element.duration, elapsedFrames);
      } else {
        element = child.element;
        childFrame = child.getFrame(element.duration, child.frame);
      }

      var searchedElementID = (elementID === childID) ? null : elementID;
      element.expandBoundingBox(boundingBox, searchedElementID, transform, childFrame, elapsedFrames, substitutes, currentBounds);
    }
  }

}

// -----------------------------------
// Instance
// -----------------------------------

class Instance {

  constructor (libraryID, frame, transform, alpha) {
    // TODO: support all types of identifications
    this.libraryID = libraryID; // id of instantiated element in the library
    // this.instanceName = instanceName; // Optional, only movie clips can have it

    this.frame = frame;
    this.transform = transform;
    this.alpha = alpha;
    // TODO: replace alpha with full color transform
    // this.colorTransform = null;

    this.element = null;

    // this.isMovieClip = isMovieClip;
    // TODO: Handle graphic playing options
    // this.singleFrame = false;
    // this.firstFrame = 0;
    // this.loop = true;
  }

  linkElement (library) {
    this.element = library[this.libraryID];
  }

  getFrame (duration, frame) {
    // instance of graphic
    if (frame >= duration) {
      return frame % duration;
    }

    return frame;

    // TODO: Handle all playing options
    // if (this.singleFrame) {
    //   return this.firstFrame;
    // }

    // var frame = this.firstFrame + this.frame;
    // if (frame >= duration) {
    //   return this.loop ? frame % duration : duration;
    // }

    // return frame;
  }

}

var emptyTimeline = [[]];
AnimationData.EMPTY_SYMBOL = new Symbol(emptyTimeline);
