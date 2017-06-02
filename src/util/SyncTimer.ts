export interface SyncTimerCallback {
  (dt: number): void;
}


export default class SyncTimer {
  private _items: SyncTimerCallback[];
  private _length: number;
  private _last: number;
  private _isRunning: boolean;
  private _timer: number;

  private _tick: Function;

  constructor () {
    this._items = [];
    this._length = 0;
    this._tick = this.tick.bind(this);
  }

  public tick(): void {
    const now: number = +new Date();
    const dt: number = now - this._last;
    this._last = now;

    // items might get removed as we iterate, so this._length can change
    for (var i = 0; i < this._length; ++i) {
      this._items[i](dt);
    }
  }

  public add(cb: SyncTimerCallback): void {
    if (cb) {
      this._items.push(cb);
      ++this._length;
      cb(0);
      this.start();
    }
  }

  public remove(cb: SyncTimerCallback): void {
    for (var i = 0, n = this._items.length; i < n; ++i) {
      if (this._items[i] == cb) {
        this._items.splice(i, 1);
        if (!--this._length) {
          this.stop();
        }
        return;
      }
    }
  }

  public start(): void {
    if (!this._isRunning) {
      this._isRunning = true;
      this._last = +new Date();
      this._timer = setInterval(this._tick, 15);
    }
  }

  public stop(): void {
    if (this._isRunning) {
      this._isRunning = false;
      clearInterval(this._timer);
    }
  }
}
