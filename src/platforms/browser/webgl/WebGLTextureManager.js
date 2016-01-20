import cache.LRUCache as LRUCache;

var WebGLTextureManager = Class(function() {

  var CACHE_SIZE = 2048;
  var CACHE_UID = 1;
  var BYTES_PER_PIXEL = 4;
  var MAX_TEXTURE_BYTES = 256 * 1024 * 1024;

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
      image.__GL_ID = undefined;
    }
  };

  this.deleteTexture = function(id) {
    var textureData = this.textureDataCache.remove(id);
    if (textureData) {
      this.gl.deleteTexture(textureData.texture);
      this.removeFromByteCount(textureData.width, textureData.height);
    }
  };

  this.createOrUpdateTexture = function(image, id) {
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

    var gl = this.gl;
    if (!gl) { return -1; }

    if (!id) { id = CACHE_UID++; }

    var textureDataEntry = this.textureDataCache.find(id);
    var textureData = textureDataEntry ? textureDataEntry.value : null;

    // No data exists for id, create new entry
    if (!textureData) {
      textureData = {
        image: image,
        isImg: image instanceof Image,
        isCanvas: image instanceof HTMLCanvasElement,
        width: width,
        height: height
      };
      this.textureDataCache.put(id, textureData);
    }

    if (!textureData.texture) {
      textureData.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, textureData.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      image.__GL_ID = id;
      this.addToByteCount(width, height);
    }

    if (textureData.width !== width || textureData.height !== height) {
      this.removeFromByteCount(textureData.width, textureData.height);
      this.addToByteCount(width, height);
      textureData.width = width;
      textureData.height = height;
    }

    if (textureData.image !== image) {
      textureData.isImg = image instanceof Image;
      textureData.isCanvas = image instanceof HTMLCanvasElement;
      textureData.image.__GL_ID = undefined;
      textureData.image = image;
      image.__GL_ID = id;
    }

    gl.bindTexture(gl.TEXTURE_2D, textureData.texture);

    if (textureData.isImg || textureData.isCanvas) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    return id;
  };

  this.reloadTextures = function() {
    this.textureDataCache.forEach(function(key, value) {
      value.texture = undefined;
      this.createOrUpdateTexture(value.image, value.image.__GL_ID);
    }, this);
  };

  this.addToByteCount = function(width, height) {
    width = this.nextPowerOfTwo(width);
    height = this.nextPowerOfTwo(height);
    this.textureByteCount += width * height * BYTES_PER_PIXEL;
    while (this.textureByteCount > MAX_TEXTURE_BYTES) {
      var oldestTextureEntry = this.textureDataCache.shift();
      if (oldestTextureEntry) {
        var textureData = oldestTextureEntry.value;
        // If the texture is not an Image, don't throw it out, since we can
        // only reasonably reload images. This puts the entry back into the
        // cache with a recent timestamp.
        if (!textureData.isImg) {
          this.textureDataCache.put(oldestTextureEntry.key, oldestTextureEntry.value);
          continue;
        }
        textureData.image.__GL_ID = undefined;
        this.gl.deleteTexture(textureData.texture);
        this.removeFromByteCount(textureData.width, textureData.height);
      }
    }
  };

  this.nextPowerOfTwo = function(value) {
    return pow(2, ceil(log(value) / LOG_2));
  };

  this.removeFromByteCount = function(width, height) {
    width = this.nextPowerOfTwo(width);
    height = this.nextPowerOfTwo(height);
    this.textureByteCount -= width * height * BYTES_PER_PIXEL;
  };

  this.clearTextures = function(dispose) {
    // Dispose defaults to true
    if (dispose || dispose === undefined) {
      this.textureDataCache.forEach(function(key, value) {
        this.gl.deleteTexture(value);
      }, this);
    }
    this.textureDataCache.removeAll();
    this.textureByteCount = 0;
  };

});

exports = WebGLTextureManager;