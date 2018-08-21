let exports = {};

exports.classes = {
  alpha: require('./Alpha'),
  label: require('./Label'),
  list: require('./List'),
  button: require('./TextButton'),
  text: require('./TextInput'),
  textarea: require('./TextArea'),
  password: require('./TextInput'),
  scroller: require('./Scroller'),
  canvas: require('./Canvas'),
  checkbox: require('./CheckBox'),
  menu: require('./Menu'),
  slider: require('./Slider'),
  color: require('./Color'),
  vcenter: require('./VerticalCenter'),
  treelist: require('./TreeList'),
  graph: require('./Graph'),
  select: require('./SelectBox'),
  widget: require('./Widget'),
  image: require('./Image')
};


exports.resolve = function (env, opts) {
  var imports = [];

  if (env == 'browser') {
    for (var key in exports.classes) {
      imports.push(exports.classes[key]);
    }
  }








  return imports;
};

export default exports;
