/**
 * @package math.geom.Point;
 * Models a Point in 2D space.
 */
class Point {
  x: number;
  y: number;

  constructor ()
  constructor (p: Point)
  constructor (a: number, b: number)
  constructor (a?: number | Point, b?: number) {
    switch (arguments.length) {
      case 0:
        this.x = 0;
        this.y = 0;
        break;
      case 1:
        if (a instanceof Point) {
          this.x = a.x || 0;
          this.y = a.y || 0;
        }
        break;
      case 2:
        if (typeof a === 'number') {
          this.x = a || 0;
          this.y = b || 0;
        }
        break;
    }
  }

  rotate (r: number): Point {
    var x = this.x,
      y = this.y,
      cosr = Math.cos(r),
      sinr = Math.sin(r);

    this.x = x * cosr - y * sinr;
    this.y = x * sinr + y * cosr;

    return this;
  }

  add (x: Point)
  add (x: number, y: number)
  add (x: number | Point, y?: number): Point {
    if (typeof x == 'number') {
      this.x += x;
      this.y += y;
    } else if (x instanceof Point) {
      this.x += x.x;
      this.y += x.y;
    }
    return this;
  }

  subtract (x: Point)
  subtract (x: number, y: number)
  subtract (x: number | Point, y?: number): Point {
    if (typeof x == 'number') {
      this.x -= x;
      this.y -= y;
    } else {
      this.x -= x.x;
      this.y -= x.y;
    }
    return this;
  }

  scale (sx: number, sy: number): Point {
    // if no scaleY specified
    if (sy === undefined)
      { sy = sx; }

    this.x *= sx;
    this.y *= sy;
    return this;
  }

  setMagnitude (m: number): Point {
    var theta = this.getAngle();
    this.x = m * Math.cos(theta);
    this.y = m * Math.sin(theta);
    return this;
  }

  normalize (): Point {
    var m = this.getMagnitude();
    this.x /= m;
    this.y /= m;
    return this;
  }
  addMagnitude (m): Point {
    return this.setMagnitude(this.getMagnitude() + m);
  }
  getMagnitude (): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  getSquaredMagnitude (): number {
    return this.x * this.x + this.y * this.y;
  }
  getAngle (): number {
    return Math.atan2(this.y, this.x);
  }
};

export default Point;
