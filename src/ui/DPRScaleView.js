let exports = {};

import { bind } from 'base';

import device from 'device';
import View from 'ui/View';

class DPRScaleView extends View {
  constructor () {
    super();

    View.prototype.init.apply(this, arguments);
    this.dpr = device.screen.devicePixelRatio;
    device.screen.on('Resize', bind(this, '_onResize'));
  }
  _onResize () {
    this.style.scale = device.screen.devicePixelRatio / this.dpr;
  }
}

exports = DPRScaleView;

export default exports;
