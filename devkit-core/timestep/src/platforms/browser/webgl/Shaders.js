let exports = {};

var STRIDE = 24;

var vertexShaderDefault = [
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
].join('\n');

var fragmentShaderDefault = [
  'precision mediump float;',
  'varying vec2 vTextureCoord;',
  'varying float vAlpha;',
  'uniform sampler2D uSampler;',
  'void main(void) {',
  ' gl_FragColor = texture2D(uSampler, vTextureCoord) * vAlpha;',
  '}'
].join('\n');

class Shader {

  constructor (opts) {
    this._gl = opts.gl;

    this._vertexSrc = opts.vertexSrc || vertexShaderDefault;

    this._fragmentSrc = opts.fragmentSrc || fragmentShaderDefault;

    var useTexture = opts.useTexture !== undefined ? opts.useTexture : true;

    this.attributes = {
      aTextureCoord: 0,
      aPosition: 0,
      aAlpha: 0,
      aColor: 0
    };

    this.lastAttributeIndex = Object.keys(this.attributes).length - 1;
    this.enabledAttributes = [];

    this.uniforms = opts.uniforms || {
      uSampler: useTexture ? 0 : -1,
      uResolution: 0
    };

    this.initGL();
  }
  initGL () {
    this.createProgram();
    this.updateLocations();
  }

  updateLocations () {
    var gl = this._gl;

    this.enabledAttributes = [];
    for (var i = 0; i < this.lastAttributeIndex; ++i) {
      this.enabledAttributes[i] = false;
    }

    for (var attrib in this.attributes) {
      if (this.attributes[attrib] !== -1) {
        this.attributes[attrib] = gl.getAttribLocation(this.program, attrib);
      }

      var a = this.attributes[attrib];
      this.enabledAttributes[a] = a >= 0;
    }
    for (var uniform in this.uniforms) {
      if (this.uniforms[uniform] !== -1) {
        this.uniforms[uniform] = gl.getUniformLocation(this.program, uniform);
      }
    }
  }

  useProgram (ctx) {
    var gl = this._gl;

    gl.useProgram(this.program);

    var uniforms = this.uniforms;
    gl.uniform2f(uniforms.uResolution, ctx.width, ctx.height);
    if (uniforms.uSampler !== -1) {
      gl.uniform1i(uniforms.uSampler, 0);
    }

    gl.vertexAttribPointer(this.attributes.aPosition, 2, gl.FLOAT, false, STRIDE, 0);

    if (this.attributes.aTextureCoord >= 0) {
      gl.vertexAttribPointer(this.attributes.aTextureCoord, 2, gl.FLOAT, false, STRIDE, 8);
    }

    if (this.attributes.aAlpha >= 0) {
      gl.vertexAttribPointer(this.attributes.aAlpha, 1, gl.FLOAT, false, STRIDE, 16);
    }

    if (this.attributes.aColor >= 0) {
      gl.vertexAttribPointer(this.attributes.aColor, 4, gl.UNSIGNED_BYTE, true, STRIDE, 20);
    }
  }

  createProgram () {
    var gl = this._gl;

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
      console.log('Could not initialize shaders');

      var vertexCompilationLog = gl.getShaderInfoLog(vertexShader);
      if (vertexCompilationLog) {
        console.log('Vertex shader compiler log: ' + vertexCompilationLog);
      }

      var fragmentCompilationLog = gl.getShaderInfoLog(fragmentShader);
      if (fragmentCompilationLog) {
        console.log('Fragment shader compiler log: ' + fragmentCompilationLog);
      }
    }

    this.program = program;
  }
}

class LinearAddShader extends Shader {
  constructor (opts) {
    opts.fragmentSrc = [
      'precision mediump float;',
      'varying vec2 vTextureCoord;',
      'varying float vAlpha;',
      'varying vec4 vColor;',
      'uniform sampler2D uSampler;',
      'void main(void) {',
      ' vec4 vSample = texture2D(uSampler, vTextureCoord);',
      ' gl_FragColor = vec4(vSample.rgb + (vColor.rgb * vColor.a * vSample.a), vSample.a) * vAlpha;',
      '}'
    ].join('\n');
    super(opts);
  }
}

class TintShader extends Shader {
  constructor (opts) {
    opts.fragmentSrc = [
      'precision mediump float;',
      'varying vec2 vTextureCoord;',
      'varying float vAlpha;',
      'varying vec4 vColor;',
      'uniform sampler2D uSampler;',
      'void main(void) {',
      ' vec4 vSample = texture2D(uSampler, vTextureCoord);',
      ' gl_FragColor = vec4((vSample.rgb * (1.0 - vColor.a) + (vColor.rgb * vColor.a * vSample.a)) * vAlpha, vSample.a * vAlpha);',
      '}'
    ].join('\n');
    super(opts);
  }
}

class MultiplyShader extends Shader {
  constructor (opts) {
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
    ].join('\n');
    super(opts);
  }
}

class RectShader extends Shader {
  constructor (opts) {
    opts.fragmentSrc = [
      'precision mediump float;',
      'varying float vAlpha;',
      'varying vec4 vColor;',
      'void main(void) {',
      ' gl_FragColor = vColor * vColor.a * vAlpha;',
      '}'
    ].join('\n');
    opts.useTexture = false;
    super(opts);
  }
}

exports = {
  DefaultShader: Shader,
  LinearAddShader: LinearAddShader,
  TintShader: TintShader,
  MultiplyShader: MultiplyShader,
  RectShader: RectShader
};

export default exports;
