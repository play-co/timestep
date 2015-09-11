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

exports = Class(function() {

	var MAX_BATCH_SIZE = 2000;

	Object.defineProperty(this, 'canvas', {
		get: function() { return this._canvasElement; }
	});

	this.init = function(opts) {
		opts = opts || {};
		this._canvasElement = opts.el || document.createElement('canvas');
		this._canvasElement.width = opts.width || device.width;
		this._canvasElement.height = opts.height || device.height;
		this.font = '11px ' + device.defaultFontFamily;

		var gl = this.ctx = this._canvasElement.getContext('webgl');
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);

		this._vertexCache = new ArrayBuffer(16 * 4);
		this._verticies = new Float32Array(this._vertexCache);
		this._indexCache = new Uint16Array(6);
		this._indexCache[0] = 0;
		this._indexCache[1] = 2;
		this._indexCache[2] = 3;
		this._indexCache[3] = 0;
		this._indexCache[4] = 1;
		this._indexCache[5] = 2;

		this._vertexBuffer = null;
		this._uvBuffer = null;
		this._shaderProgram = null;
		this._initializeShaders();
		this._initializeBuffers();

		this._transform = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
		this.textureCache = [];

		this.ctx.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	};

	this._initializeBuffers = function() {
		var gl = this.ctx;

		this._indexBuffer = gl.createBuffer();
		this._vertexBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
	    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this._indexCache, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this._vertexCache, gl.DYNAMIC_DRAW);


	    var positionIndex = gl.getAttribLocation(this._shaderProgram, "a_position");
	    var uvIndex = gl.getAttribLocation(this._shaderProgram, "a_texture_coord");

		gl.vertexAttribPointer(positionIndex, 2, gl.FLOAT, false, 16, 0);
		gl.vertexAttribPointer(uvIndex, 2, gl.FLOAT, false, 16, 8);
		gl.enableVertexAttribArray(0);
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

		var resolutionLocation = gl.getUniformLocation(this._shaderProgram, "u_resolution");
		gl.uniform2f(resolutionLocation, this._canvasElement.width, this._canvasElement.height);

		var colorLocation = gl.getUniformLocation(this._shaderProgram, "u_color");
		gl.uniform4f(colorLocation, 1.0, 1.0, 1.0, 1.0);
	};

	this.createVertexShader = function() {
		var gl = this.ctx;
		var src = [
			'attribute vec2 a_texture_coord;',
			'attribute vec2 a_position;',
			'uniform vec2 u_resolution;',
			'varying highp vec2 v_texture_coord;',
			'void main() {',
			'	v_texture_coord = a_texture_coord;',
			'	vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;',
			'	gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);',
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
		    'precision mediump float;',
			'varying highp vec2 v_texture_coord;',
			'uniform sampler2D u_sampler;',
			'uniform vec4 u_color;',
		    'void main(void) {',
		  	// '  gl_FragColor = texture2D(u_sampler, vec2(v_texture_coord.s, v_texture_coord.t));',
		  	'  gl_FragColor = u_color;',
		    '}'
		].join("\n");

		var shader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);

		return shader;
	};

	this.getElement = function() { return this._canvasElement; };

	this.reset = function() {};

	this.clear = function() {};

	this.clipRect = function(x, y, width, height) {};

	this.swap = function() {};

	this.execSwap = function() {};

	this.circle = function(x, y, radius) {};

	this.drawPointSprites = function(x1, y1, x2, y2) {};

	this.roundRect = function (x, y, width, height, radius) {};

	this.loadIdentity = function() {};

	this.measureText = function() {};

	this.fillText = function() {};

	this.strokeText = function() {};

	this.setFilters = function(filters) {};

	this.clearFilters = function() {};

	this.save = function() {};

	this.restore = function() {};

	this.drawImage = function(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
		var gl = this.ctx;

		var glId = image.__GL_ID;
		if (glId === undefined) {
			glId = this.createTexture(image);
		}

		var texture = this.textureCache[glId];
		this.setActiveTexture(texture);

		var vc = this._verticies;
		var dxW = dx + dWidth;
		var dyH = dy + dHeight;

		m = this._transform;
		var x0 = dx * m.a + dy * m.c + m.tx;
		var y0 = dx * m.b + dy * m.d + m.ty;
		var x1 = dxW * m.a + dy * m.c + m.tx;
		var y1 = dxW * m.b + dy * m.d + m.ty;
		var x2 = dx * m.a + dyH * m.c + m.tx;
		var y2 = dx * m.b + dyH * m.d + m.ty;
		var x3 = dxW * m.a + dyH * m.c + m.tx;
		var y3 = dxW * m.b + dyH * m.d + m.ty;

		var tw = image.width;
		var th = image.height;
		var u0 = sx / tw;
		var v0 = sy / th;
		var u1 = (sx + sWidth) / tw;
		var v1 = v0;
		var u2 = u0;
		var v2 = (sy + sHeight) / th;
		var u3 = u1;
		var v3 = v2;

		vc[0] = x0;
		vc[1] = y0;
		vc[2] = u0;
		vc[3] = v0;
		vc[4]

		vc[4] = x1;
		vc[5] = y1;
		vc[6] = u1;
		vc[7] = v1;

		vc[8] = x2;
		vc[9] = y2;
		vc[10] = u2;
		vc[11] = v2;

		vc[12] = x3;
		vc[13] = y3;
		vc[14] = u3;
		vc[15] = v3;

		gl.bufferData(gl.ARRAY_BUFFER, this._vertexCache, gl.DYNAMIC_DRAW);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
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

	this.setActiveTexture = function(texture) {
		var gl = this.ctx;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(gl.getUniformLocation(this._shaderProgram, "u_sampler"), 0);
  	};

	this.setTransform = function(a, b, c, d, tx, ty) {
		var m = this._transform;
		m.a = a;
		m.b = b;
		m.c = c;
		m.d = d;
		m.tx = tx;
		m.ty = ty;
	};

});
