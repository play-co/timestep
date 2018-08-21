// https://github.com/smnh/FontLoader/blob/master/FontLoader.js
/* globals define, exports, module */
(function (root, definition) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], definition);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but only CommonJS-like
    // environments that support module.exports, like Node.
    module.exports = definition();
  } else {
    // Browser globals (root is window)
    root.FontLoader = definition();
  }
}(window, function () {
  var isIE = /MSIE/i.test(navigator.userAgent),
    ieVer = null;

  // Get Internet Explorer version
  if (isIE) {
    var re, result;
    re = new RegExp('MSIE ([0-9]{1,}[.0-9]{0,})');
    result = re.exec(navigator.userAgent);
    if (result !== null) {
      ieVer = parseFloat(result[1]);
    }
  }

  /**
   * @typedef {Object} FontDescriptor
   * @property {String} family
   * @property {String} weight
   * @property {String} style
   */
  /**
   * FontLoader detects when web fonts specified in the "fontFamiliesArray" array were loaded and rendered. Then it
   * notifies the specified delegate object via "fontLoaded" and "complete" methods when specific or all fonts were
   * loaded respectively. The use of this functions implies that the insertion of specified web fonts into the
   * document is done elsewhere.
   *
   * The fonts parameter may be an array of strings specifying the font-families with optionally specified font
   * variations using FVD notation or font descriptor objects of the following type:
   * {
   *     family: "fontFamily",
   *     weight: 400,
   *     style: 'normal'
   * }
   * Where styles may ne one of the following: normal, bold, italic or oblique. If only string is specified, the
   * default used weight and style are 400 and 'normal' respectively.
   *
   * If all the specified fonts were loaded before the timeout was reached, the "complete" delegate method will be
   * invoked with "null" error parameter. Otherwise, if timeout was reached before all specified fonts were loaded,
   * the "complete" method will be invoked with an error object with two fields: the "message" string and the
   * "notLoadedFonts" array of FontDescriptor objects of all the fonts that weren't loaded.
   *
   * @param {Array.<String|FontDescriptor>} fonts   Array of font-family strings or font descriptor objects.
   * @param {Object}        delegate                Delegate object whose callback methods will be invoked in its own context.
   * @param {Function}      [delegate.complete]     Called when all fonts were loaded or the timeout was reached.
   * @param {Function}      [delegate.fontLoaded]   Called for each loaded font with its font-family string as its single parameter.
   * @param {Number}        [timeout=3000]          Timeout in milliseconds. Pass "null" to disable timeout.
   * @param {HTMLDocument}  [contextDocument]       The DOM tree context to use, if none provided then it will be the document.
   * @constructor
   */
  function FontLoader (fonts, delegate, timeout, contextDocument) {
    // Public
    this.delegate = delegate;
    this.timeout = typeof timeout !== 'undefined' ? timeout : 3000;

    // Private
    this._fontsArray = this._parseFonts(fonts);
    this._testDiv = null;
    this._testContainer = null;
    this._adobeBlankSizeWatcher = null;
    this._sizeWatchers = [];
    this._timeoutId = null;
    this._intervalId = null;
    this._intervalDelay = 50;
    this._numberOfLoadedFonts = 0;
    this._numberOfFonts = this._fontsArray.length;
    this._fontsMap = {};
    this._finished = false;
    this._document = contextDocument || document;
  }

  // TODO: fully remove this support from the default font loader
  // FontLoader.useAdobeBlank = !isIE || ieVer >= 11;
  FontLoader.useAdobeBlank = false;

  FontLoader.useResizeEvent = isIE && ieVer < 11 && typeof document.attachEvent !==
    'undefined';
  FontLoader.useIntervalChecking = window.opera || isIE && ieVer < 11 && !FontLoader.useResizeEvent;
  FontLoader.referenceText =
    ' !"\\#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~';
  FontLoader.referenceFontFamilies = FontLoader.useAdobeBlank ? [
    'AdobeBlank'
  ] : [
    'serif',
    'cursive'
  ];
  FontLoader.adobeBlankFontFaceStyleId = 'fontLoaderAdobeBlankFontFace';
  FontLoader.adobeBlankReferenceSize = null;
  FontLoader.referenceFontFamilyVariationSizes = {};
  FontLoader.adobeBlankFontFaceRule = '@font-face{ font-family:AdobeBlank; }';
  FontLoader.fontStyleAliasesMap = {
    'n': 'normal',
    'b': 'bold',
    'i': 'italic',
    'o': 'oblique'
  };
  FontLoader.fontStyleAliasesMap = {
    'n': 'normal',
    'b': 'bold',
    'i': 'italic',
    'o': 'oblique'
  };

  FontLoader.prototype = {
    constructor: FontLoader,
    loadFonts: function () {
      var self = this,
        newFontVariations;

      if (this._numberOfFonts === 0) {
        this._finish();
        return;
      }

      if (this.timeout !== null) {
        this._timeoutId = window.setTimeout(function timeoutFire () {
          self._finish();
        }, this.timeout);
      }

      // Use constant line-height so there won't be changes in height because Adobe Blank uses zero width but not zero height.
      this._testContainer = this._document.createElement('div');
      this._testContainer.style.cssText =
        'position:absolute; left:-10000px; top:-10000px; white-space:nowrap; font-size:20px; line-height:20px; visibility:hidden;';

      // Create testDiv template that will be cloned for each font
      this._testDiv = this._document.createElement('div');
      this._testDiv.style.position = 'absolute';
      this._testDiv.appendChild(this._document.createTextNode(
        FontLoader.referenceText));

      if (!FontLoader.useAdobeBlank) {
        // AdobeBlank is not used
        // We need to extract dimensions of reference font-families for each requested font variation.
        // The extracted dimensions are stored in a static property "referenceFontFamilyVariationSizes",
        // so we might already have some or all of them all.
        newFontVariations = this._getNewFontVariationsFromFonts(this._fontsArray);
        if (newFontVariations.length) {
          this._extractReferenceFontSizes(newFontVariations);
        }
        this._loadFonts();
      } else if (FontLoader.adobeBlankReferenceSize) {
        // AdobeBlank is used, and was loaded
        this._loadFonts();
      } else {
        // AdobeBlank is used but was not loaded
        this._loadAdobeBlankFont();
      }
    },
    _extractReferenceFontSizes: function (newFontVariations) {
      var clonedDiv, j, i, key, size, fontVariation;

      clonedDiv = this._testDiv.cloneNode(true);
      this._testContainer.appendChild(clonedDiv);
      this._document.body.appendChild(this._testContainer);

      for (i = 0; i < newFontVariations.length; i++) {
        fontVariation = newFontVariations[i];
        key = fontVariation.key;
        FontLoader.referenceFontFamilyVariationSizes[key] = [];
        for (j = 0; j < FontLoader.referenceFontFamilies.length; j++) {
          clonedDiv.style.fontFamily = FontLoader.referenceFontFamilies[
            j];
          clonedDiv.style.fontWeight = fontVariation.weight;
          clonedDiv.style.fontStyle = fontVariation.style;
          size = new Size(clonedDiv.offsetWidth, clonedDiv.offsetHeight);
          FontLoader.referenceFontFamilyVariationSizes[key].push(size);
        }
      }

      this._testContainer.parentNode.removeChild(this._testContainer);
      clonedDiv.parentNode.removeChild(clonedDiv);
    },
    _loadAdobeBlankFont: function () {
      var self = this,
        adobeBlankDiv, adobeBlankFallbackFont = 'serif';

      this._addAdobeBlankFontFaceIfNeeded();

      adobeBlankDiv = this._testDiv.cloneNode(true);
      this._testContainer.appendChild(adobeBlankDiv);
      this._document.body.appendChild(this._testContainer);

      // When using AdobeBlank (all browsers except IE < 11) only interval checking and size watcher methods
      // are available for watching element size.
      if (FontLoader.useIntervalChecking) {
        adobeBlankDiv.style.fontFamily = FontLoader.referenceFontFamilies[
          0] + ', ' + adobeBlankFallbackFont;
        this._testContainer.appendChild(adobeBlankDiv);
        // Start polling element sizes but also do first synchronous check in case all fonts where already loaded.
        this._intervalId = window.setInterval(function intervalFire () {
          self._checkAdobeBlankSize();
        }, this._intervalDelay);
        this._checkAdobeBlankSize();
      } else {
        adobeBlankDiv.style.fontFamily = adobeBlankFallbackFont;
        this._adobeBlankSizeWatcher = new SizeWatcher(/** @type HTMLElement */
          adobeBlankDiv, {
            container: this._testContainer,
            delegate: this,
            continuous: true,
            direction: SizeWatcher.directions.decrease,
            dimension: SizeWatcher.dimensions.horizontal,
            document: this._document
          });
        this._adobeBlankSizeWatcher.prepareForWatch();
        this._adobeBlankSizeWatcher.beginWatching();
        adobeBlankDiv.style.fontFamily = FontLoader.referenceFontFamilies[
          0] + ', ' + adobeBlankFallbackFont;
      }
    },
    _getNewFontVariationsFromFonts: function (fonts) {
      var font, key, i, variations = [],
        variationsMap = {};

      for (i = 0; i < fonts.length; i++) {
        font = fonts[i];
        key = this._fontVariationKeyForFont(font);
        if (!(key in variationsMap) && !(key in FontLoader.referenceFontFamilyVariationSizes)) {
          variationsMap[key] = true;
          variations.push({
            key: key,
            weight: font.weight,
            style: font.style
          });
        }
      }
      return variations;
    },
    _parseFonts: function (fonts) {
      var processedFonts = [];

      fonts.forEach(function (font) {
        if (typeof font === 'string') {
          if (font.indexOf(':') > -1) {
            processedFonts = processedFonts.concat(this._convertShorthandToFontObjects(
              font));
          } else {
            processedFonts.push({
              family: font,
              weight: 400,
              style: 'normal'
            });
          }
        } else if (this._isValidFontObject(font)) {
          processedFonts.push(font);
        } else {
          throw new Error('Invalid font format');
        }
      }, this);

      return processedFonts;
    },
    /**
     * @param {FontDescriptor} fontObject
     * @returns {boolean}
     * @private
     */
    _isValidFontObject: function (fontObject) {
      if (!fontObject.family || !fontObject.weight || !fontObject.style) {
        return false;
      }
      return [
        'normal',
        'italic',
        'bold',
        'oblique'
      ].indexOf(fontObject.style) !== -1;
    },
    /**
     * @param {string} fontString
     * @returns {Array.<FontDescriptor>}
     * @private
     */
    _convertShorthandToFontObjects: function (fontString) {
      var fonts = [],
        parts = fontString.split(':'),
        variants, fontFamily;

      fontFamily = parts[0];
      variants = parts[1].split(',');

      variants.forEach(function (variant) {
        var styleAlias, weightAlias, weight, style;

        if (variant.length !== 2) {
          throw new Error('Invalid Font Variation Description: \'' +
            variant + '\' for font string: \'' + fontString +
            '\'');
        }

        styleAlias = variant[0];
        weightAlias = variant[1];

        if (styleAlias in FontLoader.fontStyleAliasesMap) {
          style = FontLoader.fontStyleAliasesMap[styleAlias];
        } else {
          return;
        }

        weight = parseInt(weightAlias, 10);
        if (isNaN(weight)) {
          return;
        } else {
          weight *= 100;
        }

        fonts.push({
          family: fontFamily,
          weight: weight,
          style: style
        });
      });

      return fonts;
    },
    _addAdobeBlankFontFaceIfNeeded: function () {
      var adobeBlankFontFaceStyle;
      if (!this._document.getElementById(FontLoader.adobeBlankFontFaceStyleId)) {
        adobeBlankFontFaceStyle = this._document.createElement('style');
        adobeBlankFontFaceStyle.setAttribute('type', 'text/css');
        adobeBlankFontFaceStyle.setAttribute('id', FontLoader.adobeBlankFontFaceStyleId);
        adobeBlankFontFaceStyle.appendChild(this._document.createTextNode(
          FontLoader.adobeBlankFontFaceRule));
        this._document.getElementsByTagName('head')[0].appendChild(
          adobeBlankFontFaceStyle);
      }
    },
    _checkAdobeBlankSize: function () {
      var adobeBlankDiv = this._testContainer.firstChild;
      this._adobeBlankLoaded(adobeBlankDiv);
    },
    _adobeBlankLoaded: function (adobeBlankDiv) {
      // Prevent false size change, for example if AdobeBlank height is higher than fallback font.
      if (adobeBlankDiv.offsetWidth !== 0) {
        return;
      }

      FontLoader.adobeBlankReferenceSize = new Size(adobeBlankDiv.offsetWidth,
        adobeBlankDiv.offsetHeight);

      if (this._adobeBlankSizeWatcher !== null) {
        // SizeWatcher method
        this._adobeBlankSizeWatcher.endWatching();
        this._adobeBlankSizeWatcher.removeScrollWatchers();
        this._adobeBlankSizeWatcher = null;
      } else {
        // Polling method (IE)
        window.clearInterval(this._intervalId);
        adobeBlankDiv.parentNode.removeChild(adobeBlankDiv);
      }

      this._testContainer.parentNode.removeChild(this._testContainer);

      this._loadFonts();
    },
    _cloneNodeSetStyleAndAttributes: function (font, fontKey,
      referenceFontFamilyIndex) {
      var clonedDiv = this._testDiv.cloneNode(true);
      clonedDiv.style.fontWeight = font.weight;
      clonedDiv.style.fontStyle = font.style;
      clonedDiv.setAttribute('data-font-map-key', fontKey);
      clonedDiv.setAttribute('data-ref-font-family-index', String(
        referenceFontFamilyIndex));
      return clonedDiv;
    },
    _getFontMapKeyFromElement: function (element) {
      return element.getAttribute('data-font-map-key');
    },
    _getFontFromElement: function (element) {
      var fontKey = this._getFontMapKeyFromElement(element);
      return this._fontsMap[fontKey];
    },
    _getFontFamilyFromElement: function (element) {
      var font = this._getFontFromElement(element);
      return font.family;
    },
    _getReferenceFontFamilyIndexFromElement: function (element) {
      return element.getAttribute('data-ref-font-family-index');
    },
    _getReferenceFontFamilyFromElement: function (element) {
      var referenceFontFamilyIndex = this._getReferenceFontFamilyIndexFromElement(
        element);
      return FontLoader.referenceFontFamilies[referenceFontFamilyIndex];
    },
    _fontVariationKeyForFont: function (font) {
      return font.weight + font.style;
    },
    _fontsMapKeyForFont: function (font) {
      return font.family + font.weight + font.style;
    },
    _loadFonts: function () {
      var i, j, clonedDiv, sizeWatcher, font, fontKey, fontVariationKey,
        referenceFontSize, sizeWatcherDirection, sizeWatcherDimension,
        self = this;

      // Add div for each font-family
      for (i = 0; i < this._numberOfFonts; i++) {
        font = this._fontsArray[i];
        fontKey = this._fontsMapKeyForFont(font);
        this._fontsMap[fontKey] = font;

        for (j = 0; j < FontLoader.referenceFontFamilies.length; j++) {
          clonedDiv = this._cloneNodeSetStyleAndAttributes(font,
            fontKey, j);
          if (FontLoader.useResizeEvent) {
            clonedDiv.style.fontFamily = FontLoader.referenceFontFamilies[
              j];
            this._testContainer.appendChild(clonedDiv);
          } else if (FontLoader.useIntervalChecking) {
            clonedDiv.style.fontFamily = '\'' + font.family + '\', ' +
              FontLoader.referenceFontFamilies[j];
            this._testContainer.appendChild(clonedDiv);
          } else {
            clonedDiv.style.fontFamily = FontLoader.referenceFontFamilies[
              j];
            if (FontLoader.useAdobeBlank) {
              referenceFontSize = FontLoader.adobeBlankReferenceSize;
              sizeWatcherDirection = SizeWatcher.directions.increase;
              sizeWatcherDimension = SizeWatcher.dimensions.horizontal;
            } else {
              fontVariationKey = this._fontVariationKeyForFont(font);
              referenceFontSize = FontLoader.referenceFontFamilyVariationSizes[
                fontVariationKey][j];
              sizeWatcherDirection = SizeWatcher.directions.both;
              sizeWatcherDimension = SizeWatcher.dimensions.both;
            }
            sizeWatcher = new SizeWatcher(/** @type HTMLElement */
              clonedDiv, {
                container: this._testContainer,
                delegate: this,
                size: referenceFontSize,
                direction: sizeWatcherDirection,
                dimension: sizeWatcherDimension,
                document: this._document
              });
            // The prepareForWatch() and beginWatching() methods will be invoked in separate iterations to
            // reduce number of browser's CSS recalculations.
            this._sizeWatchers.push(sizeWatcher);
          }
        }
      }

      // Append the testContainer after all test elements to minimize DOM insertions
      this._document.body.appendChild(this._testContainer);

      if (FontLoader.useResizeEvent) {
        for (j = 0; j < this._testContainer.childNodes.length; j++) {
          clonedDiv = this._testContainer.childNodes[j];
          // "resize" event works only with attachEvent
          clonedDiv.attachEvent('onresize', (function (self, clonedDiv) {
            return function () {
              self._elementSizeChanged(clonedDiv);
            };
          }(this, clonedDiv)));
        }
        window.setTimeout(function () {
          for (j = 0; j < self._testContainer.childNodes.length; j++) {
            clonedDiv = self._testContainer.childNodes[j];
            clonedDiv.style.fontFamily = '\'' + self._getFontFamilyFromElement(
              clonedDiv) + '\', ' + self._getReferenceFontFamilyFromElement(
              clonedDiv);
          }
        }, 0);
      } else if (FontLoader.useIntervalChecking) {
        // Start polling element sizes but also do first synchronous check in case all fonts where already loaded.
        this._intervalId = window.setInterval(function intervalFire () {
          self._checkSizes();
        }, this._intervalDelay);
        this._checkSizes();
      } else {
        // We are dividing the prepareForWatch() and beginWatching() methods to optimize browser performance by
        // removing CSS recalculation from each iteration to the end of iterations.
        for (i = 0; i < this._sizeWatchers.length; i++) {
          sizeWatcher = this._sizeWatchers[i];
          sizeWatcher.prepareForWatch();
        }
        for (i = 0; i < this._sizeWatchers.length; i++) {
          sizeWatcher = this._sizeWatchers[i];
          sizeWatcher.beginWatching();
          // Apply tested font-family
          clonedDiv = sizeWatcher.getWatchedElement();
          clonedDiv.style.fontFamily = '\'' + this._getFontFamilyFromElement(
            clonedDiv) + '\', ' + self._getReferenceFontFamilyFromElement(
            clonedDiv);
        }
      }
    },
    _checkSizes: function () {
      var i, testDiv, font, fontVariationKey, currSize, refSize,
        refFontFamilyIndex;

      for (i = this._testContainer.childNodes.length - 1; i >= 0; i--) {
        testDiv = this._testContainer.childNodes[i];
        currSize = new Size(testDiv.offsetWidth, testDiv.offsetHeight);
        if (FontLoader.useAdobeBlank) {
          refSize = FontLoader.adobeBlankReferenceSize;
        } else {
          font = this._getFontFromElement(testDiv);
          fontVariationKey = this._fontVariationKeyForFont(font);
          refFontFamilyIndex = this._getReferenceFontFamilyIndexFromElement(
            testDiv);
          refSize = FontLoader.referenceFontFamilyVariationSizes[
            fontVariationKey][refFontFamilyIndex];
        }
        if (!refSize.isEqual(currSize)) {
          // Element dimensions changed, this means its font loaded, remove it from testContainer div
          testDiv.parentNode.removeChild(testDiv);
          this._elementSizeChanged(testDiv);
        }
      }
    },
    _elementSizeChanged: function (element) {
      var font, fontKey;

      if (this._finished) {
        return;
      }

      fontKey = this._getFontMapKeyFromElement(element);

      // Check that the font of this element wasn't already marked as loaded by an element with different reference font family.
      if (typeof this._fontsMap[fontKey] === 'undefined') {
        return;
      }

      font = this._fontsMap[fontKey];

      this._numberOfLoadedFonts++;
      delete this._fontsMap[fontKey];

      if (this.delegate && typeof this.delegate.fontLoaded ===
        'function') {
        this.delegate.fontLoaded(font);
      }

      if (this._numberOfLoadedFonts === this._numberOfFonts) {
        this._finish();
      }
    },
    _finish: function () {
      var error, i, sizeWatcher, fontKey, notLoadedFonts = [];

      if (this._finished) {
        return;
      }

      this._finished = true;

      if (this._adobeBlankSizeWatcher !== null) {
        if (this._adobeBlankSizeWatcher.getState() === SizeWatcher.states
          .watchingForSizeChange) {
          this._adobeBlankSizeWatcher.endWatching();
        }
        this._adobeBlankSizeWatcher = null;
      }

      for (i = 0; i < this._sizeWatchers.length; i++) {
        sizeWatcher = this._sizeWatchers[i];
        if (sizeWatcher.getState() === SizeWatcher.states.watchingForSizeChange) {
          sizeWatcher.endWatching();
        }
      }
      this._sizeWatchers = [];

      if (this._testContainer !== null) {
        this._testContainer.parentNode.removeChild(this._testContainer);
      }

      if (this._timeoutId !== null) {
        window.clearTimeout(this._timeoutId);
      }

      if (this._intervalId !== null) {
        window.clearInterval(this._intervalId);
      }

      if (this.delegate) {
        if (this._numberOfLoadedFonts < this._numberOfFonts) {
          for (fontKey in this._fontsMap) {
            if (this._fontsMap.hasOwnProperty(fontKey)) {
              notLoadedFonts.push(this._fontsMap[fontKey]);
            }
          }
          error = {
            message: 'Not all fonts were loaded (' + this._numberOfLoadedFonts +
              '/' + this._numberOfFonts + ')',
            notLoadedFonts: notLoadedFonts
          };
        } else {
          error = null;
        }
        if (typeof this.delegate.complete === 'function') {
          this.delegate.complete(error);
        } else if (typeof this.delegate.fontsLoaded === 'function') {
          this.delegate.fontsLoaded(error);
        }
      }
    },
    /**
     * SizeWatcher delegate method
     * @param {SizeWatcher} sizeWatcher
     */
    sizeWatcherChangedSize: function (sizeWatcher) {
      var watchedElement = sizeWatcher.getWatchedElement();
      if (sizeWatcher === this._adobeBlankSizeWatcher) {
        this._adobeBlankLoaded(watchedElement);
      } else {
        this._elementSizeChanged(watchedElement);
      }
    }
  };

  /**
   * Size object
   *
   * @param width
   * @param height
   * @constructor
   */
  function Size (width, height) {
    this.width = width;
    this.height = height;
  }

  Size.sizeFromString = function (sizeString) {
    var arr = sizeString.split(',');
    if (arr.length !== 2) {
      return null;
    }
    return new Size(arr[0], arr[1]);
  };

  /**
   * Compares receiver object to passed in size object.
   *
   * @param otherSize
   * @returns {boolean}
   */
  Size.prototype.isEqual = function (otherSize) {
    return this.width === otherSize.width && this.height === otherSize.height;
  };

  Size.prototype.toString = function () {
    return this.width + ',' + this.height;
  };

  /**
   * SizeWatcher observes size of an element and notifies when its size is changed. It doesn't use any timeouts
   * to check the element size, when change in size occurs a callback method immediately invoked.
   *
   * To watch for element's size changes the element, and other required elements are appended to a container element
   * you specify, and which must be added to the DOM tree before invoking prepareForWatch() method. Your container
   * element should be positioned outside of client's visible area. Therefore you shouldn't use SizeWatcher to watch
   * for size changes of elements used for UI.
   * Such container element could be a simple <div> that is a child of the <body> element:
   * <div style="position:absolute; left:-10000px; top:-10000px;"></div>
   *
   * You must invoke SizeWatcher's methods in a specific order to establish size change listeners:
   *
   * 1. Create SizeWatcher instance by invoke SizeWatcher constructor passing the element (size of which you want to
   *    observe), the container element, the delegate object and optional size parameter of type Size which should be
   *    the pre-calculated initial size of your element.
   * 4. Invoke prepareForWatch() method. This method will calculate element size if you didn't passed it to the constructor.
   * 5. Invoke beginWatching() method. This method will set event listeners and invoke your delegate's method once
   *    element size changes.
   *
   * Failing to invoke above methods in their predefined order will throw an exception.
   *
   * @param {HTMLElement}   element An element, size of which will be observed for changes.
   * @param {Object}        options
   * @param {HTMLElement}   options.container An element to which special observing elements will be added. Must be in DOM tree
   *                        when prepareForWatch() method is called.
   * @param {Object}        options.delegate A delegate object with a sizeWatcherChangedSize method which will be invoked, in
   *                        context of the delegate object, when change in size occurs. This method is invoked with single
   *                        parameter which is the current SizeWatcher instance.
   * @param {Size}          [options.size] The pre-calculated initial size of your element. When passed, the element is not
   *                        asked for offsetWidth and offsetHeight, which may be useful to reduce browser's CSS
   *                        recalculations. If you will not pass the size parameter then its size calculation will be
   *                        deferred to prepareForWatch() method.
   * @param {Boolean}       [options.continuous=false] A boolean flag indicating if the SizeWatcher will watch only for
   *                        the first size change (default) or will continuously watch for size changes.
   * @param {Number}        [options.direction=SizeWatcher.directions.both] The direction of size change that should be
   *                        watched: SizeWatcher.directions.increase, SizeWatcher.directions.decrease or
   *                        SizeWatcher.directions.both
   * @param {Number}        [options.dimension=SizeWatcher.dimensions.both] The dimension of size change that should be
   *                        watched: SizeWatcher.dimensions.horizontal, SizeWatcher.dimensions.vertical or
   *                        SizeWatcher.dimensions.both
   * @param {HTMLDocument}  [options.document] The DOM tree context to use, if none provided then it will be the document.
   * @constructor
   */
  function SizeWatcher (element, options) {
    this._element = element;
    this._delegate = options.delegate;
    this._size = null;
    this._continuous = !!options.continuous;
    this._direction = options.direction ? options.direction : SizeWatcher.directions
      .both;
    this._dimension = options.dimension ? options.dimension : SizeWatcher.dimensions
      .both;
    this._sizeIncreaseWatcherContentElm = null;
    this._sizeDecreaseWatcherElm = null;
    this._sizeIncreaseWatcherElm = null;
    this._state = SizeWatcher.states.initialized;
    this._scrollAmount = 2;
    this._document = options.document || document;

    this._generateScrollWatchers(options.size);
    this._appendScrollWatchersToElement(options.container);
  }

  SizeWatcher.states = {
    initialized: 0,
    generatedScrollWatchers: 1,
    appendedScrollWatchers: 2,
    preparedScrollWatchers: 3,
    watchingForSizeChange: 4
  };

  SizeWatcher.directions = {
    decrease: 1,
    increase: 2,
    both: 3
  };

  SizeWatcher.dimensions = {
    horizontal: 1,
    vertical: 2,
    both: 3
  };

  // noinspection JSUnusedLocalSymbols
  SizeWatcher.prototype = {
    constructor: SizeWatcher,
    getWatchedElement: function () {
      return this._element;
    },
    getState: function () {
      return this._state;
    },
    setSize: function (size) {
      this._size = size;
      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.increase) {
        this._sizeIncreaseWatcherContentElm.style.cssText = 'width: ' +
          (size.width + this._scrollAmount) + 'px; height: ' + (size.height +
            this._scrollAmount) + 'px;';
      }
      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.decrease) {
        this._sizeDecreaseWatcherElm.style.cssText =
          'position:absolute; left: 0px; top: 0px; overflow: hidden; width: ' +
          (size.width - this._scrollAmount) + 'px; height: ' + (size.height -
            this._scrollAmount) + 'px;';
      }
    },
    _generateScrollWatchers: function (size) {
      this._element.style.position = 'absolute';

      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.increase) {
        this._sizeIncreaseWatcherContentElm = this._document.createElement(
          'div');

        this._sizeIncreaseWatcherElm = this._document.createElement(
          'div');
        this._sizeIncreaseWatcherElm.style.cssText =
          'position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: hidden;';
        this._sizeIncreaseWatcherElm.appendChild(this._sizeIncreaseWatcherContentElm);

        this._element.appendChild(this._sizeIncreaseWatcherElm);
      }

      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.decrease) {
        this._sizeDecreaseWatcherElm = this._document.createElement(
          'div');
        this._sizeDecreaseWatcherElm.appendChild(this._element);
      }

      if (size) {
        this.setSize(size);
      }

      this._state = SizeWatcher.states.generatedScrollWatchers;
    },
    _appendScrollWatchersToElement: function (container) {
      if (this._state !== SizeWatcher.states.generatedScrollWatchers) {
        throw new Error(
          'SizeWatcher._appendScrollWatchersToElement() was invoked before SizeWatcher._generateScrollWatchers()'
        );
      }

      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.decrease) {
        container.appendChild(this._sizeDecreaseWatcherElm);
      } else {
        container.appendChild(this._element);
      }

      this._state = SizeWatcher.states.appendedScrollWatchers;
    },
    removeScrollWatchers: function () {
      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.decrease) {
        if (this._sizeDecreaseWatcherElm.parentNode) {
          this._sizeDecreaseWatcherElm.parentNode.removeChild(this._sizeDecreaseWatcherElm);
        }
      } else if (this._element.parentNode) {
        this._element.parentNode.removeChild(this._element);
      }
    },
    prepareForWatch: function () {
      var parentNode, sizeDecreaseWatcherElmScrolled = true,
        sizeIncreaseWatcherElmScrolled = true;

      if (this._state !== SizeWatcher.states.appendedScrollWatchers) {
        throw new Error(
          'SizeWatcher.prepareForWatch() invoked before SizeWatcher._appendScrollWatchersToElement()'
        );
      }

      if (this._size === null) {
        this.setSize(new Size(this._element.offsetWidth, this._element.offsetHeight));
      }

      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.decrease) {
        sizeDecreaseWatcherElmScrolled = this._scrollElementToBottomRight(
          this._sizeDecreaseWatcherElm);
      }
      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.increase) {
        sizeIncreaseWatcherElmScrolled = this._scrollElementToBottomRight(
          this._sizeIncreaseWatcherElm);
      }

      // Check if scroll positions updated.
      if (!sizeDecreaseWatcherElmScrolled || !sizeIncreaseWatcherElmScrolled) {
        // Traverse tree to the top node to see if element is in the DOM tree.
        parentNode = this._element.parentNode;
        while (parentNode !== this._document && parentNode !== null) {
          parentNode = parentNode.parentNode;
        }

        if (parentNode === null) {
          throw new Error(
            'Can\'t set scroll position of scroll watchers. SizeWatcher is not in the DOM tree.'
          );
        } else if (console && typeof console.warn === 'function') {
          console.warn(
            'SizeWatcher can\'t set scroll position of scroll watchers.'
          );
        }
      }

      this._state = SizeWatcher.states.preparedScrollWatchers;
    },
    _scrollElementToBottomRight: function (element) {
      var elementScrolled = true;
      // noinspection JSBitwiseOperatorUsage
      if (this._dimension & SizeWatcher.dimensions.vertical) {
        element.scrollTop = this._scrollAmount;
        elementScrolled = elementScrolled && element.scrollTop > 0;
      }
      // noinspection JSBitwiseOperatorUsage
      if (this._dimension & SizeWatcher.dimensions.horizontal) {
        element.scrollLeft = this._scrollAmount;
        elementScrolled = elementScrolled && element.scrollLeft > 0;
      }
      return elementScrolled;
    },
    beginWatching: function () {
      if (this._state !== SizeWatcher.states.preparedScrollWatchers) {
        throw new Error(
          'SizeWatcher.beginWatching() invoked before SizeWatcher.prepareForWatch()'
        );
      }

      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.decrease) {
        // noinspection JSValidateTypes
        this._sizeDecreaseWatcherElm.addEventListener('scroll', this,
          false);
      }
      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.increase) {
        // noinspection JSValidateTypes
        this._sizeIncreaseWatcherElm.addEventListener('scroll', this,
          false);
      }

      this._state = SizeWatcher.states.watchingForSizeChange;
    },
    endWatching: function () {
      if (this._state !== SizeWatcher.states.watchingForSizeChange) {
        throw new Error(
          'SizeWatcher.endWatching() invoked before SizeWatcher.beginWatching()'
        );
      }

      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.decrease) {
        // noinspection JSValidateTypes
        this._sizeDecreaseWatcherElm.removeEventListener('scroll', this,
          false);
      }
      // noinspection JSBitwiseOperatorUsage
      if (this._direction & SizeWatcher.directions.increase) {
        // noinspection JSValidateTypes
        this._sizeIncreaseWatcherElm.removeEventListener('scroll', this,
          false);
      }
      this._state = SizeWatcher.states.appendedScrollWatchers;
    },
    /**
     * @private
     */
    handleEvent: function () {
      var newSize, oldSize;

      // This is not suppose to happen because when we run endWatching() we remove scroll listeners.
      // But some browsers will fire second scroll event which was pushed into event stack before listener was
      // removed so do this check anyway.
      if (this._state !== SizeWatcher.states.watchingForSizeChange) {
        return;
      }

      newSize = new Size(this._element.offsetWidth, this._element.offsetHeight);
      oldSize = this._size;

      // Check if element size is changed. How come that element size isn't changed but scroll event fired?
      // This can happen in two cases: when double scroll occurs or immediately after calling prepareForWatch()
      // (event if scroll event listeners attached after it).
      // The double scroll event happens when one size dimension (e.g.:width) is increased and another
      // (e.g.:height) is decreased.
      if (oldSize.isEqual(newSize)) {
        return;
      }

      if (this._delegate && typeof this._delegate.sizeWatcherChangedSize ===
        'function') {
        this._delegate.sizeWatcherChangedSize(this);

        // Check that endWatching() wasn't invoked from within the delegate.
        if (this._state !== SizeWatcher.states.watchingForSizeChange) {
          return;
        }
      }

      if (!this._continuous) {
        this.endWatching();
      } else {
        // Set the new size so in case of double scroll event we won't cause the delegate method to be executed twice
        // and also to update to the new watched size.
        this.setSize(newSize);
        // change state so prepareFowWatch() won't throw exception about wrong order invocation.
        this._state = SizeWatcher.states.appendedScrollWatchers;
        // Run prepareForWatch to reset the scroll watchers, we have already set the size
        this.prepareForWatch();
        // Set state to listeningForSizeChange, there is no need to invoke beginWatching() method as scroll event
        // listeners and callback are already set.
        this._state = SizeWatcher.states.watchingForSizeChange;
      }
    }
  };

  return FontLoader;
}));
