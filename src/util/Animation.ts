import SyncTimer from './SyncTimer';


const timer = new SyncTimer();


export interface AnimationFinishCallback {
  (): void;
}


export interface AnimationSubjectCallback {
  // TODO: param names should be better
  (x: number, s: number): void;
}


export interface EasingFunction {
  (n: number): number;
}


export interface AnimationParams {
  start?: number;
  end?: number;
  transition?: any; // TODO
  easing?: boolean;
  subject: any; // TODO
  duration?: number;
  current?: number;
  onFinish?: AnimationFinishCallback;
}


export default class Animation {
  private _start: number;
  private _end: number;
  private _transition: EasingFunction;
  private _easing: boolean;
  private _subject: AnimationSubjectCallback;
  private _duration: number;
  private _s: number;
  private _onFinish: AnimationFinishCallback;

  private _range: number;
  private _isAnimating: boolean;
  private _animate: AnimationFinishCallback;

  private _t0: number;
  private _s0: number;
  private _s1: number;
  private _ds: number;
  private _dt: number;

  constructor (params: AnimationParams) {
    this._start = 'start' in params ? params.start : 0;
    this._end = 'end' in params ? params.end : 1;
    this._transition = params.transition || null;
    this._easing = params.easing || false;
    this._subject = params.subject;
    this._duration = params.duration || 1000;
    this._s = params.current || this._start;
    this._onFinish = params.onFinish || null;

    this._range = this._end - this._start;
    this._isAnimating = false;
    this._animate = this.animate.bind(this);
  }

  public stop(): void {
    this.jumpTo(this._s);
  }

  public play (): void {
    this.seekTo(this._end);
  }

  public seekTo (s: number, dur?: number): Animation {
    if (s == this._s) {
      return;
    }

    this._t0 = 0;
    this._s0 = this._s;
    this._s1 = s;
    if (dur)
      { this._duration = dur; }

    this._ds = s - this._s;
    var dt = this._ds / this._range * this._duration;
    this._dt = dt < 0 ? -dt : dt;

    if (!this._isAnimating) {
      this._isAnimating = true;
      timer.add(this._animate);
    }

    return this;
  }

  public onFinish (onFinish: AnimationFinishCallback): Animation {
    this._onFinish = onFinish;
    return this;
  }

  public jumpTo (s: number): Animation {
    this._s1 = this._s0 = s;
    this._t0 = 0;
    this._dt = 1;
    this._ds = 0;
    this.animate(0);
    return this;
  }

  public animate (dt: number) {
    var elapsed = this._t0 += dt;
    var dt = elapsed / this._dt;
    if (dt > 1) {
      dt = 1;
    }
    this._s = this._s0 + dt * this._ds;

    var x = this._transition ? this._transition(this._s) : this._s;
    try {
      this._subject(x, this._s);
    } finally {
      if (dt == 1) {
        timer.remove(this._animate);
        this._isAnimating = false;
        if (this._onFinish) {
          this._onFinish();
        }
      }
    }
  }
};


export const linear: EasingFunction = function(n: number): number {
  return n;
};

export const easeIn: EasingFunction = function(n: number): number {
  return n * n;
};

export const easeInOut: EasingFunction = function(n: number): number {
  return (n *= 2) < 1 ? 0.5 * n * n * n : 0.5 * ((n -= 2) * n * n + 2);
};

export const easeOut: EasingFunction = function (n: number): number {
  return n * (2 - n);
};

