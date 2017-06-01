/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */
/**
 * @module animate.transitions
 *
 * Transition functions for use by the animate features. These aren't referenced
 * directly by the animate namespace, but by numerical reference.
 *
 * @doc http://doc.gameclosure.com/api/animate.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/animate.md
 */
class transitions {
  linear (n: number) {
    return n;
  }
  easeInQuad (n: number) {
    return n * n;
  }
  easeOutQuad (n: number) {
    return n * (2 - n);
  }
  easeInOutQuad (n: number) {
    if ((n *= 2) < 1)
      { return 0.5 * n * n; }
    return -0.5 * (--n * (n - 2) - 1);
  }
  easeInCubic (n: number) {
    return n * n * n;
  }
  easeOutCubic (n: number) {
    return (n -= 1) * n * n + 1;
  }
  easeInOutCubic (n: number) {
    if ((n *= 2) < 1)
      { return 0.5 * n * n * n; }
    return 0.5 * ((n -= 2) * n * n + 2);
  }
  easeInQuart (n: number) {
    return n * n * n * n;
  }
  easeOutQuart (n: number) {
    return -1 * ((n -= 1) * n * n * n - 1);
  }
  easeInOutQuart (n: number) {
    if ((n *= 2) < 1)
      { return 0.5 * n * n * n * n; }
    return -0.5 * ((n -= 2) * n * n * n - 2);
  }
  easeInQuint (n: number) {
    return n * n * n * n * n;
  }
  easeOutQuint (n: number) {
    return (n -= 1) * n * n * n * n + 1;
  }
  easeInOutQuint (n: number) {
    if ((n *= 2) < 1)
      { return 0.5 * n * n * n * n * n; }
    return 0.5 * ((n -= 2) * n * n * n * n + 2);
  }
  easeInSine (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    return -1 * Math.cos(n * (Math.PI / 2)) + 1;
  }
  easeOutSine (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    return Math.sin(n * (Math.PI / 2));
  }
  easeInOutSine (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    return -0.5 * (Math.cos(Math.PI * n) - 1);
  }
  easeInExpo (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    return n == 0 ? 0 : Math.pow(2, 10 * (n - 1));
  }
  easeOutExpo (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    return n == 1 ? 1 : -Math.pow(2, -10 * n) + 1;
  }
  easeInOutExpo (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    if ((n *= 2) < 1)
      { return 0.5 * Math.pow(2, 10 * (n - 1)); }
    return 0.5 * (-Math.pow(2, -10 * --n) + 2);
  }
  easeInCirc (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    return -1 * (Math.sqrt(1 - n * n) - 1);
  }
  easeOutCirc (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    return Math.sqrt(1 - (n -= 1) * n);
  }
  easeInOutCirc (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    if ((n *= 2) < 1)
      { return -0.5 * (Math.sqrt(1 - n * n) - 1); }
    return 0.5 * (Math.sqrt(1 - (n -= 2) * n) + 1);
  }
  easeInElastic (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    var p = 0.3;
    var s = 0.075;
    // p / (2 * Math.PI) * Math.asin(1)
    return -(Math.pow(2, 10 * (n -= 1)) * Math.sin((n - s) * (2 * Math.PI) / p));
  }
  easeOutElastic (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    var p = 0.3;
    var s = 0.075;
    // p / (2 * Math.PI) * Math.asin(1)
    return Math.pow(2, -10 * n) * Math.sin((n - s) * (2 * Math.PI) / p) + 1;
  }
  easeInOutElastic (n: number) {
    if (n == 0)
      { return 0; }
    if ((n *= 2) == 2)
      { return 1; }
    var p = 0.45;
    // 0.3 * 1.5
    var s = 0.1125;
    // p / (2 * Math.PI) * Math.asin(1)
    if (n < 1)
      { return -0.5 * (Math.pow(2, 10 * (n -= 1)) * Math.sin((n * 1 - s) * (2 *
        Math.PI) / p)); }
    return Math.pow(2, -10 * (n -= 1)) * Math.sin((n * 1 - s) * (2 * Math.PI) /
      p) * 0.5 + 1;
  }
  easeInBack (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    var s = 1.70158;
    return n * n * ((s + 1) * n - s);
  }
  easeOutBack (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    var s = 1.70158;
    return (n -= 1) * n * ((s + 1) * n + s) + 1;
  }
  easeInOutBack (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    var s = 1.70158;
    if ((n *= 2) < 1)
      { return 0.5 * (n * n * (((s *= 1.525) + 1) * n - s)); }
    return 0.5 * ((n -= 2) * n * (((s *= 1.525) + 1) * n + s) + 2);
  }
  easeOutBounce (n: number) {
    if (n == 0)
      { return 0; }
    if (n == 1)
      { return 1; }
    if (n < 1 / 2.75) {
      return 7.5625 * n * n;
    } else if (n < 2 / 2.75) {
      return 7.5625 * (n -= 1.5 / 2.75) * n + 0.75;
    } else if (n < 2.5 / 2.75) {
      return 7.5625 * (n -= 2.25 / 2.75) * n + 0.9375;
    } else {
      return 7.5625 * (n -= 2.625 / 2.75) * n + 0.984375;
    }
  }
  easeInBounce (n: number) {
    return 1 - this.easeOutBounce(1 - n);
  }
  easeInOutBounce (n: number) {
    if (n < 0.5)
      { return this.easeInBounce(n * 2) * 0.5; }
    return this.easeOutBounce(n * 2 - 1) * 0.5 + 0.5;
  }
}

export default new transitions();
