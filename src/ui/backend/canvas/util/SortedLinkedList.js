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

var Iterator = Class('Iterator', function (logger, supr) {
	this.init = this.update = function (list) {
		this._list = list || this._list;
		this._current = list.head;
		this._count = 0;
	};

	this.next = function () {
		var data = this._current.data;
		this._current = this._current.next;
		this._count++;
		return data;
	};

	this.current = function () {
		return this._current.data;
	};

	this.insertBefore = function (data) {
		this._current.insertBefore(data);	
		this._list.count++;
	};

	this.insertAfter = function (data) {
		this._current.insertAfter(data);	
		this._list.count++;
	};

	this.remove = function () {
		this._current.prev.remove();
		if (this._current.prev == this._current) {
			this._list.head = null;
		}
		this._list.count--;
	};

	this.hasNext = function () {
		return this._count < this._list.count;
	};

	this.atHead = function () {
		return this._current == this._list.head;
	};
});

var Item = Class('Item', function (logger, supr) {
	this.init = function (data, prev, next) {
		this.data = data;
		this.prev = prev || this; 
		this.next = next || this;
	};

	this.insertBefore = function (data) {
		var item = new Item(data, this.prev, this);
		this.prev.next = item;
		this.prev = item;
	};
	
	this.insertAfter = function (data) {
		var item = new Item(data, this, this.next);
		this.next.prev = item;
		this.next = item;
	};

	this.remove = function () {
		this.prev.next = this.next;
		this.next.prev = this.prev;
	};
});

exports = Class('SortedLinkedList', function (logger, supr) {
	this.init = function (comparator) {
		this.head = null;
		this._comparator = comparator;
		this.count = 0;
	};

	this.append = function (data) {
		this._head.insertAfter(data);
		this.count++;
	};

	this.insert = function (data) {
		if (!this.head) {
			this.head = new Item(data);
			this.count++;
		} else {
			var i = this.iterator();
			var d = i.current();	
			var found = false;
			while (i.hasNext() && !found) {
				found = !this._comparator(data, d);
				if (!found) {
					i.next();	
					d = i.current();
				}
			}
			i.insertBefore(data);
			if (found && i.atHead()) {
				this.head = this.head.prev;	
			}
		}
	};

	this.iterator = function () {
		return new Iterator(this);
	};
});
