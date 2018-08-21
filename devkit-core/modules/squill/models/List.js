let exports = {};

import {
  merge,
  bind
} from 'base';

import Resource from './Resource';
import Widget from './Widget';
import Selection from '../Selection';

exports = class extends Widget {
  constructor (opts) {
    opts = merge(opts, {
      isFixedSize: true,
      recycle: true
    });

    super(opts);

    this._cellResource = new Resource();
    this._cells = {};

    this._needsSort = true;
    this._removed = {};
    this._renderOpts = { cellSpacing: 0 };
    this._renderMargin = 0;
    this._updatedCells = {};

    this.isRecycleEnabled = opts.recycle;

    this.updateOpts(opts);
  }
  updateOpts (opts) {
    if (this._opts) {
      for (var key in opts) {
        this._opts[key] = opts[key];
      }
    } else {
      this._opts = opts;
    }

    if (opts.getCell) {
      this.setCellGetter(opts.getCell);
    }
    if (opts.dataSource) {
      this.setDataSource(opts.dataSource);
    }
    if (opts.sorter) {
      this.setSorter(opts.sorter);
    }
    if ('renderMargin' in opts) {
      this._renderMargin = opts.renderMargin || 0;
    }
    this._maxSelections = opts.maxSelections || 1;

    if (opts.selectable) {
      this.selection = new Selection({
        parent: this,
        type: opts.selectable,
        maxSelections: opts.maxSelections
      });
      this.selection.subscribe('Select', this, this._onSelect);
      this.selection.subscribe('Deselect', this, this._onDeselect);
      if (opts.selections) {
        this.setSelections(opts.selections);
      }
    }

    return this._opts;
  }
  setSelections (selections) {
    selections.forEach(bind(this, 'select'));
  }
  getDataSource () {
    return this._dataSource;
  }
  setDataSource (dataSource) {
    if (this._dataSource) {
      this._dataSource.unsubscribe('Update', this, '_onUpdate');
      this._dataSource.unsubscribe('Remove', this, '_onRemove');
    }
    this._dataSource = dataSource;
    if (dataSource) {
      this._dataSource.subscribe('Update', this, '_onUpdate');
      this._dataSource.subscribe('Remove', this, '_onRemove');
      this.needsSort();
    }
  }
  _onUpdate (id, item) {
    var cell = this._cells[id];
    if (cell) {
      this._updatedCells[id] = item;
    }
    this.needsSort();
  }
  _onRemove (id, item) {
    this._removed[id] = true;
    this.needsSort();
  }
  needsSort () {
    this._needsSort = true;
    this._view.needsRepaint();
  }
  setSelected (data) {
    this._selected = data;
  }
  getSelected () {
    return this._selected;
  }
  setCellGetter (getCell) {
    this._getCell = getCell;
  }
  getCellById (id) {
    return this._cells[id];
  }
  setSorter (sorter) {
    this._sorter = sorter;
  }
  render (viewport) {
    if (!this._dataSource) {
      return;
    }

    if (this._needsSort) {
      this._needsSort = null;
      this._dataSource.sort();
      for (var id in this._updatedCells) {
        this._cells[id].setData(this._updatedCells[id], id);
        delete this._updatedCells[id];
      }
    }

    var count = this._dataSource.length;
    if (this._opts.isFixedSize) {
      this.renderFixed(viewport);
    } else {
      this._removeCells();

      // remove the views that were deleted from the datasource
      if (count) {
        this.renderVariable(viewport);
      }
    }
  }
  getRenderOpts () {
    return this._renderOpts;
  }
  _positionCell (cell, i, y) {
    var view = this._view;
    view.addCell(cell);

    var r = this._renderOpts;
    if (this._opts.isFixedSize) {
      if (this._opts.isTiled) {
        var x = i % r.numPerRow;
        var y = i / r.numPerRow | 0;
        view.positionCell(cell, {
          x: x * r.fullWidth,
          y: y * r.fullHeight,
          width: r.cellWidth,
          height: r.cellHeight
        });
      } else {
        view.positionCell(cell, {
          x: 0,
          y: i * r.fullHeight || 0,
          height: r.cellHeight
        });
      }
    } else {
      view.positionCell(cell, {
        x: 0,
        y: y
      });
    }
  }
  renderVariable (viewport) {
    if (!this._dataSource) {
      return;
    }
    if (!this._updateRenderOpts(viewport)) {
      return;
    }

    var i = 0;
    var y = 0;

    function renderOne () {
      var item = this._dataSource.getItemForIndex(i);
      if (!item) {
        this._view.setMaxY(y);
        return false;
      }

      var id = item[this._dataSource.key];
      var cell = this._createCell(item);
      this._positionCell(cell, i, y);
      cell.needsRepaint();

      ++i;
      y += cell.style.height;
      return true;
    }

    function renderMany () {
      var THRESHOLD = 50;
      // ms to render
      var n = 0,
        t = +new Date();
      while (n++ < 10 || +new Date() - t < THRESHOLD) {
        if (!renderOne.call(this)) {
          return;
        }
      }

      setTimeout(bind(this, renderMany), 100);
    }

    renderMany.call(this);
  }
  _removeCells () {
    var removed = this._removed;
    this._removed = {};
    for (var id in removed) {
      if (!this._dataSource.getItemForID(id)) {
        var cell = this._cells[id];
        if (cell) {
          cell.remove(this);
          delete this._cells[id];
        }
      }
    }
  }
  _createCell (item) {
    var id = item[this._dataSource.key];
    var cell = this._cells[id];
    if (!cell) {
      if (this.isRecycleEnabled) {
        cell = this._cellResource.get();
      }

      if (!cell) {
        cell = this._getCell(item, this._cellResource);
      }

      this._cells[id] = cell;
      cell.setController(this);
      cell.setData(item, id);
      cell.model.setResource(this._cellResource);
    }

    return cell;
  }
  _updateRenderOpts (viewport) {
    var r = this._renderOpts;
    r.top = viewport.y - this._renderMargin;
    r.height = viewport.height + 2 * this._renderMargin;
    r.bottom = r.top + r.height;
    var n = r.numRows = this._dataSource.length;

    if (this._opts.isFixedSize) {
      if (!r.cellWidth || !r.cellHeight) {
        var item = this._dataSource.getItemForIndex(0);
        if (!item) {
          return false;
        }

        var key = item[this._dataSource.key];
        var cell = this._cells[key] || (this._cells[key] = this._createCell(item));
        r.fullWidth = r.cellWidth = cell.getWidth();
        r.fullHeight = r.cellHeight = cell.getHeight();
        if (this._opts.isTiled && !r.cellWidth || !r.cellHeight) {
          return null;
        }

        var cellSpacing = this._opts.cellSpacing || 0;
        if (cellSpacing) {
          r.fullWidth += cellSpacing;
          r.fullHeight += cellSpacing;
        }
      }

      if (this._opts.isTiled) {
        r.maxWidth = viewport.width;
        r.numPerRow = r.maxWidth / r.fullWidth | 0;
        r.numRows = Math.ceil(n / r.numPerRow);
        r.start = Math.max(0, (r.top / r.fullHeight | 0) * r.numPerRow);
        r.end = Math.ceil(r.bottom / r.fullHeight) * r.numPerRow;
      } else {
        r.start = Math.max(0, r.top / r.fullHeight | 0);
        r.end = r.bottom / r.fullHeight + 1 | 0;
      }

      this._view.setMaxY(r.numRows * r.fullHeight);
    }

    return true;
  }
  renderFixed (viewport) {
    if (!this._updateRenderOpts(viewport)) {
      return;
    }

    var r = this._renderOpts;
    var i = 0;
    var dataSource = this._dataSource;
    var key = dataSource.key;

    var cells = this._cells;
    var newCells = {};

    for (var i = r.start; i < r.end; ++i) {
      var item = dataSource.getItemForIndex(i);
      if (!item) {
        break;
      } else {
        var cell = this._createCell(item);
        if (cell) {
          newCells[item[key]] = cell;
          this._positionCell(cell, i);

          // we remove all cells in prevCells that aren't used.
          // mark it as used by deleting it.
          delete cells[item[key]];
        }
      }
    }

    for (var id in cells) {
      var cell = cells[id];

      cell.remove(this);
      if (this.isRecycleEnabled) {
        cell.model.recycle();
      }
    }

    this._cells = newCells;
  }
  _onSelect (dataItem, id) {
    this.publish('Select', dataItem, id);
  }
  _onDeselect (dataItem, id) {
    this.publish('Deselect', dataItem, id);
  }
  isSelected (dataItem) {
    return this.selection && this.selection.isSelected(dataItem);
  }
  toggle (dataItem) {
    this.selection && this.selection.toggle(dataItem);
  }
  select (dataItem) {
    this.selection && this.selection.select(dataItem);
  }
  deselect (dataItem) {
    this.selection && this.selection.deselect(dataItem);
  }
  deselectAll () {
    if (this.selection) {
      var selection = this.selection.get();
      for (var id in selection) {
        var cell = this._cells[id];
        cell && cell._onDeselect && cell._onDeselect();
      }
      this.selection.deselectAll();
    }
  }
  getSelections () {
    var selectionIDMap = this.selection.get();
    var dataSource = this.getDataSource();
    var key = dataSource.getKey();

    return dataSource.getFilteredDataSource(function (item) {
      var itemKey = item[key];
      return !!selectionIDMap[itemKey];
    });
  }
  getSelectionCount () {
    return this.selection && this.selection.getSelectionCount();
  }
};
var List = exports;

export default exports;
