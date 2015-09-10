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

		this.ctx = this._canvasElement.getContext('webgl');
		this.ctx.clearColor(0.0, 0.0, 0.0, 1.0);

		this._vertexCache = new Float32Array(12);

		this._vertexBuffer = null;
		this._shaderProgram = null;
		this._initializeShaders();
		this._initializeBuffers();

	};

	this._initializeBuffers = function() {
		var gl = this.ctx;
		this._vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    this._shaderProgram.vertexPositionAttribute = gl.getAttribLocation(this._shaderProgram, "a_position");
    gl.enableVertexAttribArray(this._shaderProgram.vertexPositionAttribute);
		gl.vertexAttribPointer(this._shaderProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
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
	}

  this.createVertexShader = function() {
  	var gl = this.ctx;
  	var src = [
			'attribute vec2 a_position;',
			'uniform vec2 u_resolution;',
			'void main() {',
			'	vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;',
			'	gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);',
			'}'
		].join("\n");

		var shader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);

		return shader;
  }

  this.createFragmentShader = function() {
  	var gl = this.ctx;
  	var src = [
	    'precision mediump float;',
	    'uniform vec4 u_color;',
	    'void main(void) {',
      '  gl_FragColor = u_color;',
	    '}'
  	].join("\n");

		var shader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);

		return shader;
  }

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

	var blah = 0;
	this.drawImage = function(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
		var gl = this.ctx;

		// if (Math.random() < 0.05) { gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); }

		var colorLocation = gl.getUniformLocation(this._shaderProgram, "u_color");
		blah++;
		if (blah > 255) { blah = 0; }
		gl.uniform4f(colorLocation, 1.0, blah / 256, 1.0, 1);

		var vc = this._vertexCache;
		var dx2 = dx + dWidth;
		var dy2 = dy + dHeight;
		vc[0] = dx;
		vc[1] = dy;
		vc[2] = dx2;
		vc[3] = dy;
		vc[4] = dx;
		vc[5] = dy2;
		vc[6] = dx;
		vc[7] = dy2;
		vc[8] = dx2;
		vc[9] = dy;
		vc[10] = dx2;
		vc[11] = dy2;
		gl.bufferData(gl.ARRAY_BUFFER, vc, gl.STATIC_DRAW);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	};

	this.setTransform = function() {};

});
