let exports = {};

import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';

exports = class extends Widget {
  constructor (params) {
    this._width = params.width || 100;
    this._padding = 12;
    this._hover = false;
    this._fillColor = params.fillColor || '#000000';
    this._lineColor = params.lineColor || '#FFFFFF';

    this._def = {
      children: [{
        id: params.id + 'Canvas',
        tag: 'canvas',
        attrs: {
          width: this._width,
          height: this._padding * 2
        }
      }]
    };

    super(params);
  }
  _render () {
    var width = this._width,
      padding = this._padding,
      ctx = this._ctx,
      radialGradient, v;

    ctx.clearRect(0, 0, width, padding * 2);

    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(padding + 2, padding, 2, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.arc(width - padding - 2, padding, 2, Math.PI * 1.5, Math.PI * 0.5,
      false);
    ctx.closePath();

    ctx.lineWidth = 1;
    ctx.strokeStyle = this._lineColor;
    ctx.stroke();
    ctx.fillStyle = this._fillColor;
    ctx.fill();

    ctx.save();

    if (this._hover) {
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#0099FF';
    }

    v = ~~((width - padding * 2) * (this.value - this.min) / (this.max -
      this.min));

    ctx.beginPath();
    ctx.arc(padding + v, padding, 5, 0, Math.PI * 2, false);
    ctx.closePath();

    radialGradient = ctx.createRadialGradient(padding - 1 + v, padding - 1,
      0, padding + v, padding, 4);

    radialGradient.addColorStop(0, '#FFFFFF');
    radialGradient.addColorStop(1, '#707070');
    ctx.fillStyle = radialGradient;
    ctx.fill();

    ctx.restore();
  }
  buildWidget () {
    var el = this._el;
    canvas = el.firstChild;

    el.slider = this;

    $.onEvent(canvas, 'mouseout', this, '_onMouseOut');
    $.onEvent(canvas, 'mousedown', this, '_onMouseDown');
    $.onEvent(canvas, 'mouseup', this, '_onMouseUp');
    $.onEvent(canvas, 'mousemove', this, '_onMouseMove');

    this.min = this._opts.min || 0;
    this.max = this._opts.max || 100;
    this.step = this._opts.step || 1;
    this.value = this._opts.value || 0;

    this._mouseDown = false;
    this._checkRange();
    this._ctx = canvas.getContext('2d');
    this._render();
  }
  setValue (value) {
    this.value = value;
    this._render();
  }
  _onChange () {
    this.publish('Change', this.value);
  }
  _checkRange () {
    if (this.value < this.min) {
      this.value = this.min;
    }
    if (this.value > this.max) {
      this.value = this.max;
    }
  }
  _checkMouse (evt) {
    var mouseX = evt.offsetX,
      mouseY = evt.offsetY,
      width = this._width,
      padding = this._padding,
      hover = this._hover,
      value;

    if (this._mouseDown) {
      if (mouseX > padding && mouseY > padding - 5 && mouseX < width -
        padding && mouseY < padding + 5) {
        value = (evt.offsetX - padding) / (width - padding * 2) * (this.max -
          this.min);
        value = this.min + Math.round(value / this.step) * this.step;
        this.value = value;
        this._checkRange();
        this._render();
        this._onChange();
      }
    } else {
      if (mouseY > padding - 5 && mouseY < padding + 5) {
        v = padding + ~~((width - padding * 2) * (this.value - this.min) /
          (this.max - this.min));
        this._hover = mouseX > v - 5 && mouseY < v + 5;
      } else {
        this._hover = false;
      }

      if (this._hover !== hover) {
        this._render();
      }
    }
  }
  _onMouseOut (evt) {
    this._mouseDown = false;
    this._hover = false;
    this._render();
  }
  _onMouseDown (evt) {
    this._mouseDown = true;
    this._checkMouse(evt);
  }
  _onMouseUp (evt) {
    this._mouseDown = false;
  }
  _onMouseMove (evt) {
    this._checkMouse(evt);
  }
};
exports.prototype._css = 'rng';
exports.prototype._type = 'range';
var Slider = exports;

export default exports;
