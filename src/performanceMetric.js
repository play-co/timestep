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
 * @module performanceMetric
 *
 * Measures performance.
 *
 */

var floor = Math.floor;

var DEFAULT_RANK = 0;
var DEFAULT_ALLOW_REDUCTION = true;

exports.getParticleCount = function(count, performance) {
	if (!performance) {return count;}

	// mR is the mobile rank that comes of the stress test
	var mR = 50;

	var currCount = count;
	var pR = performance.effectPerformanceRank || DEFAULT_RANK;
	var aR = (typeof performance.allowReduction !== 'undefined')
		? performance.allowReduction
		: DEFAULT_ALLOW_REDUCTION;

	if (mR < pR) {
		currCount = (aR)
			? count * mR / pR
			: 0;  
	}	

	return currCount;
};