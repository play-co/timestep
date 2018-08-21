let exports = {};

import { bind } from 'base';

import browser from 'util/browser';
let $ = browser.$;
import Drag from './Drag';
import PubSub from 'lib/PubSub';

var SLICE = Array.prototype.slice;
var isMobile = /(iPod|iPhone|iPad|Android)/i.test(navigator.userAgent);

exports = class extends PubSub {
  event (el, name, handler) {
    if (!this._eventEnabled) {
      this._eventEnabled = {};
    }
    var args = [
        this,
        handler
      ].concat(SLICE.call(arguments, 3)),
      handler = bind.apply(this, args),
      events = this._eventEnabled;

    events[name] = true;
    $.onEvent(el, name, function () {
      if (events[name]) {
        return handler.apply(this, arguments);
      }
    });
  }
  isDragging () {
    return this._isDragging || false;
  }
  initDragEvents (el) {
    if (!this.__drag) {
      var d = this.__drag = new Drag();
      d.subscribe('DragStart', this, 'onDragStart');
      d.subscribe('Drag', this, 'onDrag');
      d.subscribe('DragStop', this, 'onDragStop');
    }

    var startDrag = bind(this.__drag, 'startDrag');
    if (!el) {
      el = this._el;
    }
    if (el.addEventListener) {
      el.addEventListener('touchstart', startDrag, true);
    }
    $.onEvent(el, 'mousedown', startDrag);
  }
  initMouseEvents (el) {
    el = el || this._el;

    if (isMobile) {
      this.event(el, 'touchstart', '_onTouchStart');
      this.event(el, 'touchend', '_onTouchEnd');
    } else {
      this.event(el, 'mouseover', 'onMouseOver');
      this.event(el, 'mousemove', 'onMouseMove');
      this.event(el, 'mouseout', 'onMouseOut');
      this.event(el, 'mousedown', 'onMouseDown');
      this.event(el, 'mouseup', 'onMouseUp');
      this.event(el, 'click', 'onClick');
    }

    var opts = this._opts;
    if (opts && opts.__result) {
      opts.__result.addSubscription(this, 'Select');
    }

    return this;
  }
  initFocusEvents (el) {
    el = el || this._el;
    this.event(el, 'focus', 'onFocus');
    this.event(el, 'blur', 'onBlur');
    return this;
  }
  initKeyEvents (el) {
    el = el || this._el;
    this.event(el, 'keydown', 'onKeyDown');
    this.event(el, 'keypress', 'onKeyPress');
    this.event(el, 'keyup', 'onKeyUp');
    return this;
  }
  _onTouchStart (e) {
    this.onMouseOver(e);
    this.onMouseDown(e);
  }
  _onTouchEnd (e) {
    this.onMouseUp(e);
    this.onClick(e);
    this.onMouseOut(e);
  }
  onMouseOver (e) {
    if (!this._enableMouseEvents)
      { this._isOver = true; }
    this.publish('Over', e);
  }
  onMouseMove (e) {
    if (!this._enableMouseEvents)
      { this.publish('Move', e); }
  }
  onMouseOut (e) {
    this._isOver = false;
    this.publish('Out', e);
  }
  onMouseDown (e) {
    this._isDown = true;
    this.publish('Down', e);
    return false;
  }
  onMouseUp (e) {
    this._isDown = false;
    this.publish('Up', e);
    return false;
  }
  onClick (e) {
    this.publish('Select', e);
    this.emit('click', e);
    return false;
  }
  onFocus (e) {
    this._isFocused = true;
    this.publish('Focus', e);
  }
  onBlur (e) {
    this._isFocused = false;
    this.publish('Blur', e);
  }
  onKeyUp (e) {
    this.publish('KeyUp', e);
  }
  onKeyPress (e) {
    this.publish('KeyPress', e);
  }
  onKeyDown (e) {
    this.publish('KeyDown', e);
  }
  onDragStart (dragEvt) {}
  onDrag (dragEvt, moveEvt) {}
  onDragStop (dragEvt, upEvt) {}
};

export default exports;
