var STRIDE = 24;

var Shader = Class(function() {

  this.init = function(opts) {

    var gl = this._gl = opts.gl;

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

    var useTexture = opts.useTexture !== undefined ? opts.useTexture : true;

    this.attributes = {
      aTextureCoord: 0,
      aPosition: 0,
      aAlpha: 0,
      aColor: 0
    };

    this.uniforms = {
      uSampler: useTexture ? 0 : -1,
      uResolution: 0
    };

    this.initGL();
  };

  this.initGL = function() {
    this.createProgram();
    this.updateLocations();
  };

  this.updateLocations = function() {
    var gl = this._gl;
    for (var attrib in this.attributes) {
      if (this.attributes[attrib] !== -1) {
        this.attributes[attrib] = gl.getAttribLocation(this.program, attrib);
      }
    }
    for (var uniform in this.uniforms) {
      if (this.uniforms[uniform] !== -1) {
        this.uniforms[uniform] = gl.getUniformLocation(this.program, uniform);
      }
    }
  };

  this.enableVertexAttribArrays = function() {
    var gl = this._gl;
    for (var attrib in this.attributes) {
      if (this.attributes[attrib] !== -1) {
        var index = this.attributes[attrib];
        gl.enableVertexAttribArray(index);
        switch(attrib) {
          case "aPosition": gl.vertexAttribPointer(index, 2, gl.FLOAT, false, STRIDE, 0); break;
          case "aTextureCoord": gl.vertexAttribPointer(index, 2, gl.FLOAT, false, STRIDE, 8); break;
          case "aAlpha": gl.vertexAttribPointer(index, 1, gl.FLOAT, false, STRIDE, 16); break;
          case "aColor": gl.vertexAttribPointer(index, 4, gl.UNSIGNED_BYTE, true, STRIDE, 20); break;
        }
      }
    }
  };

  this.disableVertexAttribArrays = function() {
    for (var attrib in this.attributes) {
      if (this.attributes[attrib] !== -1) {
        gl.disableVertexAttribArray(this.attributes[attrib]);
      }
    }
  };

  this.createProgram = function() {
    gl = this._gl;

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, this._vertexSrc);
    gl.compileShader(vertexShader);

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, this._fragmentSrc);
    gl.compileShader(fragmentShader);

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.log("Could not initialize shaders");
    }

    this.program = program;
  };

});

var LinearAddShader = Class(Shader, function() {

  this.init = function(opts) {
    opts.fragmentSrc = [
      'precision mediump float;',
      'varying vec2 vTextureCoord;',
      'varying float vAlpha;',
      'varying vec4 vColor;',
      'uniform sampler2D uSampler;',
      'void main(void) {',
      ' vec4 vSample = texture2D(uSampler, vTextureCoord);',
      ' gl_FragColor = vec4((vSample.rgb + vColor.rgb * vColor.a) * vSample.a, vSample.a) * vAlpha;',
      '}'
    ].join("\n");
    Shader.prototype.init.call(this, opts);
  };

});

var TintShader = Class(Shader, function(supr) {

  this.init = function(opts) {
    opts.fragmentSrc = [
      'precision mediump float;',
      'varying vec2 vTextureCoord;',
      'varying float vAlpha;',
      'varying vec4 vColor;',
      'uniform sampler2D uSampler;',
      'void main(void) {',
      ' vec4 vSample = texture2D(uSampler, vTextureCoord);',
      ' gl_FragColor = vec4((vSample.rgb * (1.0 - vColor.a) + (vColor.rgb * vColor.a)) * vSample.a * vAlpha, vSample.a * vAlpha);',
      '}'
    ].join("\n");
    Shader.prototype.init.call(this, opts);
  };

});

var MultiplyShader = Class(Shader, function(supr) {

  this.init = function(opts) {
    opts.fragmentSrc = [
      'precision mediump float;',
      'varying vec2 vTextureCoord;',
      'varying float vAlpha;',
      'varying vec4 vColor;',
      'uniform sampler2D uSampler;',
      'void main(void) {',
      ' vec4 vSample = texture2D(uSampler, vTextureCoord);',
      ' gl_FragColor = vec4(vSample.rgb * (vColor.rgb * vColor.a), vSample.a) * vAlpha;',
      '}'
    ].join("\n");
    Shader.prototype.init.call(this, opts);
  };

});

var RectShader = Class(Shader, function(supr) {

  this.init = function(opts) {
    opts.fragmentSrc = [
      'precision mediump float;',
      'varying float vAlpha;',
      'varying vec4 vColor;',
      'void main(void) {',
      ' gl_FragColor = vColor * vColor.a * vAlpha;',
      '}'
    ].join("\n");
    opts.useTexture = false;
    Shader.prototype.init.call(this, opts);
  };

});

exports = {
  DefaultShader: Shader,
  LinearAddShader: LinearAddShader,
  TintShader: TintShader,
  MultiplyShader: MultiplyShader,
  RectShader: RectShader
};