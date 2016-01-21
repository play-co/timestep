import cache.LRUCache as LRUCache;
import lib.PubSub as PubSub;

var WebGLTextureManager = Class(PubSub, function() {

  var CACHE_SIZE = 65535;
  var CACHE_UID = 1;
  var BYTES_PER_PIXEL = 4;
  var MAX_TEXTURE_BYTES = 256 * 1024 * 1024;
  var MAX_TEXTURE_DUMP_ITERATIONS = 5;

  var pow = Math.pow;
  var ceil = Math.ceil;
  var log = Math.log;

  var LOG_2 = log(2);

  this.init = function() {
    this.textureDataCache = new LRUCache(CACHE_SIZE);
    this.textureByteCount = 0;
    this.memoryLimit = MAX_TEXTURE_BYTES;
  };

  this.initGL = function(ctx) {
    this.gl = ctx;
    this.reloadTextures();
  };

  this.getTexture = function(id) {
    var textureData = this.textureDataCache.get(id);
    return textureData ? textureData.texture : null;
  };

  this.getTextureData = function(id) {
    var textureData = this.textureDataCache.get(id);
    return textureData || null;
  };

  this.deleteTextureForImage = function(image) {
    if (image.__GL_ID !== undefined) {
      this.deleteTexture(image.__GL_ID);
    }
  };

  this.deleteTexture = function(id) {
    this.emit(WebGLTextureManager.TEXTURE_REMOVED);
    var textureData = this.textureDataCache.remove(id);
    if (textureData) {
      this.gl.deleteTexture(textureData.texture);
      this.removeFromByteCount(textureData.width, textureData.height);
      textureData.image.__GL_ID = undefined;
    }
  };

  this.createOrUpdateTexture = function(image, id) {
    var gl = this.gl;
    if (!gl) { return -1; }

    var width = image.width;
    var height = image.height;

    if (!image.dispose) {
      image.dispose = bind(this, function() {
        this.deleteTextureForImage(image);
      });
    }

    if (width === 0 || height === 0) {
      throw new Error("Image cannot have a width or height of 0.");
    }

    if (id === undefined) {
      id = image.__GL_ID !== undefined ? image.__GL_ID : CACHE_UID++;
    }

    image.__GL_ID = id;

    var textureDataEntry = this.textureDataCache.find(id);
    var textureData = textureDataEntry ? textureDataEntry.value : null;
    var needsAddByteCount = false;

    // No data exists for id, create new entry
    if (!textureData) {
      textureData = {
        image: image,
        isImg: image instanceof Image,
        isCanvas: image instanceof HTMLCanvasElement,
        width: width,
        height: height,
        texture: gl.createTexture()
      };

      gl.bindTexture(gl.TEXTURE_2D, textureData.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.textureDataCache.put(id, textureData);
      needsAddByteCount = true;
    } else {
      gl.bindTexture(gl.TEXTURE_2D, textureData.texture);
    }

    if (textureData.width !== width || textureData.height !== height) {
      this.removeFromByteCount(textureData.width, textureData.height);
      textureData.width = width;
      textureData.height = height;
      needsAddByteCount = true;
    }

    if (textureData.image !== image) {
      textureData.image.__GL_ID = undefined;
      textureData.image = image;
      textureData.isImg = image instanceof Image;
      textureData.isCanvas = image instanceof HTMLCanvasElement;
    }

    if (textureData.isImg || textureData.isCanvas) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    if (needsAddByteCount) {
      this.addToByteCount(width, height);
    }

    return id;
  };

  this.reloadTextures = function() {
    var imagesToLoad = [];
    this.textureDataCache.forEach(function(key, value) {
      if (value.isImg || value.isCanvas) {
        imagesToLoad.push(value.image);
      }
    }, this);
    this.textureDataCache.removeAll();
    this.textureByteCount = 0;
    for (var i = 0, len = imagesToLoad.length; i < len; i++) {
      this.createOrUpdateTexture(imagesToLoad[i]);
    }
  };

  this.addToByteCount = function(width, height) {
    width = this.nextPowerOfTwo(width);
    height = this.nextPowerOfTwo(height);
    this.textureByteCount += width * height * BYTES_PER_PIXEL;
    var textureDumps = 0;
    while (this.textureByteCount > MAX_TEXTURE_BYTES && textureDumps++ < MAX_TEXTURE_DUMP_ITERATIONS) {
      var oldestTextureEntry = this.textureDataCache.head;
      if (oldestTextureEntry) {
        if (!oldestTextureEntry.value.isImg) {
          this.textureDataCache.get(oldestTextureEntry.key);
          continue;
        }
        this.deleteTexture(oldestTextureEntry.key);
      }
    }
  };

  this.removeFromByteCount = function(width, height) {
    width = this.nextPowerOfTwo(width);
    height = this.nextPowerOfTwo(height);
    this.textureByteCount -= width * height * BYTES_PER_PIXEL;
  };

  this.nextPowerOfTwo = function(value) {
    return pow(2, ceil(log(value) / LOG_2));
  };

});

WebGLTextureManager.TEXTURE_REMOVED = "TextureRemoved";

exports = WebGLTextureManager;