let exports = {};

var instance;

exports.setInstance = function (inst) {
  instance = inst;
};

exports.get = function () {
  return instance;
};

export default exports;
