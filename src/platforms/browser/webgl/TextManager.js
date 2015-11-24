from util.browser import $;
import timer;

import .FontLoader;
import ui.resource.Font as Font;

exports = Class(function () {

  var MAX_BUFFERS = 500;

  this.init = function () {
    this._buffers = {};
    this._numBuffers = 0;
  };

  this.get = function (ctx, text, stroked) {
    var font = ctx.font;
    var fontData = Font.parse(font);
    if (!isFontLoaded(fontData.getOrigName())) { return; }

    var bufferKey = (stroked
          ? ctx.lineWidth + '|' + ctx.strokeStyle + '|'
          : '-|' + ctx.fillStyle)
      + '|' + font + '|' + text;

    if (!this._buffers[bufferKey]) {
      if (this._numBuffers > MAX_BUFFERS) {
        var oldest = Infinity;
        var oldestKey = null;
        for (var key in this._buffers) {
          var lastUsed = this._buffers[key].lastUsed;
          if (lastUsed < oldest) {
            oldest = lastUsed;
            oldestKey = key;
          }
        }

        ctx.deleteTextureForImage(this._buffers[oldestKey].image);
        delete this._buffers[oldestKey];
      } else {
        ++this._numBuffers;
      }

      var canvas = document.createElement('canvas');
      canvas.complete = true;
      this._buffers[bufferKey] = {
        lastUsed: 0,
        image: canvas,
        metrics: this._render(canvas, text, font, stroked, ctx.fillStyle, ctx.strokeStyle, ctx.lineWidth)
      };
    }

    this._buffers[bufferKey].lastUsed = timer.now;
    return this._buffers[bufferKey];
  };

  this._render = function (canvas, text, font, stroked, fillStyle, strokeStyle, lineWidth) {
    var ctx = canvas.getContext('2d');
    var metrics = getTextHeight(font);

    ctx.font = font;

    canvas.width = ctx.measureText(text).width + lineWidth;
    canvas.height = metrics.height + lineWidth;

    ctx.textBaseline = 'top';
    ctx.font = font;
    if (stroked) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.strokeText(text, lineWidth / 2, lineWidth / 2);
    } else {
      ctx.fillStyle = fillStyle;
      ctx.fillText(text, 0, 0);
    }

    return metrics;
  };
});

var heightMeasure = document.body.appendChild(document.createElement('div'));
var contents = heightMeasure.appendChild(document.createElement('span'));
$.setText(contents, 'Hg');
var baselineDiv = heightMeasure.appendChild(document.createElement('div'));
baselineDiv.style.cssText = 'display: inline-block; width: 1px; height: 0px; vertical-align: baseline';
var bottomDiv = heightMeasure.appendChild(document.createElement('div'));
bottomDiv.style.cssText = 'display: inline-block; width: 1px; height: 0px; vertical-align: bottom';
heightMeasure.style.cssText = 'position: absolute; top: 0px; left: -1000px; visibility: hidden; pointer-events: none';

var _fontHeightCache = {};
function getTextHeight (font) {
  if (!_fontHeightCache[font]) {
    heightMeasure.style.font = font;
    var metrics = {
      ascent: baselineDiv.getBoundingClientRect().top,
      height: bottomDiv.getBoundingClientRect().top,
      descent: 0
    };

    metrics.descent = metrics.height - metrics.ascent;
    _fontHeightCache[font] = metrics;
  }

  return _fontHeightCache[font];
}

var isFontLoaded = (function () {
  var FONT_LOADER_TIMEOUT = 30 * 1000;
  var _loaded = {};
  var _loading = {};

  function _checkFont(font) {
    _loading[font] = true;

    new FontLoader([font], {
      fontLoaded: function () {
        _loaded[font] = true;
      },
      fontsLoaded: function (err) {
        if (err) {
          console.error(err);
        }
      }
    }, FONT_LOADER_TIMEOUT).loadFonts();
  }

  return function isFontLoaded(font) {
    if (!_loading[font]) {
      _checkFont(font);
    }

    return _loaded[font];
  };
})();
