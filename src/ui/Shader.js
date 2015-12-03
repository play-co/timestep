import device;
import ui.resource.Image as Image;

var ShaderContext = device.get("ShaderContext");


var Shader = exports = Class(function() {

  this.init = function(opts) {

    this._vertexSrc = opts.vertexSrc || [
      'precision mediump float;',
      'attribute vec2 aTextureCoord;',
      'attribute vec2 aPosition;',
      'attribute vec4 aColor;',
      'attribute float aAlpha;',
      'uniform vec2 uResolution;',
      'varying vec2 vTextureCoord;',
      'varying float vAlpha;',
      'varying vec4 vColor;',
      'void main() {',
      ' vTextureCoord = aTextureCoord;',
      ' vColor = aColor;',
      ' vAlpha = aAlpha;',
      ' vec2 clipSpace = (aPosition / uResolution) * 2.0 - 1.0;',
      ' gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);',
      '}'
    ].join("\n");

    this._fragmentSrc = opts.fragmentSrc || [
      'precision mediump float;',
      'varying vec2 vTextureCoord;',
      'varying float vAlpha;',
      'uniform sampler2D uSampler;',
      'void main(void) {',
      ' gl_FragColor = texture2D(uSampler, vTextureCoord) * vAlpha;',
      '}'
    ].join("\n");


    this.uniforms = merge(opts.uniforms, {
      uResolution: {
        type: "2f",
        value: [0, 0]
      }
    });

    for (var key in this.uniforms) {
      this.uniforms[key].id = 0;
      // For texture, we need to turn a url to an image
      if (this.uniforms[key].type === "t") {
        var uniform = this.uniforms[key];
        if (typeof uniform.value === "string") {
          uniform.value = new Image({
            url: uniform.value
          }).getSource();
        }
      }
    };

    this.attributes = {
      aTextureCoord: 0,
      aPosition: 0,
      aAlpha: 0,
      aColor: 0
    };

    this._ctx = new ShaderContext();

    this.program = this._ctx.createProgram(this._vertexSrc, this._fragmentSrc);
    this.updateLocations();
  };


  this.setUniform = function(key, value) {
    if (this.uniforms[key]) {
      this.uniforms[key].value = value;
    }
  }

  this.getProgram = function() {
    return this.program;
  };

  this.getUniforms = function() {
    return this.uniforms;
  };

  this.applyUniforms = function() {
    this._ctx.applyUniforms(this.uniforms);
  }

  this.updateLocations = function() {
    this._ctx.updateLocations(this.attributes, this.uniforms, this.program);
    console.log("updated uniforms", this.uniforms);
  };

  this.enableVertexAttribArrays = function() {
    this._ctx.enableVertexAttribArrays(this.attributes);
  };

  this.disableVertexAttribArrays = function() {
    this._ctx.disableVertexAttribArrays(this.attributes);
  };

});