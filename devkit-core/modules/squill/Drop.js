let exports = {};

import { bind } from 'base';

import Widget from './Widget';

import browser from 'util/browser';
let $ = browser.$;

function cancelEvent (e) {
  e.stopPropagation();
  e.preventDefault();
  return false;
}

var _activeDocuments = [];
_activeDocuments.add = function (doc) {
  $.addClass(doc.body, 'squill-drop-hover');

  var n = this.length;
  var docWrapper;
  for (var i = 0; i < n; ++i) {
    if (this[i].doc == doc) {
      docWrapper = this[i];
      break;
    }
  }

  if (!docWrapper) {
    docWrapper = { doc: doc };
    this.push(docWrapper);
  }

  if (!docWrapper.handler) {
    docWrapper.handler = $.onEvent(doc.body, 'mousedown', function () {
      if (docWrapper.handler) {
        docWrapper.handler();
        docWrapper.handler = null;
      }
    });
  }

  return docWrapper;
};

_activeDocuments.remove = function (doc) {
  var n = this.length;
  for (var i = 0; i < n; ++i) {
    if (this[i].doc == doc) {
      if (this[i].timeout) {
        clearTimeout(this[i].timeout);
      }

      $.removeClass(doc.body, 'squill-drop-hover');
      this.splice(i, 1);
      return;
    }
  }
};

_activeDocuments.clear = function () {
  while (this[0]) {
    this.remove(this[0].doc);
  }
};

_activeDocuments.clearTimeouts = function () {
  var n = this.length;
  for (var i = 0; i < n; ++i) {
    if (this[i].timeout) {
      clearTimeout(this[i].timeout);
    }
  }
};

function registerDocument (doc) {
  var body = doc.body;
  body.addEventListener('dragenter', cancelEvent, false);
  body.addEventListener('dragover', function (e) {
    var d = _activeDocuments.add(doc);
    clearTimeout(d.timeout);
    return cancelEvent(e);
  }, false);

  body.addEventListener('dragleave', function (e) {
    _activeDocuments.add(doc).timeout = setTimeout(function () {
      _activeDocuments.remove(doc);
    });

    return cancelEvent(e);
  }, false);

  body.addEventListener('drop', function (e) {
    $.removeClass(body, 'squill-drop-hover');
    return cancelEvent(e);
  }, false);

  body.addEventListener('dragend', function (e) {
    $.removeClass(body, 'squill-drop-hover');
  }, false);
}

registerDocument(document);

exports = class extends Widget {
  buildWidget () {
    super.buildWidget(...arguments);

    this._hoverClass = this._opts.hoverClass || 'over';

    var el = this._el;
    el.addEventListener('dragenter', bind(this, function (e) {
      this.emit('dropenter');
      _activeDocuments.clearTimeouts();
      return cancelEvent(e);
    }), false);
    el.addEventListener('dragleave', bind(this, function (e) {
      $.removeClass(el, this._hoverClass);
      this.emit('dropleave');
      return cancelEvent(e);
    }), false);

    // modify the styles
    el.addEventListener('dragover', bind(this, function (e) {
      $.addClass(el, this._hoverClass);
      _activeDocuments.clearTimeouts();
      this.emit('dropover');
      return cancelEvent(e);
    }), false);

    el.addEventListener('dragend', bind(this, function (e) {
      _activeDocuments.clear();
      $.removeClass(el, this._hoverClass);
    }));

    el.addEventListener('drop', bind(this, function (e) {
      _activeDocuments.clear();
      $.removeClass(el, this._hoverClass);

      var files = e.dataTransfer && e.dataTransfer.files;
      var count = files && files.length || 0;
      var file = files && files[0];

      if (count < 1) {
        this.emit('error', 'no file dropped');
      } else {
        var reader = new FileReader();
        reader.onload = bind(this, function (evt) {
          var res = event.target && event.target.result;
          if (res) {
            this.onDrop(res);
            this.emit('drop', res);
          } else {
            this.emit('error', 'no data read');
          }
        });

        reader.readAsDataURL(file);
      }
    }), false);
  }
  onDrop () {}
};

export default exports;
