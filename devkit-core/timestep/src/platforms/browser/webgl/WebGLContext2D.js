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
 * @package timestep.env.browser.WebGLContext2D;
 *
 * Generates a WebGL rendering context by creating our own Canvas element.
 */
import {
  CONFIG,
  bind,
  logger
} from 'base';

import device from 'device';

import Color from 'ui/Color';
import TextManager from './TextManager';
import Shaders from './Shaders';
import Matrix2D from './Matrix2D';
import WebGLTextureManager from './WebGLTextureManager';


var STRIDE = 24;
var MAX_BATCH_SIZE = 512;

class Rectangle {

  constructor () {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }

  copy (rectangle) {
    this.x = rectangle.x;
    this.y = rectangle.y;
    this.width = rectangle.width;
    this.height = rectangle.height;
  }

}

// Create a context to measure text
var textCtx = document.createElement('canvas').getContext('2d');

// ---------------------------------------------------------------------------
// CONTEXT2D
// ---------------------------------------------------------------------------

class ContextState {

  constructor () {
    this.globalCompositeOperation = 'source-over';
    this.globalAlpha = 1;
    this.transform = new Matrix2D();
    this.lineWidth = 1;
    this.filter = null;
    this.clip = false;
    this.clipRectangle = new Rectangle();
    this.fillStyle = '';
    this.strokeStyle = '';
  }

  setState (state) {
    this.globalCompositeOperation = state.globalCompositeOperation;
    this.globalAlpha = state.globalAlpha;
    this.transform.copy(state.transform);
    this.lineWidth = state.lineWidth;
    this.filter = state.filter;
    this.clip = state.clip;
    this.clipRectangle.copy(state.clipRectangle);
    this.fillStyle = state.fillStyle;
    this.strokeStyle = state.strokeStyle;
    return this;
  }

}

var COLOR_MAP = {};
var getColor = function (key) {
  var result = COLOR_MAP[key];
  if (!result) {
    result = COLOR_MAP[key] = Color.parse(key);
  }
  return result;
};

class Context2D extends ContextState {

  constructor (manager, canvas) {
    super();

    this._manager = manager;
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.font = '11px ' + device.defaultFontFamily;
    this.frameBuffer = null;
    this.filter = null;
    this.isWebGL = true;

    this.stack = [];
    this.parentStateIndex = -1;
  }

  save () {
    this.parentStateIndex += 1;
    if (this.parentStateIndex <= this.stack.length) {
      this.stack[this.parentStateIndex] = new ContextState();
    }

    this.stack[this.parentStateIndex].setState(this);
  }

  restore () {
    var state = this.stack[this.parentStateIndex];
    this.setState(state);
    this.parentStateIndex -= 1;
  }

  createOffscreenFrameBuffer () {
    var gl = this._manager.gl;
    var activeCtx = this._manager._activeCtx;
    this._texture = this._manager.createTexture(this.canvas);
    this.frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._texture, 0);
    this.canvas.__glFlip = true;
    this._manager.activate(activeCtx, true);
  }

  loadIdentity () {
    this.transform.identity();
  }

  setTransform (a, b, c, d, tx, ty) {
    this.transform.setTo(a, b, c, d, tx, ty);
  }

  transform (a, b, c, d, tx, ty) {
    this._helperTransform.setTo(a, b, c, d, tx, ty);
    this.transform.transform(this._helperTransform);
  }

  scale (x, y) {
    this.transform.scale(x, y);
  }

  translate (x, y) {
    this.transform.translate(x, y);
  }

  rotate (angle) {
    this.transform.rotate(angle);
  }

  getElement () {
    return this.canvas;
  }

  reset () {}

  clear () {
    this._manager.activate(this);
    this._manager.flush();
    this._manager.disableScissor();
    var gl = this._manager.gl;
    if (gl) {
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  resize (width, height) {
    this.width = width;
    this.height = height;
    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this._manager.activate(this, true);
    if (this._texture && this._manager.gl) {
      var gl = this._manager.gl;
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
  }

  clipRect (x, y, width, height) {
    var m = this.transform;
    var xW = x + width;
    var yH = y + height;
    var x0 = x * m.a + y * m.c + m.tx;
    var y0 = x * m.b + y * m.d + m.ty;
    var x1 = xW * m.a + y * m.c + m.tx;
    var y1 = xW * m.b + y * m.d + m.ty;
    var x2 = x * m.a + yH * m.c + m.tx;
    var y2 = x * m.b + yH * m.d + m.ty;
    var x3 = xW * m.a + yH * m.c + m.tx;
    var y3 = xW * m.b + yH * m.d + m.ty;

    var minX, maxX, minY, maxY;
    var parentClipRect;
    if (this.parentStateIndex >= 0) {
      var parent = this.stack[this.parentStateIndex];
      parentClipRect = parent.clip && parent.clipRectangle;
    }

    if (parentClipRect) {
      minX = parentClipRect.x;
      minY = parentClipRect.y;
      maxX = parentClipRect.x + parentClipRect.width;
      maxY = parentClipRect.y + parentClipRect.height;
    } else {
      minX = 0;
      minY = 0;
      maxX = this.width;
      maxY = this.height;
    }

    var left = Math.min(maxX, x0, x1, x2, x3);
    var right = Math.max(minX, x0, x1, x2, x3);
    var top = Math.min(maxY, y0, y1, y2, y3);
    var bottom = Math.max(minY, y0, y1, y2, y3);

    if (left < minX) {
      left = minX;
    }
    if (right > maxX) {
      right = maxX;
    }
    if (top < minY) {
      top = minY;
    }
    if (bottom > maxY) {
      bottom = maxY;
    }

    this.clip = true;
    var r = this.clipRectangle;
    r.x = left;
    r.y = top;
    r.width = right - left;
    r.height = bottom - top;
  }

  swap () {
    this._manager.flush();
  }

  execSwap () {}

  setFilter (filter) {
    this.filter = filter;
  }

  clearFilter () {
    this.filter = null;
  }

  clearFilters () {
    logger.warn('ctx.clearFilters is deprecated, use ctx.clearFilter instead.');
    this.clearFilter();
  }

  circle (/* x, y, radius */) {}

  drawPointSprites (/* x1, y1, x2, y2 */) {}

  roundRect (/* x, y, width, height, radius */) {}

  fillText (text, x, y) {
    var textData = this._manager.textManager.get(this, text, false);
    if (!textData) {
      return;
    }
    var w = textData.image.width;
    var h = textData.image.height;
    this.drawImage(textData.image, 0, 0, w, h, x, y, w, h);
  }

  strokeText (text, x, y) {
    var textData = this._manager.textManager.get(this, text, true);
    if (!textData) {
      return;
    }
    var w = textData.image.width;
    var h = textData.image.height;
    this.drawImage(textData.image, 0, 0, w, h, x - this.lineWidth * 0.5, y - this.lineWidth * 0.5, w, h);
  }

  measureText (text) {
    textCtx.font = this.font;
    return textCtx.measureText(text);
  }

  drawImage (image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    var alpha = this.globalAlpha;
    if (alpha === 0) {
      return;
    }

    var manager = this._manager;
    manager.activate(this);

    if (image.__needsUpload) {
      manager.deleteTexture(image);
      image.texture = manager.createTexture(image);
      image.__needsUpload = false;
    }

    var drawIndex = manager.addToBatch(this, image.texture);

    var m = this.transform;
    var dxW = dx + dWidth;
    var dyH = dy + dHeight;

    // Calculate 4 vertex positions
    var x0 = dx * m.a + dy * m.c + m.tx;
    var y0 = dx * m.b + dy * m.d + m.ty;
    var x1 = dxW * m.a + dy * m.c + m.tx;
    var y1 = dxW * m.b + dy * m.d + m.ty;
    var x2 = dx * m.a + dyH * m.c + m.tx;
    var y2 = dx * m.b + dyH * m.d + m.ty;
    var x3 = dxW * m.a + dyH * m.c + m.tx;
    var y3 = dxW * m.b + dyH * m.d + m.ty;

    // TODO: remove private access to _vertices
    var tw = 1 / image.width;
    var th = 1 / image.height;
    var vc = manager._vertices;
    var i = drawIndex * 6 * 4;

    var uLeft = sx * tw;
    var uRight = (sx + sWidth) * tw;
    var vTop = sy * th;
    var vBottom = (sy + sHeight) * th;

    vc[i + 0] = x0;
    vc[i + 1] = y0;
    vc[i + 2] = uLeft;
    // u0
    vc[i + 3] = vTop;
    // v0
    vc[i + 4] = alpha;

    vc[i + 6] = x1;
    vc[i + 7] = y1;
    vc[i + 8] = uRight;
    // u1
    vc[i + 9] = vTop;
    // v1
    vc[i + 10] = alpha;

    vc[i + 12] = x2;
    vc[i + 13] = y2;
    vc[i + 14] = uLeft;
    // u2
    vc[i + 15] = vBottom;
    // v2
    vc[i + 16] = alpha;

    vc[i + 18] = x3;
    vc[i + 19] = y3;
    vc[i + 20] = uRight;
    // u4
    vc[i + 21] = vBottom;
    // v4
    vc[i + 22] = alpha;

    if (this.filter && this.filter._color) {
      var color = this.filter._color;
      var cc = manager._colors;
      var packedColor = (color.r & 0xff) | ((color.g & 0xff) << 8) | ((color.b & 0xff) << 16) | (((color.a * 255) & 0xff) << 24);
      cc[i + 5] = cc[i + 11] = cc[i + 17] = cc[i + 23] = packedColor;
    }
  }

  fillRect (x, y, width, height) {
    if (this.globalAlpha === 0) {
      return;
    }

    this._fillRect(x, y, width, height, getColor(this.fillStyle));
  }

  strokeRect (x, y, width, height) {
    var lineWidth = this.lineWidth;
    var halfWidth = lineWidth / 2;
    var strokeColor = getColor(this.strokeStyle);
    this._fillRect(x + halfWidth, y - halfWidth, width - lineWidth, lineWidth, strokeColor);
    this._fillRect(x + halfWidth, y + height - halfWidth, width - lineWidth, lineWidth, strokeColor);
    this._fillRect(x - halfWidth, y - halfWidth, lineWidth, height + lineWidth, strokeColor);
    this._fillRect(x + width - halfWidth, y - halfWidth, lineWidth, height + lineWidth, strokeColor);
  }

  _fillRect (x, y, width, height, color) {
    var m = this.transform;
    var xW = x + width;
    var yH = y + height;

    // Calculate 4 vertex positions
    var x0 = x * m.a + y * m.c + m.tx;
    var y0 = x * m.b + y * m.d + m.ty;
    var x1 = xW * m.a + y * m.c + m.tx;
    var y1 = xW * m.b + y * m.d + m.ty;
    var x2 = x * m.a + yH * m.c + m.tx;
    var y2 = x * m.b + yH * m.d + m.ty;
    var x3 = xW * m.a + yH * m.c + m.tx;
    var y3 = xW * m.b + yH * m.d + m.ty;

    var manager = this._manager;
    manager.activate(this);
    var drawIndex = manager.addToBatch(this, null);

    // TODO: remove private access to _vertices
    var vc = manager._vertices;
    var i = drawIndex * 6 * 4;

    vc[i + 0] = x0;
    vc[i + 1] = y0;
    vc[i + 4] = this.globalAlpha;

    vc[i + 6] = x1;
    vc[i + 7] = y1;
    vc[i + 10] = this.globalAlpha;

    vc[i + 12] = x2;
    vc[i + 13] = y2;
    vc[i + 16] = this.globalAlpha;

    vc[i + 18] = x3;
    vc[i + 19] = y3;
    vc[i + 22] = this.globalAlpha;

    var cc = manager._colors;
    var packedColor = (color.r & 0xff) + ((color.g & 0xff) << 8) + ((color.b & 0xff) << 16) + (((color.a * 255) & 0xff) << 24);
    cc[i + 5] = cc[i + 11] = cc[i + 17] = cc[i + 23] = packedColor;
  }

  deleteTexture (image) {
    this._manager.deleteTexture(image);
  }
}

class GLManager {

  constructor (canvas) {
    var webglSupported;
    try {
      var testCanvas = document.createElement('canvas');
      webglSupported = !!(testCanvas.getContext('webgl'));
    } catch (e) {
      webglSupported = false;
    }

    this.width = device.screen.width;
    this.height = device.screen.height;
    this.isSupported = webglSupported && CONFIG.useWebGL;

    if (!this.isSupported) {
      return;
    }

    this.textManager = new TextManager();
    this.textureManager = new WebGLTextureManager();

    this.textureManager.on(WebGLTextureManager.TEXTURE_REMOVED, bind(this, this.flush));

    this._helperTransform = new Matrix2D();

    this._canvas = canvas || document.createElement('canvas');
    this._canvas.width = this.width;
    this._canvas.height = this.height;
    this._canvas.getWebGLContext = this._canvas.getContext.bind(this._canvas, 'webgl', {
      depth: false,
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: CONFIG.preserveDrawingBuffer
    });

    this._indexCache = new Uint16Array(MAX_BATCH_SIZE * 6);
    this._vertexCache = new ArrayBuffer(MAX_BATCH_SIZE * STRIDE * 4);
    this._vertices = new Float32Array(this._vertexCache);
    this._colors = new Uint32Array(this._vertexCache);

    var indexCount = MAX_BATCH_SIZE * 6;
    for (var i = 0, j = 0; i < indexCount; i += 6, j += 4) {
      this._indexCache[i] = j;
      this._indexCache[i + 1] = j + 2;
      this._indexCache[i + 2] = j + 3;
      this._indexCache[i + 3] = j;
      this._indexCache[i + 4] = j + 3;
      this._indexCache[i + 5] = j + 1;
    }

    this._batchQueue = new Array(MAX_BATCH_SIZE);
    for (var k = 0; k <= MAX_BATCH_SIZE; k++) {
      this._batchQueue[k] = {
        texture: null,
        index: 0,
        shader: null,
        globalCompositeOperation: null,
        clip: false,
        clipRectangle: new Rectangle()
      };
    }

    this.contexts = [];
    this.initGL();
    this._primaryContext = new Context2D(this, this._canvas);
    this.activate(this._primaryContext);

    this.contextActive = true;

    this._canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this), false);
    this._canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this), false);
  }

  handleContextLost (e) {
    e.preventDefault();
    this.contextActive = false;
    this.gl = null;
  }

  handleContextRestored () {
    this.initGL();
    this.contextActive = true;
  }

  initGL () {
    var gl = this.gl = this._canvas.getWebGLContext();

    gl.clearColor(0, 0, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.activeTexture(gl.TEXTURE0);

    this._scissorEnabled = false;
    this._activeScissor = new Rectangle();

    this._activeCompositeOperation = '';
    this.setActiveCompositeOperation('source-over');
    this._activeShader = null;

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    this._drawIndex = 0;
    this._batchIndex = 0;

    // Initialize Buffers
    this._indexBuffer = gl.createBuffer();
    this._vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._indexCache, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._vertexCache, gl.DYNAMIC_DRAW);

    // Initialize Shaders
    this.defaultShader = new Shaders.DefaultShader({ gl: gl });
    this.rectShader = new Shaders.RectShader({ gl: gl });
    this.linearAddShader = new Shaders.LinearAddShader({ gl: gl });
    this.tintShader = new Shaders.TintShader({ gl: gl });
    this.multiplyShader = new Shaders.MultiplyShader({ gl: gl });

    this.textureManager.initGL(gl);
    this.updateContexts();
  }

  updateContexts () {
    for (var i = 0; i < this.contexts.length; i++) {
      this.contexts[i].createOffscreenFrameBuffer();
    }
  }

  updateCanvasDimensions () {
    this._primaryContext.resize(this._canvas.width, this._canvas.height);
  }

  getContext (canvas, opts) {
    opts = opts || {};

    var ctx;
    if (opts.offscreen === false) {
      ctx = this._primaryContext;
      ctx.resize(opts.width, opts.height);
    } else {
      ctx = new Context2D(this, canvas);
      ctx.createOffscreenFrameBuffer();
      this.contexts.push(ctx);
    }

    return ctx;
  }

  setActiveCompositeOperation (op) {
    op = op || 'source-over';
    if (this._activeCompositeOperation === op || !this.gl) {
      return;
    }
    this._activeCompositeOperation = op;

    var gl = this.gl;
    var source;
    var destination;

    switch (op) {
      case 'source-over':
        source = gl.ONE;
        destination = gl.ONE_MINUS_SRC_ALPHA;
        break;

      case 'source-atop':
        source = gl.DST_ALPHA;
        destination = gl.ONE_MINUS_SRC_ALPHA;
        break;

      case 'source-in':
        source = gl.DST_ALPHA;
        destination = gl.ZERO;
        break;

      case 'source-out':
        source = gl.ONE_MINUS_DST_ALPHA;
        destination = gl.ZERO;
        break;

      case 'destination-atop':
        source = gl.DST_ALPHA;
        destination = gl.SRC_ALPHA;
        break;

      case 'destination-in':
        source = gl.ZERO;
        destination = gl.SRC_ALPHA;
        break;

      case 'destination-out':
        source = gl.ONE_MINUS_SRC_ALPHA;
        destination = gl.ONE_MINUS_SRC_ALPHA;
        break;

      case 'destination-over':
        source = gl.DST_ALPHA;
        destination = gl.SRC_ALPHA;
        break;

      case 'lighter':
        source = gl.ONE;
        destination = gl.ONE;
        break;

      case 'xor':
      case 'copy':
        source = gl.ONE;
        destination = gl.ONE_MINUS_SRC_ALPHA;
        break;

      default:
        source = gl.ONE;
        destination = gl.ONE_MINUS_SRC_ALPHA;
        break;
    }
    gl.blendFunc(source, destination);
  }

  flush () {
    if (this._batchIndex === 0) {
      return;
    }

    var gl = this.gl;
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertexCache);
    this._batchQueue[this._batchIndex + 1].index = this._drawIndex;

    for (var i = 1; i <= this._batchIndex; i++) {
      var curQueueObj = this._batchQueue[i];
      if (curQueueObj.clip) {
        var r = curQueueObj.clipRectangle;
        this.enableScissor(r.x, r.y, r.width, r.height);
      } else {
        this.disableScissor();
      }

      var texture = curQueueObj.texture;
      if (texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
      }

      this.setActiveCompositeOperation(curQueueObj.globalCompositeOperation);

      var shader = curQueueObj.shader;
      if (shader !== this._activeShader) {
        var a; // attribute index

        var enabledAttributesNew = shader.enabledAttributes;
        if (this._activeShader) {
          // try to minimize gl calls to enable/disable vertex attribute arrays by comparing with previous states
          var enabledAttributesOld = this._activeShader.enabledAttributes;

          for (a = 0; a < enabledAttributesOld.length; ++a) {
            if (enabledAttributesOld[a]) {
              if (!enabledAttributesNew[a]) {
                gl.disableVertexAttribArray(a);
              }
            } else {
              if (enabledAttributesNew[a]) {
                gl.enableVertexAttribArray(a);
              }
            }
          }

          // enable remaining attributes if any
          for (a = enabledAttributesOld.length; a < enabledAttributesNew.length; ++a) {
            if (enabledAttributesNew[a]) {
              gl.enableVertexAttribArray(a);
            }
          }
        } else {
          // if no shader is currently in used, just enable everything required
          for (a = 0; a < enabledAttributesNew.length; ++a) {
            if (enabledAttributesNew[a]) {
              gl.enableVertexAttribArray(a);
            }
          }
        }

        shader.useProgram(this._activeCtx);

        this._activeShader = shader;
      }

      var start = curQueueObj.index;
      var next = this._batchQueue[i + 1].index;
      gl.drawElements(gl.TRIANGLES, (next - start) * 6, gl.UNSIGNED_SHORT, start * 12);
    }

    this._drawIndex = 0;
    this._batchIndex = 0;
  }

  createTexture (image) {
    return this.textureManager.createTexture(image);
  }

  deleteTexture (image) {
    this.textureManager.deleteTextureForImage(image);
  }

  enableScissor (x, y, width, height) {
    var gl = this.gl;
    if (!this._scissorEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      this._scissorEnabled = true;
    }

    var s = this._activeScissor;
    var invertedY = this._activeCtx.height - height - y;
    if (x !== s.x || invertedY !== s.y || width !== s.width || height !== s.height) {
      s.x = x;
      s.y = invertedY;
      s.width = width;
      s.height = height;
      gl.scissor(x, invertedY, width, height);
    }
  }

  disableScissor () {
    if (this._scissorEnabled) {
      var gl = this.gl;
      this._scissorEnabled = false;
      gl.disable(gl.SCISSOR_TEST);
    }
  }

  addToBatch (state, texture) {
    if (this._drawIndex >= MAX_BATCH_SIZE) {
      this.flush();
    }

    var filter = state.filter;
    var shader = filter ? filter.shader : (texture ? this.defaultShader : this.rectShader);
    var clip = state.clip;
    var clipRectangle = state.clipRectangle;

    var queuedState = this._batchQueue[this._batchIndex];
    var stateChanged = queuedState.texture !== texture
      || queuedState.globalCompositeOperation !== state.globalCompositeOperation
      || queuedState.shader !== shader
      || queuedState.clip !== clip
      || clip && (queuedState.clipRectangle.x !== clipRectangle.x
        || queuedState.clipRectangle.y !== clipRectangle.y
        || queuedState.clipRectangle.width !== clipRectangle.width
        || queuedState.clipRectangle.height !== clipRectangle.height);

    var drawIndex = this._drawIndex++;
    if (stateChanged) {
      var queueObject = this._batchQueue[++this._batchIndex];
      queueObject.texture = texture;
      queueObject.index = drawIndex;
      queueObject.globalCompositeOperation = state.globalCompositeOperation;
      queueObject.shader = shader;
      queueObject.clip = clip;
      if (clip) {
        queueObject.clipRectangle.x = clipRectangle.x;
        queueObject.clipRectangle.y = clipRectangle.y;
        queueObject.clipRectangle.width = clipRectangle.width;
        queueObject.clipRectangle.height = clipRectangle.height;
      }
    }

    return drawIndex;
  }

  isPowerOfTwo (width, height) {
    return width > 0 && (width & width - 1) === 0
      && height > 0 && (height & height - 1) === 0;
  }

  activate (ctx, forceActivate) {
    var sameContext = ctx === this._activeCtx;
    if (sameContext && !forceActivate) {
      return;
    }

    if (!sameContext) {
      this.flush();
      this.gl.finish();
      this._activeCtx = ctx;
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, ctx.frameBuffer);
    this.gl.viewport(0, 0, ctx.width, ctx.height);

    this._activeShader = null;
  }
}

// `window.canvas` is provided by WeChat user agent
var canvas = window.canvas;
var glManager = new GLManager(canvas);
export default glManager;
