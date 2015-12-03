import .WebGLContext2D as WebGLContext2D;

var STRIDE = 24;

var ShaderContext = Class(function() {

  this.init = function(glManager) {
    this._glManager = glManager;
  };

  this.createProgram = function(vertexSrc, fragmentSrc) {
    var gl = this._glManager.getGl();

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSrc);
    gl.compileShader(vertexShader);

    var compiled = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
    if (!compiled) {
      var compilationLog = gl.getShaderInfoLog(vertexShader);
      console.log("Vertex shader compilation failed", compilationLog);
    }

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSrc);
    gl.compileShader(fragmentShader);

    compiled = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
    if (!compiled) {
      var compilationLog = gl.getShaderInfoLog(fragmentShader);
      console.log("Fragment shader compilation failed", compilationLog);     
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.log("Could not initialize shaders");
      return null;
    }

    return program;
  };

  this.applyUniforms = function(uniforms) {

    var gl = this._glManager.getGl();
    var textureIndex = 0;
    for (var key in uniforms) {
      var uniform = uniforms[key];
      switch (uniform.type) {
        case "f":
          gl.uniform1f(uniform.id, uniform.value);
          break;
        case "2f":
          gl.uniform2f(uniform.id, uniform.value[0], uniform.value[1]);
          break;
        case "3f":
          gl.uniform3f(uniform.id, uniform.value[0], uniform.value[1], uniform.value[2]);
          break;
        case "4f":
          gl.uniform4f(uniform.id, uniform.value[0], uniform.value[1], uniform.value[2], uniform.value[3]);
          break;
        case "t":
          this.setActiveTexture(textureIndex);
          var sourceImage = uniform.value;
          var glId = sourceImage.__GL_ID;
          if (glId === undefined || sourceImage.__needsUpload) {
            // Invalid image? Early out if so.
            if (sourceImage.width === 0 || sourceImage.height === 0 || !sourceImage.complete) { return; }
            sourceImage.__needsUpload = false;
            console.log("No gl texture, creating");
            glId = this._glManager.createTexture(sourceImage, glId);
          }
          this._glManager.bindTexture(glId);
          gl.uniform1i(uniform.id, textureIndex);
          textureIndex++;
          break;
      }
    }

    if (textureIndex > 1) {
      gl.activeTexture(gl.TEXTURE0);
    }
  };

  this.setActiveTexture = function(index) {
    gl.activeTexture(gl.TEXTURE0 + index);
  }

  this.updateLocations = function(attributes, uniforms, program) {
    var gl = this._glManager.getGl();
    for (var attrib in attributes) {
      if (attributes[attrib] !== -1) {
        attributes[attrib] = gl.getAttribLocation(program, attrib);
      }
    }
    for (var uniform in uniforms) {
      if (uniforms[uniform] !== -1) {
        uniforms[uniform].id = gl.getUniformLocation(program, uniform);
      }
    }
  };

  this.enableVertexAttribArrays = function(attributes) {
    var gl = this._glManager.getGl();
    for (var attrib in attributes) {
      if (attributes[attrib] !== -1) {
        var index = attributes[attrib];
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

  this.disableVertexAttribArrays = function(attributes) {
    var gl = this._glManager.getGl();
    for (var attrib in attributes) {
      if (attributes[attrib] !== -1) {
        gl.disableVertexAttribArray(attributes[attrib]);
      }
    }
  };

});

exports = new ShaderContext(WebGLContext2D);