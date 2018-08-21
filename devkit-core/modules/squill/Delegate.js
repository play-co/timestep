let exports = {};

var SLICE = Array.prototype.slice;

exports = class {
  constructor (def) {
    def && def(this);
  }
  extend (def) {
    var delegate = new Delegate(def);
    delegate.parent = this;
    return delegate;
  }
  call (ctx, name) {
    if (this[name]) {
      return this[name].apply(ctx, SLICE.call(arguments, 2));
    } else if (this.parent) {
      return this.parent.apply(ctx, SLICE.call(arguments, 1));
    }
  }
  apply (ctx, args) {
    this.call.apply(this, [ctx].concat(SLICE.call(args)));
  }
};
var Delegate = exports;

export default exports;
