let exports = {};

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
class Iterator {
  constructor (list) {
    this.update(list);
  }
  update (list) {
    this._list = list || this._list;
    this._current = list.head;
    this._count = 0;
  }
  next () {
    var data = this._current.data;
    this._current = this._current.next;
    this._count++;
    return data;
  }
  current () {
    return this._current.data;
  }
  insertBefore (data) {
    this._current.insertBefore(data);
    this._list.count++;
  }
  insertAfter (data) {
    this._current.insertAfter(data);
    this._list.count++;
  }
  remove () {
    this._current.prev.remove();
    if (this._current.prev == this._current) {
      this._list.head = null;
    }
    this._list.count--;
  }
  hasNext () {
    return this._count < this._list.count;
  }
  atHead () {
    return this._current == this._list.head;
  }
}

class Item {
  constructor (data, prev, next) {
    this.data = data;
    this.prev = prev || this;
    this.next = next || this;
  }
  insertBefore (data) {
    var item = new Item(data, this.prev, this);
    this.prev.next = item;
    this.prev = item;
  }
  insertAfter (data) {
    var item = new Item(data, this, this.next);
    this.next.prev = item;
    this.next = item;
  }
  remove () {
    this.prev.next = this.next;
    this.next.prev = this.prev;
  }
}

exports = class {
  constructor (comparator) {
    this.head = null;
    this._comparator = comparator;
    this.count = 0;
  }
  append (data) {
    this._head.insertAfter(data);
    this.count++;
  }
  insert (data) {
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
  }
  iterator () {
    return new Iterator(this);
  }
};

export default exports;
