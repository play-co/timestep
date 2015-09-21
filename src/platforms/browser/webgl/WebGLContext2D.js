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

import device;
// import .FontRenderer;
import .Matrix2D;
import ui.resource.loader as loader;

var ContextStateStack = Class(function() {

	this.init = function() {
		this._states = [this.getObject()];
		this._stateIndex = 0;
	};

	this.save = function() {
		var lastState = this.state;
		if (++this._stateIndex >= this._states.length) {
			this._states[this._stateIndex] = this.getObject();
		}
		this.state.globalCompositeOperation = lastState.globalCompositeOperation;
		this.state.globalAlpha = lastState.globalAlpha;
		this.state.transform.copy(lastState.transform);
	};

	this.restore = function() {
		if (this._stateIndex > 0) {
			this._stateIndex--;
		}
	};

	this.getObject = function() {
		return {
			globalCompositeOperation: "source-over",
			globalAlpha: 1,
			transform: new Matrix2D(),
			filter: null,
			clip: false,
			clipRect: { x: 0, y: 0, width: 0, height: 0 }
		};
	};

	Object.defineProperty(this, 'state', {
		get: function() { return this._states[this._stateIndex]; }
	});
});

var STRIDE = 24;

var GLManager = Class(function() {

	var MAX_BATCH_SIZE = 1024;

	var FILTERMAP = {
		LinearAdd: 1,
		Tint: 2,
		Multiply: 3
	};

	this.init = function () {
		var webglSupported = false;
		try {
			var testCanvas = document.createElement('canvas');
			webglSupported = !!(window.WebGLRenderingContext && testCanvas.getContext('webgl'));
		} catch(e) {}

		this.width = device.width;
		this.height = device.height;
		this.isSupported = webglSupported;
		if (this.isSupported) {
			this._initGL();
		}
	};

	this._initGL = function () {
		this._canvas = document.createElement('canvas');
		this._canvas.width = this.width;
		this._canvas.height = this.height;

		var gl = this.gl = this._canvas.getContext('webgl', {
			alpha: true,
			premultipliedAlpha: true
		});

		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);

		this._scissorEnabled = false;
		this._activeScissor = { x: 0, y: 0, width: 0, height: 0 };

		this.setActiveCompositeOperation('source-over');

		this._indexCache = new Uint16Array(MAX_BATCH_SIZE * 6);
		this._vertexCache = new ArrayBuffer(MAX_BATCH_SIZE * STRIDE * 4);
		this._vertices = new Float32Array(this._vertexCache);
		this._colors = new Uint8Array(this._vertexCache);

		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

		this._initializeShaders();
		this._initializeBuffers();

		this._helperTransform = new Matrix2D();
		this.textureCache = [];

		this._drawIndex = -1;
		this._batchIndex = -1;
		this._batchQueue = new Array(MAX_BATCH_SIZE);
		for (var i = 0; i <= MAX_BATCH_SIZE; i++) {
			this._batchQueue[i] = {
				textureId: 0,
				index: 0,
				clip: false,
				filter: null,
				clipRect: { x: 0, y: 0, width: 0, height: 0 }
			};
		}

		loader.on(loader.IMAGE_LOADED, function(image) {
			var glId = image.__GL_ID;
			if (glId === undefined) {
				glId = this.createTexture(image);
			}
		}.bind(this));

		this._primaryContext = new Context2D(this, this._canvas);
	};

	this.getContext = function(canvas, opts) {
		opts = opts || {};

		var ctx;
		if (opts.offscreen === false) {
			ctx = this._primaryContext;
			ctx.resize(opts.width, opts.height);
		} else {
			ctx = new Context2D(this, canvas);
			ctx.createOffscreenFrameBuffer();
		}

		return ctx;
	};

	this._initializeBuffers = function() {
		var gl = this.gl;

		var indexCount = MAX_BATCH_SIZE * 6;

		for (var i = 0, j = 0; i < indexCount; i += 6, j += 4) {
			this._indexCache[i] = j;
			this._indexCache[i + 1] = j + 2;
			this._indexCache[i + 2] = j + 3;
			this._indexCache[i + 3] = j;
			this._indexCache[i + 4] = j + 3;
			this._indexCache[i + 5] = j + 1;
		}

		this._indexBuffer = gl.createBuffer();
		this._vertexBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._indexCache, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this._vertexCache, gl.DYNAMIC_DRAW);

		var positionIndex = gl.getAttribLocation(this._shaderProgram, "aPosition");
		var uvIndex = gl.getAttribLocation(this._shaderProgram, "aTextureCoord");
		var alphaIndex = gl.getAttribLocation(this._shaderProgram, "aAlpha");
		var colorIndex = gl.getAttribLocation(this._shaderProgram, "aColor");

		gl.vertexAttribPointer(positionIndex, 2, gl.FLOAT, false, STRIDE, 0);
		gl.vertexAttribPointer(uvIndex, 2, gl.FLOAT, false, STRIDE, 8);
		gl.vertexAttribPointer(alphaIndex, 1, gl.FLOAT, false, STRIDE, 16);
		gl.vertexAttribPointer(colorIndex, 4, gl.UNSIGNED_BYTE, true, STRIDE, 20);

		gl.enableVertexAttribArray(positionIndex);
		gl.enableVertexAttribArray(uvIndex);
		gl.enableVertexAttribArray(alphaIndex);
		gl.enableVertexAttribArray(colorIndex);
	};

	this._initializeShaders = function() {
		var gl = this.gl;
		var vertexShader = this.createVertexShader();
		var fragmentShader = this.createFragmentShader();

		this._shaderProgram = gl.createProgram();
		gl.attachShader(this._shaderProgram, vertexShader);
		gl.attachShader(this._shaderProgram, fragmentShader);
		gl.linkProgram(this._shaderProgram);

		if (!gl.getProgramParameter(this._shaderProgram, gl.LINK_STATUS)) {
			console.log("Could not initialize shaders");
		}

		gl.useProgram(this._shaderProgram);

		this._resolutionLocation = gl.getUniformLocation(this._shaderProgram, "uResolution");

		gl.blendEquation(gl.FUNC_ADD);
		gl.activeTexture(gl.TEXTURE0);
		gl.uniform1i(gl.getUniformLocation(this._shaderProgram, "uSampler"), 0);

		this._filterLocation = gl.getUniformLocation(this._shaderProgram, "uFilterType");
	};

	this.createVertexShader = function() {
		var gl = this.gl;
		var src = [
			'precision lowp float;',
			'attribute vec2 aTextureCoord;',
			'attribute vec2 aPosition;',
			'attribute vec4 aColor;',
			'attribute float aAlpha;',
			'uniform vec2 uResolution;',
			'varying vec2 vTextureCoord;',
			'varying float vAlpha;',
			'varying vec4 vColor;',
			'void main() {',
			'	vTextureCoord = aTextureCoord;',
			'	vec2 clipSpace = (aPosition / uResolution) * 2.0 - 1.0;',
			'	vColor = aColor;',
			'	vAlpha = aAlpha;',
			'	gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);',
			'}'
		].join("\n");

		var shader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);

		return shader;
	};

	this.createFragmentShader = function() {
		var gl = this.gl;

		var src = [
			'precision lowp float;',
			'varying vec2 vTextureCoord;',
			'varying float vAlpha;',
			'varying vec4 vColor;',
			'uniform sampler2D uSampler;',
			'uniform int uFilterType;',
			'void main(void) {',
			'	vec4 vSample = texture2D(uSampler, vTextureCoord);',
			'	if (uFilterType == 0) {',
			'		gl_FragColor = vec4(vSample.rgb * vAlpha, vSample.a * vAlpha);', // 0 - No filter
			'	} else if (uFilterType == 1) {',
			'		gl_FragColor = vec4(vSample.rgb + (vColor.rgb * vColor.a), vSample.a * vAlpha);', // 1 - LinearAdd
			'	} else if (uFilterType == 2) {',
			'		gl_FragColor = vec4(vSample.rgb * (1.0 - vColor.a) + (vColor.rgb * vColor.a), vSample.a * vAlpha);', // 2 - Tint
			'	} else if (uFilterType == 3) {',
			'		gl_FragColor = vSample * vColor * vec4(1.0, 1.0, 1.0, vAlpha);', // 3 - Multiply
			'	}',
			'}'
		].join("\n");

		var shader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
		}

		return shader;
	};

	this.setActiveCompositeOperation = function(op) {

		op = op || 'source-over';
		if (this._activeCompositeOperation === op) { return; }
		this._activeCompositeOperation = op;

		var gl = this.gl;
		var source;
		var destination;

		switch(op) {
			case 'source_over':
				source = gl.ONE;
				destination = gl.ONE_MINUS_SRC_ALPHA;
				break;

			case 'source_atop':
				source = gl.DST_ALPHA;
				destination = gl.ONE_MINUS_SRC_ALPHA;
				break;

			case 'source_in':
				source = gl.DST_ALPHA;
				destination = gl.ZERO;
				break;

			case 'source_out':
				source = gl.ONE_MINUS_DST_ALPHA;
				destination = gl.ZERO;
				break;

			case 'destination_atop':
				source = gl.DST_ALPHA;
				destination = gl.SRC_ALPHA;
				break;

			case 'destination_in':
				source = gl.ZERO;
				destination = gl.SRC_ALPHA;
				break;

			case 'destination_out':
				source = gl.ONE_MINUS_SRC_ALPHA;
				destination = gl.ONE_MINUS_SRC_ALPHA;
				break;

			case 'destination_over':
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
	};

	this.flush = function() {
		if (this._batchIndex === -1) { return; }

		var gl = this.gl;
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertexCache);
		this._batchQueue[this._batchIndex + 1].index = this._drawIndex + 1;

		for (var i = 0; i <= this._batchIndex; i++) {
			var curQueueObj = this._batchQueue[i];
			if (curQueueObj.clip) {
				var r = curQueueObj.clipRect;
				this.enableScissor(r.x, r.y, r.width, r.height);
			} else {
				this.disableScissor();
			}
			gl.bindTexture(gl.TEXTURE_2D, this.textureCache[curQueueObj.textureId]);
			this.setActiveCompositeOperation(curQueueObj.globalCompositeOperation);
			gl.uniform1i(this._filterLocation, curQueueObj.filterId);
			var start = curQueueObj.index;
			var next = this._batchQueue[i + 1].index;
			gl.drawElements(gl.TRIANGLES, (next - start) * 6, gl.UNSIGNED_SHORT, start * 12);
		}

		this._drawIndex = -1;
		this._batchIndex = -1;
	};

	this.createTexture = function(image, id) {
		var gl = this.gl;

		if (!id) { id = this.textureCache.length; }
		var texture = this.textureCache[id] || gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, texture);

		if (image instanceof HTMLCanvasElement || image instanceof Image) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		}

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		if (!this.isPowerOfTwo(image.width, image.height)) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
		this.textureCache[id] = texture;
		image.__GL_ID = id;
		return id;
	};

	this.getTexture = function (id) {
		return this.textureCache[id];
	};

	this.enableScissor = function(x, y, width, height) {
		var gl = this.gl;
		if (!this._scissorEnabled) {
			gl.enable(gl.SCISSOR_TEST);
			this._scissorEnabled = true;
		}
		var s = this._activeScissor;
		if (x !== s.x || y !== s.y || width !== s.width || height !== s.height) {
			s.x = x;
			s.y = y;
			s.width = width;
			s.height = height;
			gl.scissor(x, this.height - height - y, width, height);
		}
	};

	this.disableScissor = function() {
		if (this._scissorEnabled) {
			var gl = this.gl;
			this._scissorEnabled = false;
			gl.disable(gl.SCISSOR_TEST);
			gl.scissor(0, 0, this.width, this.height);
		}
	};

	this.addToBatch = function(state, textureId) {
		if (this._drawIndex >= MAX_BATCH_SIZE - 1) { this.flush(); }
		this._drawIndex++;

		var filter = state.filter;
		var clip = state.clip;
		var clipRect = state.clipRect;

		var queuedState = this._batchIndex > -1 ? this._batchQueue[this._batchIndex] : null;
		var stateChanged = !queuedState
				|| queuedState.textureId !== textureId
				|| queuedState.globalCompositeOperation !== state.globalCompositeOperation
				|| queuedState.filter !== filter
				|| queuedState.clip !== clip
				|| queuedState.clipRect.x !== clipRect.x
				|| queuedState.clipRect.y !== clipRect.y
				|| queuedState.clipRect.width !== clipRect.width
				|| queuedState.clipRect.height !== clipRect.height;

		if (stateChanged) {
			var queueObject = this._batchQueue[++this._batchIndex];
			queueObject.textureId = textureId;
			queueObject.index = this._drawIndex;
			queueObject.globalCompositeOperation = state.globalCompositeOperation;
			queueObject.filterId = filter ? FILTERMAP[filter.getType()] : 0;
			queueObject.filter = filter;
			queueObject.clip = clip;
			queueObject.clipRect.x = clipRect.x;
			queueObject.clipRect.y = clipRect.y;
			queueObject.clipRect.width = clipRect.width;
			queueObject.clipRect.height = clipRect.height;
		}

		return this._drawIndex;
	};

	this.isPowerOfTwo = function (width, height) {
		return width > 0 && (width & (width - 1)) === 0 && height > 0 && (height & (height - 1)) === 0;
	};

	this.activate = function (ctx) {
		var gl = this.gl;
		if (ctx != this._activeCtx) {
			this.flush();
			gl.finish();
			gl.bindFramebuffer(gl.FRAMEBUFFER, ctx.frameBuffer);
			if (ctx._texture) {
				gl.bindTexture(gl.TEXTURE_2D, ctx._texture);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ctx._texture, 0);
			}
			gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
			gl.uniform2f(this._resolutionLocation, ctx.canvas.width, ctx.canvas.height);
			this._activeCtx = ctx;
		}
	};
});

var Context2D = Class(function () {

	Object.defineProperties(this, {
		globalAlpha: {
			get: function() { return this.stack.state.globalAlpha; },
			set: function(value) { this.stack.state.globalAlpha = value; }
		},
		globalCompositeOperation: {
			get: function() { return this.stack.state.globalCompositeOperation; },
			set: function(value) {
				this.stack.state.globalCompositeOperation = value;
			}
		}
	});

	this.init = function (manager, canvas) {
		this._manager = manager;
		this._gl = manager.gl;
		this.canvas = canvas;

		this.stack = new ContextStateStack();
		this.font = '11px ' + device.defaultFontFamily;
		this.frameBuffer = null;
	};

	this.createOffscreenFrameBuffer = function () {
		var gl = this._gl;

	  this.frameBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

		// this.canvas.width = 1024;
		// this.canvas.height = 1024;
		var id = this._manager.createTexture(this.canvas);
		this._texture = this._manager.getTexture(id);

		gl.bindTexture(gl.TEXTURE_2D, this._texture);

		// var renderbuffer = gl.createRenderbuffer();
		// gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
		// gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.canvas.width, this.canvas.height);

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._texture, 0);
		// gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

		this.clear();

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};

	var min = Math.min;
	var max = Math.max;

	this.loadIdentity = function() {
		this.stack.state.transform.identity();
	};

	this.setTransform = function(a, b, c, d, tx, ty) {
		this.stack.state.transform.setTo(a, b, c, d, tx, ty);
	};

	this.transform = function(a, b, c, d, tx, ty) {
		this._helperTransform.setTo(a, b, c, d, tx, ty);
		this.stack.state.transform.transform(this._helperTransform);
	};

	this.scale = function(x, y) {
		this.stack.state.transform.scale(x, y);
	};

	this.translate = function(x, y) {
		this.stack.state.transform.translate(x, y);
	};

	this.rotate = function(angle) {
		this.stack.state.transform.rotate(angle);
	};

	this.getElement = function() { return this.canvas; };

	this.reset = function() {};

	this.clear = function() {
		this._manager.activate(this);
		this._manager.flush();

		var gl = this._gl;
		gl.clear(gl.COLOR_BUFFER_BIT);
	};

	this.resize = function(width, height) {
		this.width = this.canvas.width  = width;
		this.height = this.canvas.height = height;
		this._gl.viewport(0, 0, width, height);
	};

	this.clipRect = function(x, y, width, height) {
		var m = this.stack.state.transform;
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

		var minX = min(this.width, x0, x1, x2, x3);
		var maxX = max(0, x0, x1, x2, x3);
		var minY = min(this.height, y0, y1, y2, y3);
		var maxY = max(0, y0, y1, y2, y3);

		this.stack.state.clip = true;
		var r = this.stack.state.clipRect;
		r.x = minX;
		r.y = minY;
		r.width = maxX - minX;
		r.height = maxY - minY;
	};

	this.swap = function() {
		this._manager.flush();
	};

	this.execSwap = function() {};

	this.setFilters = function(filters) {
		for (var filterId in filters) {
			this.stack.state.filter = filters[filterId];
			return;
		}
		this.stack.state.filter = null;
	};

	this.clearFilters = function() {
		this.stack.state.filter = null;
	};

	this.save = function() {
		this.stack.save();
	};

	this.restore = function() {
		this.stack.state.clip = false;
		this.stack.state.filter = null;
		this.stack.restore();
	};

	this.strokeRect = function() {};
	this.fillRect = function() {};
	this.circle = function(x, y, radius) {};
	this.drawPointSprites = function(x1, y1, x2, y2) {};
	this.roundRect = function (x, y, width, height, radius) {};
	this.measureText = function() { return {}; };//FontRenderer.wrapMeasureText(this.measureText);
	this.fillText = function() {};//FontRenderer.wrapFillText(this.fillText);
	this.strokeText = function() {};//FontRenderer.wrapStrokeText(this.strokeText);

	this.drawImage = function(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {

		if (this.globalAlpha === 0) { return; }

		var manager = this._manager;
		var width = this.canvas.width;
		var height = this.canvas.height;
		manager.activate(this);

		var m = this.stack.state.transform;
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

		// Calculate bounding box for simple culling
		var minX = min(width, x0, x1, x2, x3);
		var maxX = max(0, x0, x1, x2, x3);
		var minY = min(height, y0, y1, y2, y3);
		var maxY = max(0, y0, y1, y2, y3);

		if (minX > width || maxX <= 0 || minY > height || maxY <= 0) {
			// Offscreen, don't bother trying to draw it.
			return;
		}

		var glId = image.__GL_ID;
		if (glId === undefined || image.__needsUpload) {
			image.__needsUpload = false;
			glId = manager.createTexture(image, glId);
		}

		var drawIndex = manager.addToBatch(this.stack.state, glId);

		// TOOD: remove private access to _vertices
		var tw = image.width;
		var th = image.height;
		var vc = manager._vertices;
		var i = drawIndex * 6 * 4;

		vc[i + 0] = x0;
		vc[i + 1] = y0;
		vc[i + 2] = sx / tw; // u0
		vc[i + 3] = sy / th; // v0
		vc[i + 4] = this.globalAlpha;

		vc[i + 6] = x1;
		vc[i + 7] = y1;
		vc[i + 8] = (sx + sWidth) / tw; // u1
		vc[i + 9] = vc[i + 3]; // v1
		vc[i + 10] = this.globalAlpha;

		vc[i + 12] = x2;
		vc[i + 13] = y2;
		vc[i + 14] = vc[i + 2]; // u2
		vc[i + 15] = (sy + sHeight) / th;  // v2
		vc[i + 16] = this.globalAlpha;

		vc[i + 18] = x3;
		vc[i + 19] = y3;
		vc[i + 20] = vc[i + 8]; // u4
		vc[i + 21] = vc[i + 15]; // v4
		vc[i + 22] = this.globalAlpha;

		var filterR = 0;
		var filterG = 0;
		var filterB = 0;
		var filterA = 0;

		if (this.stack.state.filter) {
			var color = this.stack.state.filter.get();
			filterR = color.r;
			filterG = color.g;
			filterB = color.b;
			filterA = color.a * 255;
		}

		var ci = drawIndex * 4 * STRIDE;
		var cc = manager._colors;
		cc[ci + 20] = cc[ci + 44] = cc[ci + 68] = cc[ci + 92] = filterR; // R
		cc[ci + 21] = cc[ci + 45] = cc[ci + 69] = cc[ci + 93] = filterG; // G
		cc[ci + 22] = cc[ci + 46] = cc[ci + 70] = cc[ci + 94] = filterB; // B
		cc[ci + 23] = cc[ci + 47] = cc[ci + 71] = cc[ci + 95] = filterA; // A
	};

});

exports = new GLManager();
