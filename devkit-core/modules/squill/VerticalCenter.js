let exports = {};

import { merge } from 'base';

import Widget from './Widget';
import browser from 'util/browser';
let $ = browser.$;

exports = class extends Widget {
  addElement () {
    this.contentPane.appendChild(el);
  }
};

exports.prototype._def = {
  tag: 'table',
  style: merge({
    height: '100%',
    width: '100%'
  }, def.style),
  attrs: {
    cellpadding: 0,
    cellspacing: 0
  },
  children: [$({
    tag: 'tbody',
    children: [$({
      tag: 'tr',
      children: [$({
        id: 'contentPane',
        tag: 'td',
        attrs: { valign: 'middle' },
        style: { verticalAlign: 'middle' }
      })]
    })]
  })]
};
export default exports;
