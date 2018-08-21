require('./styles.css');

const ERROR_NO_GAME_SWITCH = 'NO_GAME_SWITCH';
const RADIUS = 20;
const CENTER = RADIUS / 2;
const START_ANGLE = -Math.PI / 2;
const TAU = Math.PI * 2;
const PROGRESS_UPDATE_RATE = 250; // ms


function createDom (type, className, parent) {
  parent = parent || document.body;
	var dom = document.createElement(type);
	parent.appendChild(dom);
	if (className) dom.className = className;
	return dom;
}

function setTapEvent (dom, cb, param) {
  dom.addEventListener('mousedown', function (e) {
    e.stopPropagation();
    e.preventDefault();
    cb(param);
  });
}

export default class GCXPromotionView {
  /**
   *
   * @param {Object} params - parameter object
   * @param {string} params.appID - app id
   * @param {Object} params.payload - ad payload
   * @param {string} params.imageURL - url to the creative image at the top
   * @param {string} params.iconURL - url to the icon image in the middle
   * @param {string} params.headline - text display in headline
   * @param {string} params.text - text display at the bottom
   * @param {string} params.cta - text display in the button
   * @param {number} [params.delayClosable = 5] - time to wait before the close button become clickable
   */
  constructor (params, parent = undefined) {
    this.appID = params.appID;
    this.payload = params.payload;
    this.delayClosable = params.delayClosable || 5;

    this._resolve = null;
    this._reject = null;

    this._overlay = createDom('div', 'adWrapper-overlay', parent);
    this._overlay.style.display = 'none';

    this._closeButton = createDom('div', 'adWrapper-closeButton', this._overlay);
    var canvas = createDom('canvas', null, this._closeButton);
    canvas.width = canvas.height = RADIUS;
    this._ctx = canvas.getContext('2d');
    this._ctx.fillStyle = '#5284ff';

    var creative = createDom('img', null, this._overlay);

    // TODO: handle images preloading
    creative.src = params.imageURL;

    createDom('h2', null, this._overlay).innerText = params.headline;
    createDom('div', 'adWrapper-icon', this._overlay).style.backgroundImage = 'url(' + params.iconURL + ')';
    createDom('h3', null, this._overlay).innerText = params.text;

    var button = createDom('div', 'adWrapper-button', this._overlay);
    button.innerText = params.cta;
    setTapEvent(button, this._close.bind(this));
  }

  _close (errorCode) {
    if (!this._overlay) return;
    document.body.removeChild(this._overlay);
    this._overlay = null;
    if (errorCode) {
      this._reject(new Error(errorCode));
    } else {
      this._resolve();
    }
  }

  show () {
    if (this._resolve) throw new Error('Already shown');
    this._overlay.style.display = '';

    var duration = this.delayClosable * 1000; // convert seconds to milliseconds
    var startTime = Date.now();
    var self = this;
    var ctx = this._ctx;

    function updateProgress () {
      var now = Date.now();
      var progress = (now - startTime) / duration;

      if (progress > 1) {
        self._closeButton.innerHTML = '×';
        setTapEvent(self._closeButton, self._close.bind(self), ERROR_NO_GAME_SWITCH);
        return;
      }

      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.lineTo(CENTER, CENTER - RADIUS);
      ctx.arc(CENTER, CENTER, RADIUS, START_ANGLE, START_ANGLE + progress * TAU, false);
      ctx.fill();

      setTimeout(updateProgress, PROGRESS_UPDATE_RATE);
    }

    updateProgress();

    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    }).finally(() => {
      this._resolve = null;
      this._reject = null;
    });
  }
}
