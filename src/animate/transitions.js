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

exports.linear = function (n) {
	return n;
};
exports.easeIn = exports.easeInQuad = function (n) {
	return n * n;
};
exports.easeOut = exports.easeOutQuad = function (n) {
	return n * (2 - n);
};
exports.easeInOutQuad = function (n) {
	if ((n *= 2) < 1) return 0.5 * n * n;
	return -0.5 * ((--n) * (n - 2) - 1);
};
exports.easeInCubic = function (n) {
	return n * n * n;
};
exports.easeOutCubic = function (n) {
	return ((n -= 1) * n * n + 1);
};
exports.easeInOut = exports.easeInOutCubic = function (n) {
	if ((n *= 2) < 1) return 0.5 * n * n * n;
	return 0.5 * ((n -= 2) * n * n + 2);
};
exports.easeInQuart = function (n) {
	return n * n * n * n;
};
exports.easeOutQuart = function (n) {
	return -1 * ((n -= 1) * n * n * n - 1);
};
exports.easeInOutQuart = function (n) {
	if ((n *= 2) < 1) return 0.5 * n * n * n * n;
	return -0.5 * ((n -= 2) * n * n * n - 2);
};
exports.easeInQuint = function (n) {
	return n * n * n * n * n;
};
exports.easeOutQuint = function (n) {
	return ((n -= 1) * n * n * n * n + 1);
};
exports.easeInOutQuint = function (n) {
	if ((n *= 2) < 1) return 0.5 * n * n * n * n * n;
	return 0.5 * ((n -= 2) * n * n * n * n + 2);
};
exports.easeInSine = function(n){
	if (n == 0) return 0;
	if (n == 1) return 1;
	return -1 * Math.cos(n * (Math.PI / 2)) + 1;
};
exports.easeOutSine = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	return Math.sin(n * (Math.PI / 2));
};
exports.easeInOutSine = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	return -0.5 * (Math.cos(Math.PI * n) - 1);
};
exports.easeInExpo = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	return (n == 0) ? 0 : Math.pow(2, 10 * (n - 1));
};
exports.easeOutExpo = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	return (n == 1) ? 1 : (-Math.pow(2, -10 * n) + 1);
};
exports.easeInOutExpo = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	if ((n *= 2) < 1) return 0.5 * Math.pow(2, 10 * (n - 1));
	return 0.5 * (-Math.pow(2, -10 * --n) + 2);
};
exports.easeInCirc = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	return -1 * (Math.sqrt(1 - n * n) - 1);
};
exports.easeOutCirc = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	return  Math.sqrt(1 - (n -= 1) * n);
};
exports.easeInOutCirc = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	if ((n*=2) < 1) return -0.5 * (Math.sqrt(1 - n * n) - 1);
	return 0.5 * (Math.sqrt(1 - (n -= 2) * n) + 1);
};
exports.easeInElastic = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	var p = 0.3;
	var s = 0.075;	// p / (2 * Math.PI) * Math.asin(1)
	return -(Math.pow(2, 10 * (n -= 1)) * Math.sin((n - s) * (2 * Math.PI) / p));
};
exports.easeOutElastic = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	var p = 0.3;
	var s = 0.075;	// p / (2 * Math.PI) * Math.asin(1)
	return Math.pow(2,-10 * n) * Math.sin((n - s) * (2 * Math.PI) / p) + 1;
};
exports.easeInOutElastic = function (n) {
	if (n == 0) return 0;
	if ((n *= 2) == 2) return 1;
	var p = 0.45;	// 0.3 * 1.5
	var s = 0.1125;	// p / (2 * Math.PI) * Math.asin(1)
	if (n < 1) return -.5 * (Math.pow(2, 10 * (n -= 1)) * Math.sin((n * 1 - s) * (2 * Math.PI) / p));
	return Math.pow(2, -10 * (n -= 1)) * Math.sin((n * 1 - s) * (2 * Math.PI) / p ) * .5 + 1;
};
exports.easeInBack = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	var s = 1.70158;
	return n * n * ((s + 1) * n - s);
};
exports.easeOutBack = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	var s = 1.70158;
	return ((n -= 1) * n * ((s + 1) * n + s) + 1);
};
exports.easeInOutBack = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	var s = 1.70158;
	if ((n *= 2) < 1) return 0.5 * (n * n * (((s *= 1.525) + 1) * n - s));
	return 0.5 * ((n -= 2) * n * (((s *= 1.525) + 1) * n + s) + 2);
};
exports.easeOutBounce = function (n) {
	if (n == 0) return 0;
	if (n == 1) return 1;
	if (n < (1 / 2.75)) {
		return (7.5625 * n * n);
	} else if (n < (2 / 2.75)) {
		return (7.5625 * (n -= (1.5 / 2.75)) * n + .75);
	} else if (n < (2.5 / 2.75)) {
		return (7.5625 * (n -= (2.25 / 2.75)) * n + .9375);
	} else {
		return (7.5625 * (n -= (2.625 / 2.75)) * n + .984375);
	}
};
exports.easeInBounce = function (n) {
	return 1 - this.easeOutBounce(1 - n);
};
exports.easeInOutBounce = function (n) {
	if (n < 0.5) return this.easeInBounce(n * 2) * .5;
	return this.easeOutBounce((n * 2) - 1) * .5 + .5;
};