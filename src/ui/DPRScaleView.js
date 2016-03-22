import device;
import ui.View as View;

var DPRScaleView = Class(View, function () {
  this.init = function () {
    View.prototype.init.apply(this, arguments);
    this.dpr = device.screen.devicePixelRatio;
    device.screen.on('Resize', bind(this, '_onResize'));
  };

  this._onResize = function () {
    this.style.scale = device.screen.devicePixelRatio / this.dpr;
  };
});

exports = DPRScaleView;
