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

var LEN = 8;
var MAX = 99999999;
var MIN = -99999999;
var PAD = "00000000";

exports.initialValue = PAD;

exports.pad = function (val) {
	val = ~~val;

	if (val < MIN) { val = MIN; }
	if (val > MAX) { val = MAX; }
	if (val < 0) {
		val *= -1;
		return '-' + PAD.substring(0, LEN - ('' + val).length) + val;
	} else {
		return PAD.substring(0, LEN - ('' + val).length) + val;
	}
};
