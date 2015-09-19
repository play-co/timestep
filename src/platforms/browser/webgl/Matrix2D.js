var Matrix2D = Class(function() {

    var sin = Math.sin;
    var cos = Math.cos;

    this.init = function() {
        this.identity();
    };

    this.identity = function() {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.tx = 0;
        this.ty = 0;
    };

    this.clone = function() {
        var result = new Matrix2D();
        result.copy(this);
        return result;
    };

    this.copy = function(matrix) {
        this.a = matrix.a;
        this.b = matrix.b;
        this.c = matrix.c;
        this.d = matrix.d;
        this.tx = matrix.tx;
        this.ty = matrix.ty;
    };

    this.scale = function(x, y) {
        this.a *= x;
        this.b *= x;
        this.c *= y;
        this.d *= y;
    };

    this.rotate = function (angle) {
        var a = this.a;
        var b = this.b;
        var c = this.c;
        var d = this.d;
        var sinA = sin(angle);
        var cosA = cos(angle);
        this.a = a * cosA + c * sinA;
        this.b = b * cosA + d * sinA;
        this.c = a * -sinA + c * cosA;
        this.d = b * -sinA + d * cosA;
    };

    this.translate = function(x, y) {
        this.tx += this.a * x + this.c * y;
        this.ty += this.b * x + this.d * y;
    };

    this.transform = function(matrix) {
        var a = this.a;
        var b = this.b;
        var c = this.c;
        var d = this.d;
        this.a = a * matrix.a + c * matrix.b;
        this.b = b * matrix.a + c * matrix.b;
        this.c = a * matrix.c + c * matrix.c;
        this.d = b * matrix.c + d * matrix.c;
        this.tx += a * matrix.tx + c * matrix.ty;
        this.ty += b * matrix.tx + d * matrix.ty;
    };

    this.setTo = function(a, b, c, d, tx, ty) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.tx = tx;
        this.ty = ty;
    };

});

exports = Matrix2D;
