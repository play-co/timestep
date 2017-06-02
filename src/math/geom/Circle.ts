import Point from './Point';

/**
 * @extends math.geom.Point
 * Models a circle given a radius.
 *   Circle(x, y, radius)
 *   Circle({x: default 0, y: default 0, radius: default 0})
 */
export default class Circle extends Point {
  radius: number;

  constructor ()
  constructor (a: Circle)
  constructor (a: number, b: number, c: number)
  constructor (a?: Circle | number, b?: number, c?: number) {
    super();

    switch (arguments.length) {
      case 0:
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        break;
      case 1:
        if (a instanceof Circle) {
          this.x = a.x || 0;
          this.y = a.y || 0;
          this.radius = a.radius || 0;
        }
        break;
      case 3:
        if (typeof a === 'number') {
          this.x = a;
          this.y = b;
          this.radius = c;
        }
        break;
    }
  }

  scale (s: number): Circle {
    super.scale(s, s); // TODO check if i did this right lol
    this.radius *= s;
    return this;
  }
};
