let exports = {};

import TextInput from './TextInput';
import Widget from './Widget';
exports = class extends TextInput {

};
exports.prototype._type = 'password';
var PasswordInput = exports;


Widget.register(PasswordInput, 'PasswordInput');






export default exports;







