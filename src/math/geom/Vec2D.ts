import { IPoint } from './Point';


export interface Vec2dParams1 {
  magnitude: number;
  angle: number;
}

export interface Vec2dParams2 {
  x: number;
  y: number;
}


/**
 * Model a vector in two-dimensional space.
 * Pass an "angle" option in radians to this function to initialize an angle.
 */
export default class Vec2D implements IPoint {
  public x: number;
  public y: number;

  constructor (opts: Vec2dParams1|Vec2dParams2) {
    if ('angle' in opts) {
      opts = <Vec2dParams1>opts;
      this.x = opts.magnitude * Math.cos(opts.angle);
      this.y = opts.magnitude * Math.sin(opts.angle);
    } else {
      opts = <Vec2dParams2>opts;
      this.x = opts.x;
      this.y = opts.y;
    }
  }

  public addForce (f: IPoint): void {
    this.x += f.x;
    this.y += f.y;
  }

  public getAngle (): number {
    return Math.atan2(this.y, this.x);
  }

  public getMagnitude (): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public getUnitVector (): Vec2D {
    return new Vec2D({
      magnitude: 1,
      angle: this.getAngle()
    });
  }

  public dot (vec: IPoint): number {
    return this.x * vec.x + this.y * vec.y;
  }

  public add (vec: IPoint): Vec2D {
    return new Vec2D({
      x: this.x + vec.x,
      y: this.y + vec.y
    });
  }

  public minus (vec: IPoint): Vec2D {
    return new Vec2D({
      x: this.x - vec.x,
      y: this.y - vec.y
    });
  }

  public negate (): Vec2D {
    return new Vec2D({
      x: -this.x,
      y: -this.y
    });
  }

  public multiply (scalar: number): Vec2D {
    return new Vec2D({
      angle: this.getAngle(),
      magnitude: this.getMagnitude() * scalar
    });
  }
}
