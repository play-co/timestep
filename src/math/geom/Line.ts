import Point from './Point';

export default class Line {
  start: Point;
  end: Point;

  constructor ()
  constructor (a: Line)
  constructor (a: Point, b: Point)
  constructor (a: number, b: number, c: number, d: number)
  constructor (a?: number | Line | Point, b?: number | Point, c?: number, d?: number) {
    switch (arguments.length) {
      case 0:
        this.start = new Point();
        this.end = new Point();
        break;
      case 1:
        if (a instanceof Line) {
          this.start = new Point(a.start);
          this.end = new Point(a.end);
        }
        break;
      case 2:
        if (a instanceof Point && b instanceof Point) {
          this.start = new Point(a);
          this.end = new Point(b);
        }
        break;
      case 4:
      default:
        if (typeof a === 'number' && typeof b === 'number') {
          this.start = new Point(a, b);
          this.end = new Point(c, d);
        }
        break;
    }
  }
  public getLength (): number {
    var dx = this.end.x - this.start.x,
      dy = this.end.y - this.start.y;

    return Math.sqrt(dx * dx + dy * dy);
  }
  public getMagnitude (): number {
    return this.getLength();
  }
};
