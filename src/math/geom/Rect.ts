import Enum from 'lib/Enum'; // TODO fix
import Point from './Point';
import Line from './Line';
import intersect from './intersect';

/**
 * Model a rectangle.
 */
export default class Rect {
  width: number;
  height: number;
  x: number;
  y: number;


  SIDES = Enum('TOP', 'BOTTOM', 'LEFT', 'RIGHT');
  CORNERS = Enum('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_RIGHT', 'BOTTOM_LEFT');

  constructor ()
  constructor (a: Rect)
  constructor (a: Point, b: Point)
  constructor (a: Point, b: number, c: number)
  constructor (a: number, b: number, c: number, d: number)
  constructor (a?: Rect | Point | number, b?: Point | number, c?: number, d?: number) {
    switch (arguments.length) {
      case 0:
      // init
        this.width = this.height = this.x = this.y = 0;
        break;
      case 1:
      // copy
        if (a instanceof Rect) {
          this.width = a.width;
          this.height = a.height;
          this.x = a.x;
          this.y = a.y;
        }
        break;
      case 2:
      // (x, y), (width, height)
        if (a instanceof Point && b instanceof Point) {
          this.x = a.x;
          this.y = a.y;
          this.width = b.x;
          this.height = b.y;
        }
        break;
      case 3:
      // (x, y), width, height
        if (a instanceof Point && typeof b === 'number' && typeof c === 'number') {
          this.x = a.x;
          this.y = a.y;
          this.width = b;
          this.height = c;
        }
        break;
      case 4:
      // x, y, width, height
        if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number' && typeof d === 'number') {
          this.x = a;
          this.y = b;
          this.width = c;
          this.height = d;
        }
        break;
    }
  }

  public normalize (): Rect {
    if (this.width < 0) {
      this.x -= this.width;
      this.width = -this.width;
    }

    if (this.height < 0) {
      this.y -= this.height;
      this.height = -this.height;
    }
    return this;
  }

  public intersectRect (rect): void {
    if (intersect.isRectAndRect(this, rect)) {
      var x1 = this.x;
      var y1 = this.y;
      var x2 = this.x + this.width;
      var y2 = this.y + this.height;

      this.x = Math.max(x1, rect.x), this.y = Math.max(y1, rect.y), this.width =
        Math.min(x2, rect.x + rect.width) - this.x;
      this.height = Math.min(y2, rect.y + rect.height) - this.y;
    } else {
      this.width = 0;
      this.height = 0;
    }
  }

  public unionRect (rect): void {
    this.normalize();
    if (rect.normalize) {
      rect.normalize();
    }

    var x2 = this.x + this.width,
      y2 = this.y + this.height;

    var rx2 = rect.x + rect.width,
      ry2 = rect.y + rect.height;

    this.x = this.x < rect.x ? this.x : rect.x;
    this.y = this.y < rect.y ? this.y : rect.y;

    this.width = (x2 > rx2 ? x2 : rx2) - this.x;
    this.height = (y2 > ry2 ? y2 : ry2) - this.y;
  }
  public getCorner (i): Point {
    switch (i) {
      case this.CORNERS.TOP_LEFT:
        return new Point(this.x, this.y);
      case this.CORNERS.TOP_RIGHT:
        return new Point(this.x + this.width, this.y);
      case this.CORNERS.BOTTOM_LEFT:
        return new Point(this.x, this.y + this.height);
      case this.CORNERS.BOTTOM_RIGHT:
        return new Point(this.x + this.width, this.y + this.height);
    }
  }

  public getSide (i): Line {
    switch (i) {
      case this.SIDES.TOP:
        return new Line(this.getCorner(this.CORNERS.TOP_LEFT), this.getCorner(
        this.CORNERS.TOP_RIGHT));
      case this.SIDES.RIGHT:
        return new Line(this.getCorner(this.CORNERS.TOP_RIGHT), this.getCorner(
        this.CORNERS.BOTTOM_RIGHT));
      case this.SIDES.BOTTOM:
        return new Line(this.getCorner(this.CORNERS.BOTTOM_RIGHT), this.getCorner(
        this.CORNERS.BOTTOM_LEFT));
      case this.SIDES.LEFT:
        return new Line(this.getCorner(this.CORNERS.BOTTOM_LEFT), this.getCorner(
        this.CORNERS.TOP_LEFT));
    }
  }

  public getCenter (): Point {
    return new Point(this.x + this.width / 2, this.y + this.height / 2);
  }
};
