let exports = {};

var sin = Math.sin;
var cos = Math.cos;

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
    var sinA = sin(angle);
    var cosA = cos(angle);
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
    helperMatrix.copy(this);

    if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) {
      this.a = helperMatrix.a * matrix.a + helperMatrix.c * matrix.b;
      this.b = helperMatrix.b * matrix.a + helperMatrix.d * matrix.b;
      this.c = helperMatrix.a * matrix.c + helperMatrix.c * matrix.d;
      this.d = helperMatrix.b * matrix.c + helperMatrix.d * matrix.d;
    }

    this.tx = helperMatrix.a * matrix.tx + helperMatrix.c * matrix.ty +
      helperMatrix.tx;
    this.ty = helperMatrix.b * matrix.tx + helperMatrix.d * matrix.ty +
      helperMatrix.ty;

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
    helperMatrix.copy(this);

    this.a = helperMatrix.d * dtr;
    this.b = -helperMatrix.b * dtr;
    this.c = -helperMatrix.c * dtr;
    this.d = helperMatrix.a * dtr;
    this.tx = (helperMatrix.c * helperMatrix.ty - helperMatrix.d *
      helperMatrix.tx) * dtr;
    this.ty = (helperMatrix.b * helperMatrix.tx - helperMatrix.a *
      helperMatrix.ty) * dtr;

    return this;
  }
  isEqualTo (matrix) {
    return this.a === matrix.a && this.b === matrix.b && this.c === matrix.c &&
      this.d === matrix.d && this.tx === matrix.tx && this.ty === matrix.ty;
  }
  concat (matrix) {
    helperMatrix.copy(this);

    if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) {
      this.a = helperMatrix.a * matrix.a + helperMatrix.c * matrix.b;
      this.b = helperMatrix.b * matrix.a + helperMatrix.d * matrix.b;
      this.c = helperMatrix.a * matrix.c + helperMatrix.c * matrix.d;
      this.d = helperMatrix.b * matrix.c + helperMatrix.d * matrix.d;
    }

    this.tx = matrix.a * helperMatrix.tx + matrix.c * helperMatrix.ty +
      matrix.tx;
    this.ty = matrix.b * helperMatrix.tx + matrix.d * helperMatrix.ty +
      matrix.ty;

    return this;
  }
}

var helperMatrix = new Matrix2D();
