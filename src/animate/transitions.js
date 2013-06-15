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

exports.linear = function (n) { return n; }
exports.easeIn = function (n) { return n * n; }
exports.easeInOut = function (n) { return (n *= 2) < 1 ? 0.5 * n * n * n : 0.5 * ((n -= 2) * n * n + 2); }
exports.easeOut = function (n) { return n * (2 - n); }
