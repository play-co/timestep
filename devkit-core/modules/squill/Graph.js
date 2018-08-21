let exports = {};

import {
  merge,
  bind
} from 'base';

import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';

import hint from './hint';

exports = class extends Widget {
  constructor (opts) {
    params = merge(opts, { tag: 'canvas' });
    super(...arguments);

    this.setSettings(opts.settings || {});

    this._width = opts.width || 400;
    this._height = opts.height || 400;

    this._rectangles = [];
    this._data = false;

    $.onEvent(this._el, 'mousemove', this, this._onMouseMove);
    $.onEvent(this._el, 'mouseout', this, this._onMouseOut);
  }
  _onMouseMove (evt) {
    var rectangles = this._rectangles,
      rectangle, found = false,
      i = rectangles.length;

    while (i) {
      rectangle = rectangles[--i];
      if (evt.offsetX >= rectangle.x1 && evt.offsetY >= rectangle.y1 && evt
        .offsetX <= rectangle.x2 && evt.offsetY <= rectangle.y2) {
        found = true;
        break;
      }
    }

    if (found) {
      hint.show(evt.pageX + 15, evt.pageY + 15, rectangle.label);
    } else {
      hint.hide();
    }
  }
  _onMouseOut (evt) {
    hint.hide();
  }
  buildWidget () {
    var el = this._el;

    this.initMouseEvents(el);
    this.initKeyEvents(el);
  }
  _renderBackground (ctx) {
    var el = this._el,
      width = el.width,
      height = el.height;

    this._currentWidth = width;
    this._currentHeight = height;

    if (this._settings.fillColor) {
      ctx.fillStyle = this._settings.fillColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }
  _calculateSegments (ctx, data) {
    var settings = this._settings,
      max = 0,
      maxLabel = 0,
      i, j = data.length,
      k, l;

    for (i = 0; i < j; i++) {
      item = data[i];
      maxLabel = Math.max(ctx.measureText(item.title).width, maxLabel);
      if (maxLabel > settings.maxLabelSize) {
        maxLabel = settings.maxLabelSize;
      }
      for (k = 0, l = item.points.length; k < l; k++) {
        max = Math.max(item.points[k], max);
      }
    }

    var steps = [
        0.5,
        0.25,
        0.2,
        0.125,
        0.1
      ],
      stepIndex = 0,
      stepCount, factor = 1;

    while (max / (steps[stepIndex] * factor) > 10) {
      stepIndex++;
      if (stepIndex >= steps.length) {
        stepIndex = 0;
        factor *= 10;
      }
    }

    stepCount = Math.ceil(max / (steps[stepIndex] * factor));
    return {
      steps: stepCount,
      step: steps[stepIndex],
      max: stepCount * steps[stepIndex] * factor,
      maxLabel: maxLabel + 4,
      factor: factor
    };
  }
  _trimLabel (segmentInfo, ctx, label) {
    if (ctx.measureText(label).width > segmentInfo.maxLabel) {
      while (ctx.measureText(label + '...').width > segmentInfo.maxLabel) {
        label = label.substr(0, label.length - 1);
      }
      label += '...';
    }
    return label;
  }
  _renderHorizontalAxis (segmentInfo, ctx, data) {
    var settings = this._settings,
      valueSpace = settings.valueSpace,
      mainPadding = settings.mainPadding,
      width = this._currentWidth - mainPadding * 2 - valueSpace,
      height = this._currentHeight - mainPadding * 2 - segmentInfo.maxLabel,
      step = width / data.length,
      label, hasDecimal, x, y, i, j, k;

    ctx.strokeStyle = settings.barBackground;
    for (i = 0; i < 2; i++) {
      x = valueSpace + mainPadding + 0.5 + i * width;
      ctx.beginPath();
      ctx.moveTo(x, mainPadding);
      ctx.lineTo(x, mainPadding + height);
      ctx.stroke();
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    for (i = 0, j = data.length; i < j; i++) {
      x = valueSpace + mainPadding + i * step;
      ctx.save();
      ctx.rotate(Math.PI * -0.5);
      label = this._trimLabel(segmentInfo, ctx, data[i].title);

      ctx.fillStyle = this._settings.textColor;
      ctx.fillText(label, -(mainPadding + height + 4), x);
      ctx.restore();

      if ((i & 1) === 0) {
        ctx.fillStyle = settings.barBackground;
        ctx.fillRect(x, mainPadding, step, height);
      }
    }

    ctx.strokeStyle = this._settings.lineColor;
    ctx.fillStyle = '#000000';

    hasDecimal = 0;
    i = height;
    j = 0;
    while (i >= 0) {
      label = (j * segmentInfo.step).toString(10);
      k = label.indexOf('.');
      if (k !== -1) {
        k = label.length - k - 1;
        if (k > hasDecimal) {
          hasDecimal = k;
        }
      }
      i = Math.ceil(i - height / segmentInfo.steps);
      j++;
    }

    i = height;
    j = 0;
    while (i >= 0) {
      x = mainPadding + valueSpace;
      y = mainPadding + ~~i + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.stroke();

      label = (j * segmentInfo.step).toString(10);
      if (hasDecimal && label.indexOf('.') === -1) {
        label += '.';
        for (k = 0; k < hasDecimal; k++) {
          label += '0';
        }
      }
      ctx.fillStyle = this._settings.textColor;
      ctx.fillText(label, valueSpace + mainPadding - 2, mainPadding + i - 8);

      i = Math.ceil(i - height / segmentInfo.steps);
      j++;
    }

    ctx.textAlign = 'left';

    label = settings.mainLabel + ' x' + segmentInfo.factor;

    i = mainPadding;
    j = mainPadding + height / 2 + (ctx.measureText(label).width + settings
      .itemSize) / 2;
    ctx.save();
    ctx.rotate(Math.PI * -0.5);
    ctx.fillStyle = this._settings.textColor;
    ctx.fillText(label, -j - settings.itemSize, i);
    ctx.restore();

    j -= ctx.measureText(label).width;
    ctx.beginPath();
    ctx.moveTo(i + 7.5, j);
    ctx.lineTo(i + 7.5, j + 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + 3.5, j + 5.5);
    ctx.lineTo(i + 7.5, j);
    ctx.lineTo(i + 11.5, j + 5.5);
    ctx.stroke();
  }
  _renderVerticalBars (segmentInfo, ctx, data) {
    var settings = this._settings,
      valueSpace = settings.valueSpace,
      mainPadding = settings.mainPadding,
      width = this._currentWidth - mainPadding * 2 - valueSpace,
      height = this._currentHeight - mainPadding * 2 - segmentInfo.maxLabel,
      step = width / data.length,
      barWidth = step - settings.barPadding * 2,
      barWidthSeg, barHeight, barX, item, points, i, j, k, l;

    ctx.globalAlpha = 0.9;
    for (i = 0, j = data.length; i < j; i++) {
      item = data[i];
      points = item.points;

      l = points.length;
      barWidthSeg = ~~(barWidth / l);
      for (k = 0; k < l; k++) {
        barHeight = item.points[k] / segmentInfo.max * height;
        barX = valueSpace + mainPadding + i * step + settings.barPadding;
        barY = mainPadding + height - barHeight;

        ctx.fillStyle = settings.dataColors[k % settings.dataColors.length];
        ctx.fillRect(barX + k * barWidthSeg, barY, barWidthSeg - 1,
          barHeight);
      }
    }
    ctx.globalAlpha = 1;
  }
  _renderVerticalPoints (segmentInfo, ctx, data) {
    var settings = this._settings,
      renderPoints = settings.types.indexOf('points') !== -1,
      renderLines = settings.types.indexOf('lines') !== -1,
      renderArea = settings.types.indexOf('area') !== -1,
      valueSpace = settings.valueSpace,
      mainPadding = settings.mainPadding,
      width = this._currentWidth - mainPadding * 2 - valueSpace,
      height = this._currentHeight - mainPadding * 2 - segmentInfo.maxLabel,
      step = width / data.length,
      pointWidth = step - settings.barPadding * 2,
      pointX, pointY, points, point, pointList = [],
      hasLast, item, i, j, k, l;

    pointYLast = null;

    for (i = 0, j = data.length; i < j; i++) {
      item = data[i];
      points = item.points;

      hasLast = pointYLast !== null;
      if (pointYLast === null) {
        pointYLast = [];
      }
      pointX = ~~(valueSpace + mainPadding + i * step + settings.barPadding +
        pointWidth / 2);
      for (k = 0, l = points.length; k < l; k++) {
        pointY = ~~(mainPadding + height - item.points[k] / segmentInfo.max *
          height);

        if (!pointList[k]) {
          pointList[k] = [];
        }
        pointList[k].push({
          x: pointX,
          y: pointY
        });

        ctx.strokeStyle = settings.dataColors[k % settings.dataColors.length];
        if (renderPoints) {
          ctx.strokeRect(pointX - 4.5, pointY - 4.5, 10, 10);
        }

        if (hasLast && renderLines) {
          ctx.beginPath();
          ctx.moveTo(pointXLast, pointYLast[k]);
          ctx.lineTo(pointX, pointY);
          ctx.stroke();
        }

        pointYLast[k] = pointY;
      }
      pointXLast = pointX;
    }

    if (renderArea) {
      ctx.globalAlpha = 0.05;
      for (i = 0, j = pointList.length; i < j; i++) {
        ctx.beginPath();
        ctx.lineTo(pointList[i][0].x, mainPadding + height);
        for (k = 0, l = pointList[i].length; k < l; k++) {
          point = pointList[i][k];
          ctx.lineTo(point.x, point.y);
        }
        ctx.lineTo(pointList[i][l - 1].x, mainPadding + height);
        ctx.closePath();
        ctx.fillStyle = settings.dataColors[i % settings.dataColors.length];
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  _renderVerticalAxis (segmentInfo, ctx, data) {
    var settings = this._settings,
      valueSpace = settings.valueSpace,
      mainPadding = settings.mainPadding,
      width = this._currentWidth - mainPadding * 2 - segmentInfo.maxLabel,
      height = this._currentHeight - mainPadding * 2 - valueSpace,
      step = height / data.length,
      label, hasDecimal, x, y, i, j, k;

    ctx.strokeStyle = settings.barBackground;
    for (i = 0; i < 2; i++) {
      y = mainPadding + 0.5 + i * height;
      ctx.beginPath();
      ctx.moveTo(mainPadding + segmentInfo.maxLabel, y);
      ctx.lineTo(mainPadding + segmentInfo.maxLabel + width, y);
      ctx.stroke();
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    for (i = 0, j = data.length; i < j; i++) {
      y = mainPadding + i * step;
      label = this._trimLabel(segmentInfo, ctx, data[i].title);

      ctx.fillStyle = this._settings.textColor;
      ctx.fillText(label, mainPadding + segmentInfo.maxLabel - 4, y + 4);
      this._rectangles.push({
        x1: mainPadding + segmentInfo.maxLabel - 4 - ctx.measureText(
          label).width,
        y1: y + 4,
        x2: mainPadding + segmentInfo.maxLabel - 4,
        y2: y + 20,
        label: data[i].title
      });
      if ((i & 1) === 0) {
        ctx.fillStyle = settings.barBackground;
        ctx.fillRect(mainPadding + segmentInfo.maxLabel, y, width, step);
      }
    }

    ctx.textAlign = 'center';

    ctx.strokeStyle = this._settings.lineColor;
    ctx.fillStyle = '#000000';

    hasDecimal = 0;
    i = 0;
    j = 0;
    while (i <= width) {
      label = (j * segmentInfo.step).toString(10);
      k = label.indexOf('.');
      if (k !== -1) {
        k = label.length - k - 1;
        if (k > hasDecimal) {
          hasDecimal = k;
        }
      }

      i = Math.floor(i + width / segmentInfo.steps);
      j++;
    }

    i = 0;
    j = 0;
    while (i <= width) {
      x = mainPadding + segmentInfo.maxLabel + ~~i + 0.5;
      y = mainPadding;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + height);
      ctx.stroke();

      label = (j * segmentInfo.step).toString(10);
      if (hasDecimal && label.indexOf('.') === -1) {
        label += '.';
        for (k = 0; k < hasDecimal; k++) {
          label += '0';
        }
      }

      ctx.fillStyle = this._settings.textColor;
      ctx.fillText(label, mainPadding + segmentInfo.maxLabel + i,
        mainPadding + height + 2);

      i = Math.floor(i + width / segmentInfo.steps);
      j++;
    }

    ctx.textAlign = 'left';

    label = settings.mainLabel + ' x' + segmentInfo.factor;

    i = mainPadding + width / 2 - (ctx.measureText(label).width + settings.itemSize) /
      2 + segmentInfo.maxLabel;
    j = mainPadding + height + 18;

    ctx.fillStyle = this._settings.textColor;
    ctx.fillText(label, i, j);

    i += ctx.measureText(label).width;
    ctx.beginPath();
    ctx.moveTo(i + 4, j + 7.5);
    ctx.lineTo(i + settings.itemSize, j + 7.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + settings.itemSize - 4, j + 3.5);
    ctx.lineTo(i + settings.itemSize, j + 7.5);
    ctx.lineTo(i + settings.itemSize - 4, j + 11.5);
    ctx.stroke();
  }
  _renderHorizontalBars (segmentInfo, ctx, data) {
    var settings = this._settings,
      valueSpace = settings.valueSpace,
      mainPadding = settings.mainPadding,
      width = this._currentWidth - mainPadding * 2 - segmentInfo.maxLabel,
      height = this._currentHeight - mainPadding * 2 - valueSpace,
      step = height / data.length,
      barWidth, barHeight = step - settings.barPadding * 2,
      barHeightSeg, barX, barY, item, points, i, j, k, l;

    ctx.globalAlpha = 0.9;
    for (i = 0, j = data.length; i < j; i++) {
      item = data[i];
      points = item.points;

      l = points.length;
      barHeightSeg = ~~(barHeight / l);
      for (k = 0; k < l; k++) {
        barWidth = ~~(item.points[k] / segmentInfo.max * width);
        barX = segmentInfo.maxLabel + mainPadding;
        barY = ~~mainPadding + i * step + settings.barPadding;

        ctx.fillStyle = settings.dataColors[k % settings.dataColors.length];
        ctx.fillRect(barX, barY + k * barHeightSeg, barWidth, barHeightSeg -
          1);
      }
    }
    ctx.globalAlpha = 1;
  }
  _renderHorizontalPoints (segmentInfo, ctx, data) {
    var settings = this._settings,
      renderPoints = settings.types.indexOf('points') !== -1,
      renderLines = settings.types.indexOf('lines') !== -1,
      renderArea = settings.types.indexOf('area') !== -1,
      valueSpace = settings.valueSpace,
      mainPadding = settings.mainPadding,
      width = this._currentWidth - mainPadding * 2 - segmentInfo.maxLabel,
      height = this._currentHeight - mainPadding * 2 - valueSpace,
      step = height / data.length,
      pointHeight = step - settings.barPadding * 2,
      pointX, pointY, points, point, pointList = [],
      hasLast, item, i, j, k, l;

    pointXLast = null;

    for (i = 0, j = data.length; i < j; i++) {
      item = data[i];
      points = item.points;

      hasLast = pointXLast !== null;
      if (pointXLast === null) {
        pointXLast = [];
      }
      pointY = ~~(mainPadding + i * step + settings.barPadding +
        pointHeight / 2);
      for (k = 0, l = points.length; k < l; k++) {
        pointX = ~~(mainPadding + item.points[k] / segmentInfo.max * width +
          segmentInfo.maxLabel);

        if (!pointList[k]) {
          pointList[k] = [];
        }
        pointList[k].push({
          x: pointX,
          y: pointY
        });

        ctx.strokeStyle = settings.dataColors[k % settings.dataColors.length];
        if (renderPoints) {
          ctx.strokeRect(pointX - 4.5, pointY - 4.5, 10, 10);
        }

        if (hasLast && renderLines) {
          ctx.beginPath();
          ctx.moveTo(pointXLast[k], pointYLast);
          ctx.lineTo(pointX, pointY);
          ctx.stroke();
        }

        pointXLast[k] = pointX;
      }
      pointYLast = pointY;
    }

    if (renderArea) {
      ctx.globalAlpha = 0.05;
      for (i = 0, j = pointList.length; i < j; i++) {
        ctx.beginPath();
        ctx.moveTo(mainPadding + segmentInfo.maxLabel, pointList[i][0].y);
        for (k = 0, l = pointList[i].length; k < l; k++) {
          point = pointList[i][k];
          ctx.lineTo(point.x, point.y);
        }
        ctx.lineTo(mainPadding + segmentInfo.maxLabel, pointList[i][l - 1].y);
        ctx.closePath();
        ctx.fillStyle = settings.dataColors[i % settings.dataColors.length];
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  setData (data) {
    var el = this._el,
      ctx = el.getContext('2d'),
      settings = this._settings,
      types = settings.types,
      axisRenderMethod = function () {},
      barsRenderMethod = function () {},
      pointsRenderMethod = function () {},
      segmentInfo;

    switch (settings.orientation) {
      case 'horizontal':
        el.width = this._width;
        el.height = data.length * settings.itemSize + this._settings.valueSpace;
        axisRenderMethod = bind(this, this._renderVerticalAxis);
        barsRenderMethod = bind(this, this._renderHorizontalBars);
        pointsRenderMethod = bind(this, this._renderHorizontalPoints);
        break;

      case 'vertical':
        el.width = data.length * settings.itemSize + this._settings.valueSpace;
        el.height = this._height;
        axisRenderMethod = bind(this, this._renderHorizontalAxis);
        barsRenderMethod = bind(this, this._renderVerticalBars);
        pointsRenderMethod = bind(this, this._renderVerticalPoints);
        break;
    }

    ctx.font = settings.font;

    this._renderBackground(ctx);

    if (data.length) {
      segmentInfo = this._calculateSegments(ctx, data);

      axisRenderMethod(segmentInfo, ctx, data);

      if (types.indexOf('points') !== -1 || types.indexOf('area') !== -1 ||
        types.indexOf('lines') !== -1) {
        pointsRenderMethod(segmentInfo, ctx, data);
      }
      if (types.indexOf('bars') !== -1) {
        barsRenderMethod(segmentInfo, ctx, data);
      }
    }

    this._data = data;
  }
  setSettings (settings) {
    settings.mainLabel = settings.mainLabel || '';
    settings.textColor = settings.textColor || '#000000';
    settings.fillColor = settings.fillColor === undefined ? '#FFFFFF' :
      settings.fillColor;
    settings.lineColor = settings.lineColor || '#000000';
    settings.orientation = settings.oriantation || 'horizontal';
    settings.types = settings.types || 'bars,lines,area,points';
    settings.barPadding = settings.barPadding || 2;
    settings.barBackground = settings.barBackground || '#F8F8F8';
    settings.mainPadding = settings.mainPadding || 10;
    settings.valueSpace = settings.valueSpace || 40;
    settings.dataColors = settings.dataColors || [
      '#DD0000',
      '#00DD00',
      '#0000DD'
    ];
    settings.font = settings.font || '13px Verdana';
    settings.maxLabelSize = settings.maxLabelSize || 200;
    settings.itemSize = settings.itemSize || 50;

    this._settings = settings;
  }
  update () {
    this._data && this.setData(this._data);
  }
};
exports.prototype._css = 'cnvs';
exports.prototype._type = 'canvas';
var Graph = exports;

export default exports;
