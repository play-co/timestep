var dragDefaults = {
	radius: 10,
	unbound: false,
	cover: false
};
exports.makeDraggable = function (view, opts) {
	opts = merge(opts, dragDefaults);
	var dragOffset = {};
	view.on('InputStart', function (evt) {
		view.startDrag({
			inputStartEvt: evt,
			radius: opts.radius
		});
	});
	view.on('DragStart', function (dragEvt) {
		var scale = view.getPosition().scale;
		dragOffset.x = (dragEvt.srcPt.x / scale) - view.style.x;
		dragOffset.y = (dragEvt.srcPt.y / scale) - view.style.y;
	});
	view.on('Drag', function (startEvt, dragEvt, delta) {
		view.style.x = dragEvt.point[1].x - dragOffset.x;
		view.style.y = dragEvt.point[1].y - dragOffset.y;
		if (!opts.unbound) { // view is smaller than parent
			var parent = view.getSuperview();
			view.style.x = Math.max(0, Math.min(view.style.x, parent.style.width - view.style.width));
			view.style.y = Math.max(0, Math.min(view.style.y, parent.style.height - view.style.height));
		}
		if (opts.cover) { // view is larger than parent
			var parent = view.getSuperview();
			view.style.x = Math.min(0, Math.max(view.style.x, parent.style.width - view.style.width));
			view.style.y = Math.min(0, Math.max(view.style.y, parent.style.height - view.style.height));
		}
	});
	return view;
};