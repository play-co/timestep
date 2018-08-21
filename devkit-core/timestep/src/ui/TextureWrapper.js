import WebGLContext2D from 'platforms/browser/webgl/WebGLContext2D';

export default class TextureWrapper {
  constructor (image) {
    this.setImage(image);
  }

  setImage (image) {
    this.image = image;
    this.texture = WebGLContext2D.createTexture(image);
    this.width = image.width;
    this.height = image.height;
    this.__needsUpload = false;
  }
}
