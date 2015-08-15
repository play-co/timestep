/* globals DEBUG */

exports.method = function (prototype, method, func) {
  if (DEBUG) {
    prototype[method] = function () {
      logger.error('@deprecated', method, prototype.constructor.name);
      if (func) {
        return func.apply(this, arguments);
      }
    };
  } else {
    prototype[method] = func || function () {};
  }
};
