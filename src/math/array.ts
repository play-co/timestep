import util from './util';

/**
 * @package math.array;
 *
 * Functions to manipulate one or more arrays in tandem.
 */
/**
 * Returns the weighted average
 */
export function weightedAverage (a: number[], w: number, n: number): number {
  n = n || a.length;
  var s = 0;
  for (var i = n - 1; i >= 0; --i) {
    s += a[i] * w;
  }
  return s / n;
};


/**
 * Subtract two arrays, (a - b)
 */
export function subtract (a: number[], b: number[]): number[] {
  var length = a.length, diff = new Array(length);
  for (var i = 0; i < length; ++i) {
    diff[i] = a[i] - b[i];
  }
  return diff;
};


/**
 * Average an array.
 */
export function average (a: number[], n: number): number {
  n = n || a.length;
  var s = 0;
  for (var i = n - 1; i >= 0; --i) {
    s += a[i];
  }
  return s / n;
};


/**
 * Return the standard deviation of an array.
 */
export function stddev (a: number[], n: number): number {
  var avg = average(a, n);
  n = n || a.length;
  var s = 0;
  for (var i = n - 1; i >= 0; --i) {
    var diff = a[i] - avg;
    s += diff * diff;
  }
  return Math.sqrt(s / (n - 1));
};


/**
 * Shuffle an array. Takes an optional random seed.
 */
export function shuffle (a: number[], randGen: number): number[] {
  var len = a.length;
  for (var i = 0; i < len; ++i) {
    var j = util.random(i, len, randGen), temp = a[j];
    a[j] = a[i];
    a[i] = temp;
  }
  return a;
};


/**
 * Rotate an array's elements left.
 */
export function rotate (a: number[], count: number): number[] {
  var len = a.length, b = new Array(len), j = count % len;
  if (j < 0) {
    j = j % len;
    if (j) {
      j += len;
    }
  }
  for (var i = 0; i < len; ++i) {
    b[i] = a[j];
    j = (j + 1) % len;
  }
  return b;
};
