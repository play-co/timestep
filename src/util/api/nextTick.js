import { bind } from 'base';

var _onTick = window.requestAnimationFrame || window.setTimeout;

function nextTick (cb, ctx) {
  if (ctx) {
    cb = bind(cb, ctx);
  }
  _onTick(cb);
}

module.exports = nextTick;
