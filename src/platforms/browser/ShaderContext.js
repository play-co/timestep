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
 * @package timestep.env.browser.Canvas;
 *
 * Canvas implementation for browsers. Wraps a Context2D.
 */

import .webgl.WebGLShaderContext as WebGLShaderContext;
import .webgl.WebGLContext2D as WebGLContext2D;

exports = Class(function () {
  this.init = function (opts) {

    var isWebGL = CONFIG.useWebGL && WebGLContext2D.isSupported;

    if (!isWebGL) {
      console.log("Shaders not supported in Canvas mode, webgl required");
      return;
    }


    this.ctx = WebGLShaderContext;
  };

  this.applyUniforms = function(uniforms) {
    this.ctx.applyUniforms(uniforms);
  };

  this.createProgram = function(vertexSrc, fragmentSrc) {
    return this.ctx.createProgram(vertexSrc, fragmentSrc);
  };

  this.updateLocations = function(attributes, uniforms, program) {
    this.ctx.updateLocations(attributes, uniforms, program);
  };

  this.enableVertexAttribArrays = function(attributes) {
    this.ctx.enableVertexAttribArrays(attributes);
  };

  this.disableVertexAttribArrays = function(attributes) {
    this.ctx.disableVertexAttribArrays(attributes);
  };

});