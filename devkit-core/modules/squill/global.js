let exports = {};

var gWidgetPrefix = 'squill-';
var gWin = window;
var gDoc = document;

exports.setTargetWindow = function (w) {
  gWin = w;
  gDoc = w.document;
};
exports.getTargetWindow = function () {
  return gWin;
};
exports.getTargetDocument = function () {
  return gDoc;
};

exports.setWidgetPrefix = function (p) {
  gWidgetPrefix = p;
};
exports.getWidgetPrefix = function () {
  return gWidgetPrefix;
};

export default exports;
