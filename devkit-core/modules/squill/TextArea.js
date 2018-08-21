let exports = {};

import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';
import TextInput from './TextInput';

exports = class extends TextInput {

};
exports.prototype._tag = 'textarea';
var TextArea = exports;

Widget.register(TextArea, 'TextArea');

export default exports;
