/**
 * @package math.geom.Point;
 * Models a Point in 2D space.
 */
class Point {
  x: number;
  y: number;

  constructor (a: any, b: any) {
    switch (arguments.length) {
      case 0:
        this.x = 0;
        this.y = 0;
        break;
      case 1:
        this.x = a.x || 0;
        this.y = a.y || 0;
        break;
      case 2:
        this.x = a || 0;
        this.y = b || 0;
        break;
    }
  }

  rotate (r) {
    var x = this.x,
      y = this.y,
      cosr = Math.cos(r),
      sinr = Math.sin(r);

    this.x = x * cosr - y * sinr;
    this.y = x * sinr + y * cosr;

    return this;
  }

  add (x, y) {
    if (typeof x == 'number') {
      this.x += x;
      this.y += y;
    } else {
      this.x += x.x;
      this.y += x.y;
    }
    return this;
  }

  subtract (x, y) {
    if (typeof x == 'number') {
      this.x -= x;
      this.y -= y;
    } else {
      this.x -= x.x;
      this.y -= x.y;
    }
    return this;
  }

  scale (sx, sy) {
    // if no scaleY specified
    if (sy === undefined)
      { sy = sx; }

    this.x *= sx;
    this.y *= sy;
    return this;
  }

  setMagnitude (m) {
    var theta = this.getAngle();
    this.x = m * Math.cos(theta);
    this.y = m * Math.sin(theta);
    return this;
  }

  normalize () {
    var m = this.getMagnitude();
    this.x /= m;
    this.y /= m;
    return this;
  }
  addMagnitude (m) {
    return this.setMagnitude(this.getMagnitude() + m);
  }
  getMagnitude () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  getSquaredMagnitude () {
    return this.x * this.x + this.y * this.y;
  }
  getAngle () {
    return Math.atan2(this.y, this.x);
  }
};

export default Point;
