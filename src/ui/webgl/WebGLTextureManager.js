import { CONFIG, bind } from 'base';
import LRUCache from 'cache/LRUCache';
import PubSub from 'lib/PubSub';
import userAgent from 'userAgent';

var CACHE_SIZE = 65535;
var CACHE_UID = 1;
var BYTES_PER_PIXEL = 4;
var MAX_TEXTURE_DUMP_ITERATIONS = 5;

// default to general limit, allow platform specific overrides
var MAX_TEXTURE_BYTES = CONFIG.maxTextureMegabytes * 1024 * 1024;
if (userAgent.OS_TYPE === 'Android') {
  var mb = CONFIG.android.maxTextureMegabytes;
  MAX_TEXTURE_BYTES = (mb * 1024 * 1024) || MAX_TEXTURE_BYTES;
} else if (userAgent.OS_TYPE === 'iPhone OS') {
  var mb = CONFIG.ios.maxTextureMegabytes;
  MAX_TEXTURE_BYTES = (mb * 1024 * 1024) || MAX_TEXTURE_BYTES;
}

var pow = Math.pow;
var ceil = Math.ceil;
var log = Math.log;
var LOG_2 = log(2);

export default class WebGLTextureManager extends PubSub {

  constructor () {
    super();

    this.gl = null;
    this.textureDataCache = new LRUCache(CACHE_SIZE);
    this.textureByteCount = 0;
    this.memoryLimit = MAX_TEXTURE_BYTES;
  }

  initGL (ctx) {
    this.gl = ctx;
    this.reloadTextures();
  }

  getTexture (id) {
    var textureData = this.textureDataCache.get(id);
    return textureData
      ? textureData.texture
      : null;
  }

  getTextureData (id) {
    var textureData = this.textureDataCache.get(id);
    return textureData || null;
  }

  deleteTextureForImage (image) {
    if (image.__GL_ID !== undefined) {
      this.deleteTexture(image.__GL_ID);
    }
  }

  deleteTexture (id) {
    this.emit(WebGLTextureManager.TEXTURE_REMOVED);
    var textureData = this.textureDataCache.remove(id);
    if (textureData) {
      this.gl.deleteTexture(textureData.texture);
      this.removeFromByteCount(textureData.width, textureData.height);
      textureData.image.__GL_ID = undefined;
    }
  }

  createOrUpdateTexture (image, id) {
    var gl = this.gl;
    if (!gl) {
      return -1;
    }

    var width = image.width;
    var height = image.height;

    if (!image.dispose) {
      image.dispose = bind(this, function () {
        this.deleteTextureForImage(image);
      });
    }

    if (width === 0 || height === 0) {
      throw new Error('Image cannot have a width or height of 0.');
    }

    if (id === undefined) {
      id = image.__GL_ID !== undefined
        ? image.__GL_ID
        : CACHE_UID++;
    }

    image.__GL_ID = id;

    var textureDataEntry = this.textureDataCache.find(id);
    var textureData = textureDataEntry
      ? textureDataEntry.value
      : null;
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
  }

  reloadTextures () {
    var imagesToLoad = [];
    this.textureDataCache.forEach(function (key, value) {
      if (value.isImg || value.isCanvas) {
        imagesToLoad.push(value.image);
      }
    }, this);
    this.textureDataCache.removeAll();
    this.textureByteCount = 0;
    for (var i = 0, len = imagesToLoad.length; i < len; i++) {
      this.createOrUpdateTexture(imagesToLoad[i]);
    }
  }

  addToByteCount (width, height) {
    width = this.nextPowerOfTwo(width);
    height = this.nextPowerOfTwo(height);
    this.textureByteCount += width * height * BYTES_PER_PIXEL;

    var textureDumps = 0;
    while (this.textureByteCount > this.memoryLimit
      && textureDumps++ < MAX_TEXTURE_DUMP_ITERATIONS)
    {
      var oldestTextureEntry = this.textureDataCache.head;
      if (oldestTextureEntry) {
        if (!oldestTextureEntry.value.isImg) {
          this.textureDataCache.get(oldestTextureEntry.key);
          continue;
        }
        this.deleteTexture(oldestTextureEntry.key);
      }
    }
  }

  removeFromByteCount (width, height) {
    width = this.nextPowerOfTwo(width);
    height = this.nextPowerOfTwo(height);
    this.textureByteCount -= width * height * BYTES_PER_PIXEL;
  }

  nextPowerOfTwo (value) {
    return pow(2, ceil(log(value) / LOG_2));
  }
}

WebGLTextureManager.TEXTURE_REMOVED = 'TextureRemoved';
