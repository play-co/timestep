import device;
import ui.View as View;
import ui.resource.Image as Image;

exports = Class(View, function(supr) {

	var Canvas = device.get("Canvas");
	var sin = Math.sin;
	var cos = Math.cos;
	var max = Math.max;
	var min = Math.min;

	var MAX_TEX_WIDTH = 1024;
	var MAX_TEX_HEIGHT = 1024;

	// animation transtion functions borrowed from animate
	var TRANSITION_LINEAR = "linear";
	var transitions = {
		linear: function (n) { return n; },
		easeIn: function (n) { return n * n; },
		easeInOut: function (n) { return (n *= 2) < 1 ? 0.5 * n * n * n : 0.5 * ((n -= 2) * n * n + 2); },
		easeOut: function (n) { return n * (2 - n); }
	};

	// all particle objects obtained from this class are initialized with these properties
	var particleDefaults = {
		x: 0,
		y: 0,
		r: 0,
		anchorX: 0,
		anchorY: 0,
		width: 1,
		height: 1,
		scale: 1,
		dscale: 0,
		ddscale: 0,
		scaleX: 1,
		dscaleX: 0,
		ddscaleX: 0,
		scaleY: 1,
		dscaleY: 0,
		ddscaleY: 0,
		dx: 0,
		dy: 0,
		dr: 0,
		danchorX: 0,
		danchorY: 0,
		ddx: 0,
		ddy: 0,
		ddr: 0,
		ddanchorX: 0,
		ddanchorY: 0,
		flipX: false,
		flipY: false,
		dwidth: 0,
		dheight: 0,
		ddwidth: 0,
		ddheight: 0,
		opacity: 1,
		dopacity: 0,
		ddopacity: 0,
		visible: false,
		ttl: 1000,
		delay: 0,
		polar: false,
		ox: 0,
		oy: 0,
		theta: 0,
		radius: 0,
		dtheta: 0,
		dradius: 0,
		ddtheta: 0,
		ddradius: 0,
		elapsed: 0,
		transition: TRANSITION_LINEAR,
		onStart: null,
		onDeath: null,
		triggers: undefined, // NOT ok to use array here, assign later
		absX: 0,
		absY: 0,
		absW: 1,
		absH: 1,
		compositeOp: 'lighter'
	};

	// class-wide image cache
	var imageCache = {};

	this.init = function(opts) {
		// particles and their engine don't handle input events
		opts.canHandleEvents = false;
		opts.blockEvents = true;
		supr(this, 'init', [opts]);

		// particle data array passed to user
		this.particleDataArray = [];

		// particle data object arrays
		this.freeParticleObjects = [];
		this.activeParticleObjects = [];

		// forced centers used when max texture sizes exceeded
		this.forceCenterX = opts.forceCenterX;
		this.forceCenterY = opts.forceCenterY;

		// canvas for blending
		this.canvX = 0;
		this.canvY = 0;
		this.canvW = 1;
		this.canvH = 1;
		this.canvas = new Canvas({ width: MAX_TEX_WIDTH, height: MAX_TEX_HEIGHT });
		this.img = new Image({ srcImage: this.canvas });
	};

	this.obtainParticleArray = function(count) {
		for (var i = 0; i < count; i++) {
			var obj;
			if (this.freeParticleObjects.length) {
				obj = this.freeParticleObjects.pop();
			} else {
				// duplicate of default properties for optimal performance
				obj = {
					x: 0,
					y: 0,
					r: 0,
					anchorX: 0,
					anchorY: 0,
					width: 1,
					height: 1,
					scale: 1,
					dscale: 0,
					ddscale: 0,
					scaleX: 1,
					dscaleX: 0,
					ddscaleX: 0,
					scaleY: 1,
					dscaleY: 0,
					ddscaleY: 0,
					dx: 0,
					dy: 0,
					dr: 0,
					danchorX: 0,
					danchorY: 0,
					ddx: 0,
					ddy: 0,
					ddr: 0,
					ddanchorX: 0,
					ddanchorY: 0,
					flipX: false,
					flipY: false,
					dwidth: 0,
					dheight: 0,
					ddwidth: 0,
					ddheight: 0,
					opacity: 1,
					dopacity: 0,
					ddopacity: 0,
					visible: false,
					ttl: 1000,
					delay: 0,
					polar: false,
					ox: 0,
					oy: 0,
					theta: 0,
					radius: 0,
					dtheta: 0,
					dradius: 0,
					ddtheta: 0,
					ddradius: 0,
					elapsed: 0,
					transition: TRANSITION_LINEAR,
					onStart: null,
					onDeath: null,
					triggers: [], // OK to use an array here
					absX: 0,
					absY: 0,
					absW: 1,
					absH: 1,
					compositeOp: 'lighter'
				};
			}
			this.particleDataArray.push(obj);
		}
		return this.particleDataArray;
	};

	this.cleanObject = function(obj) {
		for (var prop in particleDefaults) {
			obj[prop] = particleDefaults[prop];
		}
		obj.triggers = []; // don't keep an array in the particleDefaults object
		return obj;
	};

	this.emitParticles = function(particleDataArray) {
		var data;
		var count = particleDataArray.length;
		var active = this.activeParticleObjects;

		for (var i = 0; i < count; i++) {
			data = particleDataArray.pop();

			var img = imageCache[data.image];
			if (!img) {
				img = imageCache[data.image] = new Image({ url: data.image });
				img._invScaleX = 1 / (img._map.marginLeft + img._map.width + img._map.marginRight);
				img._invScaleY = 1 / (img._map.marginTop + img._map.height + img._map.marginBottom);
			}

			if (data.polar) {
				data.x = data.ox + (data.radius * cos(data.theta));
				data.y = data.oy + (data.radius * sin(data.theta));
			}

			!data.delay && data.onStart && data.onStart(data);

			active.push(data);
		}
	};

	this._killParticle = function(index) {
		var data = this.activeParticleObjects.splice(index, 1)[0];
		data.onDeath && data.onDeath(data);
		this.freeParticleObjects.push(this.cleanObject(data));
	};

	this.killAllParticles = function() {
		while (this.activeParticleObjects.length) {
			this._killParticle(0);
		}

		this.canvX = 0;
		this.canvY = 0;
		this.canvW = 1;
		this.canvH = 1;
		this.canvas.getContext("2D").clear();
	};

	this.runTick = function(dt) {
		var data;
		var pct;
		var active = this.activeParticleObjects;
		var free = this.freeParticleObjects;
		var i = 0;
		var minX = Number.MAX_VALUE;
		var minY = Number.MAX_VALUE;
		var maxX = Number.MIN_VALUE;
		var maxY = Number.MIN_VALUE;
		var shouldUpdate = false;

		while (i < active.length) {
			shouldUpdate = true;
			data = active[i];

			// handle particle delays
			if (data.delay > 0) {
				data.delay -= dt;
				if (data.delay <= 0) {
					data.onStart && data.onStart(particle);
				} else {
					i++;
					continue;
				}
			}

			// is it dead yet?
			data.elapsed += dt;
			if (data.elapsed >= data.ttl) {
				this._killParticle(i);
				continue;
			}

			// calculate the percent of one second elapsed; deltas are in units / second
			if (data.transition !== TRANSITION_LINEAR) {
				var getTransitionProgress = transitions[data.transition];
				var prgBefore = getTransitionProgress((data.elapsed - dt) / data.ttl);
				var prgAfter = getTransitionProgress(data.elapsed / data.ttl);
				pct = (prgAfter - prgBefore) * data.ttl / 1000;
			} else {
				pct = dt / 1000;
			}

			// translation
			if (data.polar) {
				var drad = data.dradius, dth = data.dtheta, ddrad = data.ddradius, ddth = data.ddtheta;
				if (drad) { data.radius += pct * drad; }
				if (dth) { data.theta += pct * dth; }
				if (ddrad) { data.dradius += pct * ddrad; }
				if (ddth) { data.dtheta += pct * ddth; }

				// allow cartesian translation of the origin point
				var dx = data.dx, dy = data.dy, ddx = data.ddx, ddy = data.ddy;
				if (dx) { data.ox += pct * dx; }
				if (dy) { data.oy += pct * dy; }
				if (ddx) { data.dx += pct * ddx; }
				if (ddy) { data.dy += pct * ddy; }

				// polar position
				data.x = data.ox + data.radius * cos(data.theta);
				data.y = data.oy + data.radius * sin(data.theta);
			} else {
				// cartesian by default
				var dx = data.dx, dy = data.dy, ddx = data.ddx, ddy = data.ddy;
				if (dx) { data.x += pct * dx; }
				if (dy) { data.y += pct * dy; }
				if (ddx) { data.dx += pct * ddx; }
				if (ddy) { data.dy += pct * ddy; }
			}

			// anchor translation
			var dax = data.danchorX, day = data.danchorY, ddax = data.ddanchorX, dday = data.ddanchorY;
			if (dax) { data.anchorX += pct * dax; }
			if (day) { data.anchorY += pct * day; }
			if (ddax) { data.danchorX += pct * ddax; }
			if (dday) { data.danchorY += pct * dday; }

			// stretching
			var dw = data.dwidth, dh = data.dheight, ddw = data.ddwidth, ddh = data.ddheight;
			if (dw) { data.width = max(data.width + pct * dw, 1); }
			if (dh) { data.height = max(data.height + pct * dh, 1); }
			if (ddw) { data.dwidth += pct * ddw; }
			if (ddh) { data.dheight += pct * ddh; }

			// rotation
			var dr = data.dr, ddr = data.ddr;
			if (dr) { data.r += pct * dr; }
			if (ddr) { data.dr += pct * ddr; }

			// scaling
			var ds = data.dscale, dds = data.ddscale;
			if (ds) { data.scale = max(data.scale + pct * ds, 0); }
			if (dds) { data.dscale += pct * dds; }

			// scaleX and scaleY
			var dsx = data.dscaleX, ddsx = data.ddscaleX, dsy = data.dscaleY, ddsy = data.ddscaleY;
			if (dsx) { data.scaleX = max(data.scaleX + pct * dsx, 0); }
			if (ddsx) { data.dscaleX += pct * ddsx; }
			if (dsy) { data.scaleY = max(data.scaleY + pct * dsy, 0); }
			if (ddsy) { data.dscaleY += pct * ddsy; }

			// opacity
			var dop = data.dopacity, ddop = data.ddopacity;
			if (dop) { data.opacity = min(max(data.opacity + pct * dop, 0), 1); }
			if (ddop) { data.dopacity += pct * ddop; }

			// triggers
			var index = 0;
			while (index < data.triggers.length) {
				var trig = data.triggers[index];

				if (trig.smaller && data[trig.property] < trig.value) {
					trig.action(data);
					if (trig.count) {
						trig.count -= 1;
						if (trig.count <= 0) {
							data.triggers.splice(index, 1);
							index -= 1;
						}
					}
				} else if (!trig.smaller && data[trig.property] > trig.value) {
					trig.action(data);
					if (trig.count) {
						trig.count -= 1;
						if (trig.count <= 0) {
							data.triggers.splice(index, 1);
							index -= 1;
						}
					}
				}
				index += 1;
			}

			// establish absolute bounds
			var absX = data.absX = data.x + data.anchorX * (1 - data.scale * data.scaleX);
			var absY = data.absY = data.y + data.anchorY * (1 - data.scale * data.scaleY);
			var absW = data.absW = data.width * data.scale * data.scaleX;
			var absH = data.absH = data.height * data.scale * data.scaleY;
			if (absX < minX) { minX = absX; }
			if (absY < minY) { minY = absY; }
			if (absX + absW > maxX) { maxX = absX + absW; }
			if (absY + absH > maxY) { maxY = absY + absH; }
			i += 1;
		}

		// establish canvas size and position, bounded by max texture size
		if (shouldUpdate) {
			var canvX = minX;
			var canvY = minY;
			var canvW = maxX - minX;
			var canvH = maxY - minY;
			if (canvW > MAX_TEX_WIDTH) {
				var cx = this.forceCenterX !== undefined ? this.forceCenterX : canvX + canvW / 2;
				canvX = cx - MAX_TEX_WIDTH / 2;
				canvW = MAX_TEX_WIDTH;
			}
			if (canvH > MAX_TEX_HEIGHT) {
				var cy = this.forceCenterY !== undefined ? this.forceCenterY : canvY + canvH / 2;
				canvY = cy - MAX_TEX_HEIGHT / 2;
				canvH = MAX_TEX_HEIGHT;
			}
			this.img.setSourceWidth(canvW);
			this.img.setSourceHeight(canvH);

			// render our particle images to the canvas's context
			var ctx = this.canvas.getContext("2D");
			ctx.clear();

			var _ctx = ctx._ctx || ctx;
			for (var i = 0, len = active.length; i < len; i++) {
				var data = active[i];
				_ctx.save();

				// context rotation
				if (data.r !== 0) {
					ctx.translate(data.x + data.anchorX - canvX, data.y + data.anchorY - canvY);
					ctx.rotate(data.r);
					ctx.translate(-data.x - data.anchorX + canvX, -data.y - data.anchorY + canvY);
				}

				// context opacity
				if (data.opacity !== 1) {
					ctx.globalAlpha *= data.opacity;
				}

				ctx.globalCompositeOperation = data.compositeOp;

				var img = imageCache[data.image];
				var destX = data.absX - canvX;
				var destY = data.absY - canvY;
				var destW = data.absW;
				var destH = data.absH;

				var scaleX = destW * img._invScaleX;
				var scaleY = destH * img._invScaleY;

				ctx.drawImage(img._srcImg,
					img._map.x, img._map.y, img._map.width, img._map.height,
					destX + scaleX * img._map.marginLeft,
					destY + scaleY * img._map.marginTop,
					scaleX * img._map.width,
					scaleY * img._map.height);

				_ctx.restore();
			}

			// update our current canvas rendering size and position
			this.canvX = canvX;
			this.canvY = canvY;
			this.canvW = canvW;
			this.canvH = canvH;
		}
	};

	this.render = function(ctx) {
		this.img.render(ctx, this.canvX, this.canvY, this.canvW, this.canvH);
	};
});
