import ui.View as View;

exports = Class(View, function(supr) {
	this.init = function (opts) {
		this._dragRadius = opts.dragRadius || 10;
		this._dragOffset = {};
		supr(this, 'init', [opts]);
	};

	this.onInputStart = function (evt) {
		this.startDrag({
			inputStartEvt: evt,
			radius: this._dragRadius
		});
	};

	this.onDragStart = function (dragEvt) {
		this._dragOffset.x = dragEvt.srcPt.x - this.style.x;
		this._dragOffset.y = dragEvt.srcPt.y - this.style.y;
	};

	this.onDrag = this.onDragStop = function (startEvt, dragEvt, delta) {
		this.style.x = dragEvt.srcPt.x - this._dragOffset.x;
		this.style.y = dragEvt.srcPt.y - this._dragOffset.y;
	};
});