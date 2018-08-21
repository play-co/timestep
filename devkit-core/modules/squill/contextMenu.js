let exports = {};

import browser from 'util/browser';
let $ = browser.$;

import Widget from './Widget';

var contextMenu = false;

document.oncontextmenu = function (evt) {
  var element = evt.target;
  while (element) {
    if (element.contextMenu) {
      showMenu(element.contextMenu, evt.x, evt.y);
      return false;
    } else {
      element = element.parentNode;
    }
  }
  return true;
};

function clearMenu () {
  while (contextMenu.elements.length) {
    $.remove(contextMenu.elements.pop());
  }
}

function clickOption (evt) {
  var option = contextMenu.options[evt.target.optionIndex];
  if (option) {
    if (option.checked === true || option.checked === false) {
      option.checked = !option.checked;
      if (option.checked) {
        $.addClass(evt.target, 'checkedOption');
      } else {
        $.removeClass(evt.target, 'checkedOption');
      }
      option.onchange && option.onchange(option.checked);
    } else {
      hideMenu();
      option.onclick && option.onclick();
    }
  } else {
    hideMenu();
  }
};

function showMenu (menu, x, y) {
  if (contextMenu === false) {
    contextMenu = {
      overlay: document.createElement('div'),
      element: document.createElement('div'),
      elements: []
    };

    document.body.appendChild(contextMenu.overlay);
    document.body.appendChild(contextMenu.element);

    $.onEvent(contextMenu.overlay, 'mousedown', this, function () {
      hideMenu();
    });
    $.onEvent(contextMenu.element, 'mousedown', this, function (evt) {
      $.stopEvent(evt);
    });
  }

  contextMenu.options = menu.options;

  $.addClass(contextMenu.overlay, 'contextMenuOverlay');
  $.addClass(contextMenu.element, 'contextMenu');

  clearMenu();

  var className, style, element, option, i, j;

  for (i = 0, j = menu.options.length; i < j; i++) {
    option = menu.options[i];
    if (option.title === '-') {
      contextMenu.elements.push($({
        parent: contextMenu.element,
        className: 'optionSeparator1'
      }));
      contextMenu.elements.push($({
        parent: contextMenu.element,
        className: 'optionSeparator2'
      }));
    } else {
      className = 'option';
      if (option.checked === true) {
        className += ' checkedOption';
      }

      if (option.selected === true) {
        className += ' selectedOption';
      }

      if (option.className) {
        className += ' ' + option.className;
      }

      element = $({
        parent: contextMenu.element,
        tag: 'a',
        text: option.title,
        className: className
      });

      element.onclick = clickOption;
      element.optionIndex = i;
    }
    contextMenu.elements.push(element);
  }

  $.style(contextMenu.overlay, { display: 'block' });

  if (menu.width && x + menu.width > document.body.offsetWidth) {
    x -= menu.width;
  }
  style = {
    left: x + 'px',
    top: y + 'px',
    display: 'block'
  };
  if (menu.width) {
    style.width = menu.width + 'px';
  }
  $.style(contextMenu.element, style);
};

function hideMenu () {
  $.style(contextMenu.overlay, { display: 'none' });
  $.style(contextMenu.element, { display: 'none' });
};

exports.show = function (contextMenu, target) {
  var rect = target.getBoundingClientRect();
  showMenu(contextMenu, rect.left + ~~(rect.width / 2), rect.top + ~~(rect.height /
    2));
};

export default exports;
