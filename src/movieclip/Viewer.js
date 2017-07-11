import device from 'device';
import DataSource from 'squill/models/DataSource';
import ListView from 'ui/ListView';
import CellView from 'ui/CellView';
import ScrollView from 'ui/ScrollView';
import TextView from 'ui/TextView';
import View from 'ui/View';
import MovieClip from './MovieClip';

var DESIGN_WIDTH = 1536;
var BUTTON_WIDTH = 400;
var BUTTON_HEIGHT = 30;
var PADDING = 20;

class ListCell extends CellView {

  constructor (opts) {
    super(opts);

    this.label = new TextView({
      superview: this,
      y: 1,
      padding: 10,
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT - 1,
      color: '#ffffff',
      size: 20,
      autoFontSize: false
    });
  }

  setData (data) {
    super.setData(data);
    this.label.style.backgroundColor = data.type === 'skin' ? '#999900' : '#003300';
    this.label.setText(data.name);
  }

}

export default class Viewer extends View {

  constructor (opts) {
    super(opts);

    this.scaleView = new View({
      superview: this,
      width: this.style.width,
      height: this.style.height
    });

    this.viewport = new View({
      superview: this.scaleView,
      backgroundColor: '#330000',
      x: BUTTON_WIDTH + PADDING,
      y: PADDING,
      width: DESIGN_WIDTH - BUTTON_WIDTH - PADDING * 2,
      height: this.style.height
    });

    this.cross = new View({ superview: this.viewport });

    this.crossVert = new View({
      superview: this.cross,
      x: -1,
      y: -20,
      width: 2,
      height: 40,
      backgroundColor: '#00ff00'
    });

    this.crossHorz = new View({
      superview: this.cross,
      x: -20,
      y: -1,
      width: 40,
      height: 2,
      backgroundColor: '#00ff00'
    });

    this.animBounds = new View({
      superview: this.viewport,
      backgroundColor: '#ffffff',
      opacity: 0.1
    });

    this.mc = new MovieClip({
      superview: this.viewport,
      x: this.viewport.style.width * 0.5,
      y: this.viewport.style.height * 0.5,
      url: opts && opts.url || ''
    });

    this.dataSource = new DataSource({ key: 'name' });

    this.dataSource.setSorter(function (obj) {
      return (obj.type === 'skin' ? 'a' : 'b') + obj.name;
    });

    this.buttonList = new ListView({
      superview: this.scaleView,
      width: BUTTON_WIDTH,
      height: 200,
      scrollX: false,
      dataSource: this.dataSource,
      selectable: 'single',
      getCell: () => {
        return new ListCell({
          superview: this.buttonList,
          width: BUTTON_WIDTH,
          height: BUTTON_HEIGHT
        });
      }
    });

    this.buttonList.model.subscribe('Select', this, this.onButtonClick);

    this.reflow();

    if (this.mc.loaded) {
      this.onMovieClipLoaded();
    } else {
      this.mc.once(MovieClip.LOADED, () => this.onMovieClipLoaded());
    }
  }

  onMovieClipLoaded() {
    this.animationIndex = -1;
    this.animationCount = this.mc.animationList.length;

    var data = [];

    var mcSkinData = this.mc.data.skins;
    var skinMap = {};
    var sortIndex = 0;
    for (var anim in mcSkinData) {
      for (var skinName in mcSkinData[anim]) {
        if (!skinMap[skinName]) {
          skinMap[skinName] = true;
          data.push({
            type: 'skin',
            name: skinName
          });
        }
      }
    }

    var animList = this.mc.animationList;

    for (var i = 0; i < animList.length; i++) {
      data.push({
        type: 'animation',
        name: animList[i]
      });
    }

    this.dataSource.add(data);

    this.mc.loop(this.mc.animationList[0]);
  }

  updateOpts (opts) {
    super.updateOpts(opts);
    if (opts && opts.url && this.mc) {
      this.mc.url = opts.url;
    }
  }

  onButtonClick (data) {
    var name = data.name;
    if (data.type === 'skin') {
      for (var i = 0; i < this.mc.animationList.length; i++) {
        this.mc.setSkinForChild(this.mc.animationList[i], name);
      }
    } else {
      this.mc.loop(name);
    }
    this.updateMCPosition();
  }

  reflow () {
    var s = this.scaleView.style;
    s.scale = this.style.width / DESIGN_WIDTH;
    var height = this.style.height / s.scale;
    s.height = this.buttonList.style.height = height;

    this.viewport.style.height = height - PADDING * 2;
    this.updateMCPosition();
    this.mc.style.x = this.cross.style.x = this.viewport.style.width * 0.5;
    this.mc.style.y = this.cross.style.y = this.viewport.style.height * 0.5;
    this.scaleView.style.width = this.style.width;
    this.scaleView.style.height = this.style.height;
  }

  updateMCPosition () {
    var bounds = this.mc.getBounds();
    this.animBounds.updateOpts({
      x: this.viewport.style.width * 0.5 + bounds.x,
      y: this.viewport.style.height * 0.5 + bounds.y,
      width: bounds.width,
      height: bounds.height
    });
  }

}
