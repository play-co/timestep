exports = Class(function () {
  // createFunc -- must return a new object for the pool
  this.init = function (createFunc) {
    this._create = createFunc;
    this._index = 0;
    this._pool = [];
  }

  // retrieves an item from the pool, creating one if there
  // are no available items
  this.get = function () {
    var i = this._index++;
    var objs = this._pool;
    var obj = objs[i];
    if (!obj) {
      obj = objs[i] = this._create();
      obj.__index = i;
    }

    return obj;
  }

  // put back an item retrieved using this.get()
  this.put = function (obj) {
    var objs = this._pool;

    if (this._index) {
      var end = --this._index;

      objs[obj.__index] = objs[end];
      objs[end].__index = obj.__index;

      objs[end] = obj;
      obj.__index = end;
    }
  }
});
