import { bind } from 'base';

import Widget from './Widget';
import Point from 'math/geom/Point';
import browser from 'util/browser';
let $ = browser.$;
import Window from './Window';
import transitions from './transitions';

module.exports = class extends Widget {
  getContainer () {
    return this._container;
  }
  buildWidget (el, scope) {
    if (this._opts.title) {
      this.setTitle(this._opts.title);
    }

    if (this._opts.footer) {
      this.buildChildren(this._opts.footer, this._footer, scope);
    }

    if (this._opts.header) {
      this.buildChildren(this._opts.header, this._header, scope);
    }

    this._isModal = !!this._opts.isModal;

    if (!this._opts.closeable) {
      $.hide(this._closeBtn);
    }

    $.onEvent(this._closeBtn, 'click', this, 'hide', null);
    $.onEvent(this._closeBtn, 'touchend', this, 'hide', null);

    this.initDragEvents(this._titlebar);
  }
  setTitle (title) {
    $.setText(this._titlebarText, title);
  }
  onDrag (dragEvt, moveEvt, delta) {
    if (!dragEvt.data) {
      dragEvt.data = new Point(parseInt(this._el.style.left), parseInt(this
        ._el.style.top));
    }

    var pos = Point.add(dragEvt.data, Point.subtract(dragEvt.currPt,
        dragEvt.srcPt)),
      dim = Window.get().getViewport();

    this._el.style.left = Math.max(0, pos.x) + 'px';
    this._el.style.top = Math.max(0, pos.y) + 'px';
  }
  dispatchButton (target, evt) {
    if (this.delegate && this.delegate.call(this, target) !== false) {
      this.hide(target);
    }
  }
  setIsModal (isModal) {
    this._isModal = isModal;
    if (this.isShowing()) {
      this.showUnderlay();
    }
  }
  center () {
    var el = this.getElement();
    var parent = el.parentNode;
    if (!parent) {
      return;
    }

    var container = parent.getBoundingClientRect();
    el.style.left = Math.max(0, (container.width - el.offsetWidth) / 2) +
      'px';
    el.style.top = Math.max(0, (container.height - el.offsetHeight) / 2) +
      'px';
  }
  show () {
    var el = this.getElement();
    if (!el.parentNode) {
      document.body.appendChild(el);
    }

    var ret = super.show(...arguments);

    if (this._isModal) {
      this.showUnderlay();
    }

    this.center();

    return ret;
  }
  hide () {
    var transition = super.hide(...arguments);
    transition.on('start', bind(this, 'hideUnderlay'));
    return transition;
  }
  showUnderlay () {
    var underlay = this._underlay;
    if (!underlay) {
      underlay = this._underlay = $({
        className: 'squill-dialog-underlay',
        style: {
          parent: document.body,
          position: 'fixed',
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
          background: this._opts.underlayColor || 'rgba(0, 0, 0, 0.85)'
        }
      });

      underlay.addEventListener('click', bind(this, 'hide'));
    }

    underlay.style.opacity = 0;
    underlay.style.zIndex = getComputedStyle(this._el).zIndex - 1;
    underlay.style.display = 'block';
    this._el.parentNode.appendChild(this._underlay);

    transitions.cssFadeIn(underlay);
  }
  hideUnderlay () {
    var underlay = this._underlay;
    if (underlay) {
      transitions.cssFadeOut(underlay);
    }
  }
};
module.exports.prototype._def = {
  draggable: true,
  closeable: true,
  style: {
    position: 'absolute',
    display: 'flex'
  },
  children: [{
    id: '_titlebar',
    children: [{
      id: '_closeBtn',
      children: [{ id: '_closeBtnIcon' }]
    },
        { id: '_titlebarText' }
      ]
  },
    { id: '_header' },
    { id: '_container' },
    { id: '_footer' }
  ]
};
module.exports.prototype._css = 'dialog';
