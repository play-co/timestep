import { CONFIG } from 'base';
import LRUCache from 'cache/LRUCache';
import PubSub from 'lib/PubSub';
import userAgent from 'userAgent';

var CACHE_SIZE = 65535;
var CACHE_UID = 1;
var BYTES_PER_PIXEL = 4;

// default to general limit, allow platform specific overrides
var MAX_TEXTURE_BYTES = CONFIG.maxTextureMegabytes * 1024 * 1024;
if (userAgent.OS_TYPE === 'Android') {
  MAX_TEXTURE_BYTES = (CONFIG.android.maxTextureMegabytes * 1024 * 1024) || MAX_TEXTURE_BYTES;
} else if (userAgent.OS_TYPE === 'iPhone OS') {
  MAX_TEXTURE_BYTES = (CONFIG.ios.maxTextureMegabytes * 1024 * 1024) || MAX_TEXTURE_BYTES;
}

var imageProto = new Image().__proto__;
var canvasProto = document.createElement('canvas').__proto__;
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

  deleteTextureForImage (image) {
    var texture = image.texture;
    if (texture) {
      this.deleteTexture(texture);
    }
  }

  deleteTexture (textureData) {
    this.emit(WebGLTextureManager.TEXTURE_REMOVED);
    if (textureData) {
      this.gl.deleteTexture(textureData.texture);
    }
  }

  createTexture (image) {
    var width = image.width;
    var height = image.height;

    if (width === 0 || height === 0) {
      throw new Error('Image cannot have a width or height of 0.');
    }

    var gl = this.gl;
    var texture = gl.createTexture();
    var textureData = {
      image: image,
      isImg: image.__proto__ == imageProto,
      isCanvas: image.__proto__ == canvasProto,
      width: width,
      height: height,
      texture: texture
    };

    // Making space before adding new texture
    this.addToByteCount(width, height);

    gl.bindTexture(gl.TEXTURE_2D, textureData.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    if (textureData.isImg || textureData.isCanvas) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    var cacheKey = CACHE_UID++;
    this.textureDataCache.put(cacheKey, textureData);

    return texture;
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
    for (var i = 0; i < imagesToLoad.length; i++) {
      this.createOrUpdateTexture(imagesToLoad[i]);
    }
  }

  addToByteCount (width, height) {
    width = this.nextPowerOfTwo(width);
    height = this.nextPowerOfTwo(height);
    this.textureByteCount += width * height * BYTES_PER_PIXEL;

    var textureDump = 0;
    var maxTextureDump = this.textureDataCache.size / 2;
    while (this.textureByteCount > this.memoryLimit && textureDump++ < maxTextureDump) {
      var oldestTextureEntry = this.textureDataCache.head;
      if (oldestTextureEntry) {
        if (!oldestTextureEntry.value.isImg && !oldestTextureEntry.value.isCanvas) {
          this.textureDataCache.get(oldestTextureEntry.key);
          continue;
        }

        this.textureDataCache.remove(oldestTextureEntry.key);

        var textureData = oldestTextureEntry.value;
        this.deleteTexture(textureData.texture);
        this.removeFromByteCount(textureData.width, textureData.height);

        // image will need to be reuploaded
        textureData.image.__needsUpload = true;
      }
    }
  }

  removeFromByteCount (width, height) {
    width = this.nextPowerOfTwo(width);
    height = this.nextPowerOfTwo(height);
    this.textureByteCount -= width * height * BYTES_PER_PIXEL;
  }

  nextPowerOfTwo (value) {
    var log2 = Math.log(2);
    return Math.pow(2, Math.ceil(Math.log(value) / log2));
  }
}

WebGLTextureManager.TEXTURE_REMOVED = 'TextureRemoved';
