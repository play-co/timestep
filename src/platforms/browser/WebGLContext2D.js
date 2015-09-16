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
import .FontRenderer;
import .Matrix2D;

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
			transform: new Matrix2D()
		}
	};

	Object.defineProperty(this, 'state', {
		get: function() { return this._states[this._stateIndex]; }
	});

});

exports = Class(function() {

	var MAX_BATCH_SIZE = 2000;
	var STRIDE = 20;

	var min = Math.min;
	var max = Math.max;

	Object.defineProperties(this, {
		canvas: {
			get: function() { return this._canvas; }
		},
		transform: {
			get: function() { return this.stack.state.transform; }
		},
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

	this.init = function(opts) {
		opts = opts || {};
		this.width = opts.width || device.width;
		this.height = opts.height || device.height;
		this._canvas = opts.el || document.createElement('canvas');
		this._canvas.width = this.width;
		this._canvas.height = this.height;

		this.stack = new ContextStateStack();

		this.font = '11px ' + device.defaultFontFamily;

		var gl = this.ctx = this._canvas.getContext('webgl');
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);

		this.setActiveCompositeOperation('source-over');

		this._indexCache = new Uint16Array(MAX_BATCH_SIZE * 6);
		this._vertexCache = new ArrayBuffer(MAX_BATCH_SIZE * STRIDE * 4);
		this._verticies = new Float32Array(this._vertexCache);
		this._colors = new Uint8Array(this._vertexCache);

		this._initializeShaders();
		this._initializeBuffers();

		this._helperTransform = new Matrix2D();
		this.textureCache = [];

		this._batchIndex = -1;
		this._textureQueueIndex = -1;
		this._textureQueue = new Array(MAX_BATCH_SIZE);
		for (var i = 0; i <= MAX_BATCH_SIZE; i++) {
			this._textureQueue[i] = {
				textureId: 0,
				index: 0
			};
		}
	};

	this._initializeBuffers = function() {
		var gl = this.ctx;

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
	    var colorIndex = gl.getAttribLocation(this._shaderProgram, "aColor");

		gl.vertexAttribPointer(positionIndex, 2, gl.FLOAT, false, STRIDE, 0);
		gl.vertexAttribPointer(uvIndex, 2, gl.FLOAT, false, STRIDE, 8);
		gl.vertexAttribPointer(colorIndex, 4, gl.UNSIGNED_BYTE, true, STRIDE, 16);

		gl.enableVertexAttribArray(positionIndex);
		gl.enableVertexAttribArray(uvIndex);
		gl.enableVertexAttribArray(colorIndex);
	};

	this._initializeShaders = function() {
	  	var gl = this.ctx;
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

		var resolutionLocation = gl.getUniformLocation(this._shaderProgram, "uResolution");
		gl.uniform2f(resolutionLocation, this._canvas.width, this._canvas.height);

		gl.blendEquation(gl.FUNC_ADD);
		gl.activeTexture(gl.TEXTURE0);
		gl.uniform1i(gl.getUniformLocation(this._shaderProgram, "uSampler"), 0);
	};

	this.createVertexShader = function() {
		var gl = this.ctx;
		var src = [
		    'precision lowp float;',
			'attribute vec2 aTextureCoord;',
			'attribute vec2 aPosition;',
			'attribute vec4 aColor;',
			'uniform vec2 uResolution;',
			'varying vec2 vTextureCoord;',
			'varying vec4 vColor;',
			'void main() {',
			'	vTextureCoord = aTextureCoord;',
			'	vec2 clipSpace = (aPosition / uResolution) * 2.0 - 1.0;',
			'	vColor = aColor;',
			'	gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);',
			'}'
		].join("\n");

		var shader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);

		return shader;
	};

	this.createFragmentShader = function() {
		var gl = this.ctx;
		var src = [
		    'precision lowp float;',
			'varying vec2 vTextureCoord;',
			'varying vec4 vColor;',
			'uniform sampler2D uSampler;',
		    'void main(void) {',
		  	'  gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor;',
		    '}'
		].join("\n");

		var shader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);

		return shader;
	};

	this.loadIdentity = function() {
		this.transform.identity();
	};

	this.getElement = function() { return this._canvas; };

	this.reset = function() {};

	this.clear = function() {
		this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);
	};

	this.resize = function(width, height) {
		this.width = this.canvas.width  = width;
		this.height = this.canvas.height = height;
		this.ctx.viewport(0, 0, width, height);
	};

	this.clipRect = function(x, y, width, height) {};

	this.swap = function() {
		this.flush();
	};

	this.execSwap = function() {};

	this.setFilters = function(filters) {};

	this.clearFilters = function() {};

	this.save = function() {
		this.stack.save();
	};

	this.restore = function() {
		this.stack.restore();
	};

	this.drawImage = function(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
		var gl = this.ctx;
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

		// Calculate bounding box for simple culling
		var minX = min(this.width, x0, x1, x2, x3);
		var maxX = max(0, x0, x1, x2, x3);
		var minY = min(this.height, y0, y1, y2, y3);
		var maxY = max(0, y0, y1, y2, y3);

		if (minX > this.width || maxX <= 0 || minY > this.height || maxY <= 0) {
			// Offscreen, don't bother trying to draw it.
			return;
		}

		var glId = image.__GL_ID;
		if (glId === undefined) {
			glId = this.createTexture(image);
		}

		this.addToBatch(glId);

		var tw = image.width;
		var th = image.height;
		var vc = this._verticies;
		var i = this._batchIndex * 5 * 4;

		vc[i + 0] = x0;
		vc[i + 1] = y0;
		vc[i + 2] = sx / tw; // u0
		vc[i + 3] = sy / th; // v0

		vc[i + 5] = x1;
		vc[i + 6] = y1;
		vc[i + 7] = (sx + sWidth) / tw; // u1
		vc[i + 8] = vc[i + 3]; // v1

		vc[i + 10] = x2;
		vc[i + 11] = y2;
		vc[i + 12] = vc[i + 2]; // u2
		vc[i + 13] = (sy + sHeight) / th;  // v2

		vc[i + 15] = x3;
		vc[i + 16] = y3;
		vc[i + 17] = vc[i + 7]; // u4
		vc[i + 18] = vc[i + 13]; // v4

		var ci = this._batchIndex * 4 * STRIDE;
		var cc = this._colors;
		cc[ci + 16] = cc[ci + 36] = cc[ci + 56] = cc[ci + 76] = 255; // R
		cc[ci + 17] = cc[ci + 37] = cc[ci + 57] = cc[ci + 77] = 255; // G
		cc[ci + 18] = cc[ci + 38] = cc[ci + 58] = cc[ci + 78] = 255; // B
		cc[ci + 19] = cc[ci + 39] = cc[ci + 59] = cc[ci + 79] = 255 * this.globalAlpha; // A
	};

	this.setActiveCompositeOperation = function(op) {

		op = op || 'source-over';
		if (this._activeCompositeOperation === op) { return; }
		this._activeCompositeOperation = op;

		var gl = this.ctx;
		var source;
		var destination;

		switch(op) {
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

			    case 'source_over':
			        source = gl.ONE;
			        destination = gl.ONE_MINUS_SRC_ALPHA;
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
			    default:
			        source = gl.ONE;
			        destination = gl.ONE_MINUS_SRC_ALPHA;
			        break;
		}
		gl.blendFunc(source, destination);
	};

	this.flush = function() {
		if (this._textureQueueIndex === -1) { return; }

		var gl = this.ctx;
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._vertexCache);

		this._textureQueue[this._textureQueueIndex + 1].index = this._batchIndex + 1;

		for (var i = 0; i <= this._textureQueueIndex; i++) {
			var curQueueObj = this._textureQueue[i];
			gl.bindTexture(gl.TEXTURE_2D, this.textureCache[curQueueObj.textureId]);
			this.setActiveCompositeOperation(curQueueObj.globalCompositeOperation);
			var start = curQueueObj.index;
			var next = this._textureQueue[i + 1].index;
			gl.drawElements(gl.TRIANGLES, (next - start) * 6, gl.UNSIGNED_SHORT, start * 12);
		}

		this._batchIndex = -1;
		this._textureQueueIndex = -1;
	};

	this.createTexture = function(image) {
		var id = this.textureCache.length;
		var gl = this.ctx;
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
		this.textureCache[id] = texture;
		image.__GL_ID = id;
		return id;
	};

	this.setTransform = function(a, b, c, d, tx, ty) {
		this.transform.setTo(a, b, c, d, tx, ty);
	};

	this.transform = function(a, b, c, d, tx, ty) {
		this._helperTransform.setTo(a, b, c, d, tx, ty);
		this.transform.transform(this._helperTransform);
	};

	this.scale = function(x, y) {
		this.transform.scale(x, y);
	};

	this.translate = function(x, y) {
		this.transform.translate(x, y);
	};

	this.rotate = function(angle) {
		this.transform.rotate(angle);
	};

	this.strokeRect = function() {};
	this.fillRect = function() {};
	this.circle = function(x, y, radius) {};
	this.drawPointSprites = function(x1, y1, x2, y2) {};
	this.roundRect = function (x, y, width, height, radius) {};
	this.fillText = function() {};
	this.strokeText = function() {};

	this.measureText = FontRenderer.wrapMeasureText;

	this.addToBatch = function(textureId) {
		if (this._batchIndex >= MAX_BATCH_SIZE - 1) { this.flush(); }
		this._batchIndex++;

		var stateChanged = this._textureQueueIndex === -1;
		if (!stateChanged) {
			var currentState = this._textureQueue[this._textureQueueIndex];
			stateChanged = currentState.textureId !== textureId || currentState.globalCompositeOperation !== this.globalCompositeOperation;
		}

		if (stateChanged) {
			var queueObject = this._textureQueue[++this._textureQueueIndex];
			queueObject.textureId = textureId;
			queueObject.index = this._batchIndex;
			queueObject.globalCompositeOperation = this.globalCompositeOperation;
		}
	};

});
