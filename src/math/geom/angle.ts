var PI = Math.PI;
var TAU = Math.PI * 2;

export function average (a: number, b: number, weight: number): number {
  if (weight === undefined) {
    weight = 0.5;
  }
  var r1 = range(a, b);
  var avg = r1 < PI ? a + r1 * (1 - weight) : b + (2 * PI - r1) * weight;

  return avg > PI ? avg - 2 * PI : avg < -PI ? avg + 2 * PI : avg;
};

// between -PI and PI
export function normalize (a: number): number {
  return a - ((a + Math.PI) / TAU | 0) * TAU;
};

export function add (a: number, b: number): number {
  var sum = a + b;
  return sum > PI ? sum - TAU : sum < -PI ? sum + TAU : sum;
};

// smaller of two angles a - b, b - a
export function difference (a: number, b: number): number {
  var diff = range(a, b);
  return diff > PI ? diff - TAU : diff;
};

// angular range from a to b, returns float between [0, 2PI]
export function range (a: number, b: number): number {
  var r = b - a;
  return r < 0 ? r + TAU : r;
};
