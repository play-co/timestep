export default class Matrix2D {
  constructor () {
    this.identity();
  }
  identity () {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.tx = 0;
    this.ty = 0;
  }
  clone () {
    var result = new Matrix2D();
    result.copy(this);
    return result;
  }
  copy (matrix) {
    this.a = matrix.a;
    this.b = matrix.b;
    this.c = matrix.c;
    this.d = matrix.d;
    this.tx = matrix.tx;
    this.ty = matrix.ty;
  }
  scale (x, y) {
    this.a *= x;
    this.b *= x;
    this.c *= y;
    this.d *= y;
  }
  rotate (angle) {
    var a = this.a;
    var b = this.b;
    var c = this.c;
    var d = this.d;
    var sinA = Math.sin(angle);
    var cosA = Math.cos(angle);
    this.a = a * cosA + c * sinA;
    this.b = b * cosA + d * sinA;
    this.c = a * -sinA + c * cosA;
    this.d = b * -sinA + d * cosA;
  }
  translate (x, y) {
    this.tx += this.a * x + this.c * y;
    this.ty += this.b * x + this.d * y;
  }
  transform (matrix) {
    var a = this.a;
    var b = this.b;
    var c = this.c;
    var d = this.d;
    var tx = this.tx;
    var ty = this.ty;

    if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) {
      this.a = a * matrix.a + c * matrix.b;
      this.b = b * matrix.a + d * matrix.b;
      this.c = a * matrix.c + c * matrix.d;
      this.d = b * matrix.c + d * matrix.d;
    }

    this.tx = a * matrix.tx + c * matrix.ty + tx;
    this.ty = b * matrix.tx + d * matrix.ty + ty;

    return this;
  }
  setTo (a, b, c, d, tx, ty) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }
  invert () {
    var dtr = this.a * this.d - this.b * this.c;
    if (dtr === 0) {
      return;
    }

    dtr = 1 / dtr;

    var a = this.a;
    var b = this.b;
    var c = this.c;
    var d = this.d;
    var tx = this.tx;
    var ty = this.ty;

    this.a = d * dtr;
    this.b = -b * dtr;
    this.c = -c * dtr;
    this.d = a * dtr;
    this.tx = (c * ty - d * tx) * dtr;
    this.ty = (b * tx - a * ty) * dtr;

    return this;
  }
  isEqualTo (matrix) {
    return this.a === matrix.a && this.b === matrix.b && this.c === matrix.c &&
      this.d === matrix.d && this.tx === matrix.tx && this.ty === matrix.ty;
  }
  concat (matrix) {
    var a = this.a;
    var b = this.b;
    var c = this.c;
    var d = this.d;
    var tx = this.tx;
    var ty = this.ty;

    if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) {
      this.a = a * matrix.a + c * matrix.b;
      this.b = b * matrix.a + d * matrix.b;
      this.c = a * matrix.c + c * matrix.d;
      this.d = b * matrix.c + d * matrix.d;
    }

    this.tx = matrix.a * tx + matrix.c * ty + matrix.tx;
    this.ty = matrix.b * tx + matrix.d * ty + matrix.ty;

    return this;
  }
}
