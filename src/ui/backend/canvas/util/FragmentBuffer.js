/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

import device;
import .FragmentBin;
import .SortedLinkedList as SortedList;

var FragmentBuffer = exports = Class(function () {
	var debug = false;
	this.init = function (opts) {
		this.opts = merge(opts, {});
		this._cache = {};
		this._textViews = [];
		window.addEventListener('pageshow', bind(this, 'clearBuffer'), false);
	};

	var sort = function (a, b) {
		return a.size() > b.size();
	};

	this._build = function () {
	    var Canvas = device.get('Canvas');
        this._canvas = new Canvas({width: 1024, height: 1024});
        this._ctx = this.getCanvas().getContext('2d');
		this._ctx.clearRect(0, 0, 1024, 1024);
		this._ctx.textAlign = 'left';
		this._ctx.textBaseline = 'middle';
		this._ctx.globalCompositeOperation = 'source-over';
		this._binList = new SortedList(sort);
		var head = new FragmentBin({
			x: 0,
			y: 0,
			width: 1024,
			height: 1024
		});
		this._binList.insert(head);
		debug && window.open().document.body.appendChild(this._canvas);
	};

	this.getCanvas = function () {
		if (!this._canvas) {
			this._build();
		}
		return this._canvas;
	};

	this.getContext = function () {
		if (!this._ctx) {
			this._build();
		}
		return this._ctx;
	};

	this.onGetHash = function (desc) {
		throw Error("onGetHash should be implemented.");
	};

	var randomColor = function () {
		var color = 'rgba(' +
					(Math.random()*255).toFixed() + ',' +
					(Math.random()*255).toFixed() + ',' +
					(Math.random()*255).toFixed() + ',' +
					'0.3)';
		return color;
	};

	this._insertText = function (desc) {
		var width = desc.width;
		var height = desc.height;
		var iter = this._binList.iterator();
		var bin = null;
		var found = false;
		while (iter.hasNext() && !found) {
			bin = iter.next();
			if (!bin.filled && bin.width >= width && bin.height >= height) {
				found = true;
			} else {
				//we don't want to insert in filled bins
				bin = null;
			}
		}
		if (bin) {
			newBins = bin.split(width, height);
			for (var i = 0; i < newBins.length; i++) {
				this._binList.insert(newBins[i]);
			}
			if (debug) {
				/*
				* If we're debugging, fill each bin with a different color
				* so we can see where they are.
				*/
				this._ctx.fillStyle = randomColor();
				this._ctx.fillRect(bin.x, bin.y, bin.width, bin.height);
			}
		} else {
			logger.log('buffer full, further TextViews will not be cached');
		}
		return bin;
	};

	/**
	* debugging code to verify overlapping bins aren't created.
	*/
	var rectIntersectsRect = function (r1, r2) {
		var ax1 = r1.x;
		var ax2 = r1.x + r1.width;
		var ay1 = r1.y;
		var ay2 = r1.y + r1.height;
		var bx1 = r2.x;
		var bx2 = r2.x + r2.width;
		var by1 = r2.y;
		var by2 = r2.y + r2.height;
		return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
	};

	var debugCheck = function (bin, list) {
		if (!bin) { return;}
		var iter = list.iterator();
		var ok = true;
		while (iter.hasNext() && ok) {
			var next = iter.next();
			ok = next == bin || !rectIntersectsRect(next, bin);
			if (!ok) {
				logger.error('rect overlaps');
				logger.error(iter.current(), bin);
			}
		}
	};

	this.getPositionForText = function (tv) {
		var desc = tv._opts;
		var hash = this.onGetHash(desc);

		if (!this._cache[hash] && desc.width > 0) {
			this._cache[hash] = this._insertText(desc);
			this._textViews.push(tv);
		}
		if (debug && false) {
			debugCheck(desc, this._binList);
		}
		return this._cache[hash];
	};

	this.clearBuffer = function () {
		this._cache = {};
		this._binList = new SortedList(sort);
		this._binList.insert(new FragmentBin({
			x: 0,
			y: 0,
			width: 1024,
			height: 1024
		}));
		while (this._textViews.length) {
			this._textViews.pop()._cacheUpdate = true;
		}
	};
});