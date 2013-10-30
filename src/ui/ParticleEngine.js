/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

/**
 * @class ui.ParticleEngine;
 */

import ui.View as View;
import ui.resource.Image as Image;
import ui.ImageView as ImageView;

/**
 * @extends ui.View
 */
exports = Class(View, function (supr) {

	// animation transtion functions borrowed from animate
	var TRANSITION_LINEAR = "linear",
		transitions = {
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
		onTick: null,
		external: false,
		triggers: null // NOT ok to use array here, assign later
	};

	// class-wide image cache
	var imageCache = {};



	/**
	 * initCount (integer) pre-initialize this many ImageViews for smooth particle emission
	 * initImage (string) a URL to give the ImageViews an image to start with
	 */
	this.init = function (opts) {
		// particles and their engine don't handle input events
		opts.canHandleEvents = false;
		opts.blockEvents = true;
		supr(this, 'init', [opts]);

		// particle data array passed to user
		this.particleDataArray = [];

		// particle view array passed to user for external view animation only
		this.externalViewArray = [];

		// recycled particle data objects
		this.freeParticleObjects = [];

		// particle ImageViews
		this.activeParticles = [];
		this.freeParticles = [];

		// pre-initialization
		var initCount = opts.initCount;
		var initImage = opts.initImage;
		if (initCount) {
			for (var i = 0; i < initCount; i++) {
				// initialize particle ImageViews
				var particle = new ImageView({
					parent: this,
					x: 0,
					y: 0,
					width: 1,
					height: 1,
					image: initImage,
					visible: false,
					canHandleEvents: false,
					inLayout: false
				});
				particle.needsReflow = function () {};
				this.freeParticles.push(particle);

				// initialize particle objects with default properties
				// duplicate of default properties for optimal performance
				this.freeParticleObjects.push({
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
					onTick: null,
					external: false,
					triggers: [] // OK to use an array here
				});
			}
		}
	};



	/**
	 * returns an array populated with n particle objects
	 * modify each particle object, then pass the array in via this.emitParticles
	 */
	this.obtainParticleArray = function (n) {
		for (var i = 0; i < n; i++) {
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
					onTick: null,
					external: false,
					triggers: [] // OK to use an array here
				};
			}

			this.particleDataArray.push(obj);
		}

		return this.particleDataArray;
	};



	/**
	 * takes a particle object, populates it with defaults, then returns it
	 */
	this.cleanObject = function (obj) {
		for (var prop in particleDefaults) {
			obj[prop] = particleDefaults[prop];
		}
		obj.triggers = []; // don't keep an array in the particleDefaults object
		return obj;
	};



	/**
	 * treat an external view as if it were a particle (don't recycle it internally)
	 */
	this._addExternalParticle = function (particle, data) {
		data.external = true;
		for (var index in data.triggers) {
			var trig = data.triggers[index];
			trig.isStyle = trig.property.charAt(0) !== 'd';
		}

		// automatically interrupt any animation currently in progress
		var active = this.activeParticles,
			index = active.indexOf(particle);
		while (index >= 0) {
			this._killParticle(particle, particle.pData, index);
			index = active.indexOf(particle);
		}

		particle.pData = data;
		active.push(particle);
	};



	/**
	 * takes an array of external views (don't recycle it internally)
	 * and an array of particle objects obtained from the engine
	 * and animates the views accordingly
	 */
	this.addExternalParticles = function (views, data) {
		var view, obj,
			count = data.length;

		for (var i = 0; i < count; i++) {
			view = views.pop();
			obj = data.pop();

			if (view && obj) {
				this._addExternalParticle(view, obj);
			}
		}
	};

	this.obtainExternalViewArray = function() {
		return this.externalViewArray;
	};

	/**
	 * after obtaining the particle array full of particle objects
	 * pass the array in here once you set up each objects' properties
	 */
	this.emitParticles = function (particleDataArray) {
		var s, particle, data,
			sin = Math.sin,
			cos = Math.cos,
			count = particleDataArray.length,
			active = this.activeParticles,
			free = this.freeParticles;

		for (var i = 0; i < count; i++) {
			data = particleDataArray.pop();

			for (var index in data.triggers) {
				var trig = data.triggers[index];
				trig.isStyle = trig.property.charAt(0) !== 'd';
			}

			// use free particles if we have any
			if (free.length) {
				particle = free.pop();
				s = particle.style;

				var img = imageCache[data.image];
				if (!img) {
					img = imageCache[data.image] = new Image({ url: data.image });
				}
				particle.setImage(img);

				if (data.polar) {
					s.x = data.ox + (data.radius * cos(data.theta));
					s.y = data.oy + (data.radius * sin(data.theta));
				} else {
					s.x = data.x;
					s.y = data.y;
				}

				s.r = data.r;
				s.anchorX = data.anchorX;
				s.anchorY = data.anchorY;
				s.width = data.width;
				s.height = data.height;
				s.scale = data.scale;
				s.opacity = data.opacity;
				s.visible = data.visible;
			} else {
				// no free particles, we must create a new particle
				particle = new ImageView({
					parent: this,
					x: data.polar ? data.ox + (data.radius * cos(data.theta)) : data.x,
					y: data.polar ? data.oy + (data.radius * sin(data.theta)) : data.y,
					r: data.r,
					anchorX: data.anchorX,
					anchorY: data.anchorY,
					width: data.width,
					height: data.height,
					scale: data.scale,
					opacity: data.opacity,
					image: data.image,
					visible: data.visible,
					blockEvents: true,
					canHandleEvents: false,
					inLayout: false
				});
				particle.needsReflow = function () {};
			}

			if (!data.delay) {
				particle.style.visible = true;
				data.onStart && data.onStart(particle);
			}

			particle.pData = data;
			active.push(particle);
		}
	};



	/**
	 * internal use only
	 * clean-up a particle
	 *
	 * particle (ImageView)
	 * data (object)
	 * index (integer) position in this.activeParticles
	 */
	this._killParticle = function (particle, data, index) {
		var active = this.activeParticles,
			s = particle.style,
			spliced = active.splice(index, 1);

		particle.pData = null;
		data && data.onDeath && data.onDeath(particle, data);

		// external particles must handle their own clean-up, but we still handle the data object
		if (data && data.external) {
			this.freeParticleObjects.push(this.cleanObject(data));
		} else {
			s.visible = false;
			this.freeParticles.push(spliced[0]);
			data && this.freeParticleObjects.push(this.cleanObject(data));
		}
	};



	/**
	 * finish and hide all particles immediately
	 */
	this.killAllParticles = function () {
		var active = this.activeParticles;
		while (active.length) {
			var particle = active[0];
			this._killParticle(particle, particle.pData, 0);
		}
	};



	/**
	 * step the particle engine forward in time by dt milliseconds
	 * this should be called manually from your own tick function
	 */
	this.runTick = function (dt) {
		var s, particle, data, pct,
			active = this.activeParticles,
			free = this.freeParticles,
			sin = Math.sin,
			cos = Math.cos,
			max = Math.max,
			min = Math.min,
			i = 0;

		while (i < active.length) {
			particle = active[i];
			data = particle.pData;
			s = particle.style;

			// handle particle delays
			if (data.delay > 0) {
				data.delay -= dt;
				if (data.delay <= 0) {
					s.visible = true;
					data.onStart && data.onStart(particle);
				} else {
					i++;
					continue;
				}
			}

			// is it dead yet?
			data.elapsed += dt;
			if (data.elapsed >= data.ttl) {
				this._killParticle(particle, data, i);
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

			data.onTick && data.onTick(particle, pct, dt);

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
				data.x = s.x = data.ox + data.radius * cos(data.theta);
				data.y = s.y = data.oy + data.radius * sin(data.theta);
			} else {
				// cartesian by default
				var dx = data.dx, dy = data.dy, ddx = data.ddx, ddy = data.ddy;
				if (dx) { data.x = s.x += pct * dx; }
				if (dy) { data.y = s.y += pct * dy; }
				if (ddx) { data.dx += pct * ddx; }
				if (ddy) { data.dy += pct * ddy; }
			}

			// anchor translation
			var dax = data.danchorX, day = data.danchorY, ddax = data.ddanchorX, dday = data.ddanchorY;
			if (dax) { data.anchorX = s.anchorX += pct * dax; }
			if (day) { data.anchorY = s.anchorY += pct * day; }
			if (ddax) { data.danchorX += pct * ddax; }
			if (dday) { data.danchorY += pct * dday; }

			// stretching
			var dw = data.dwidth, dh = data.dheight, ddw = data.ddwidth, ddh = data.ddheight;
			if (dw) { data.width = s.width = max(s.width + pct * dw, 1); }
			if (dh) { data.height = s.height = max(s.height + pct * dh, 1); }
			if (ddw) { data.dwidth += pct * ddw; }
			if (ddh) { data.dheight += pct * ddh; }

			// rotation
			var dr = data.dr, ddr = data.ddr;
			if (dr) { data.r = s.r += pct * dr; }
			if (ddr) { data.dr += pct * ddr; }

			// scaling
			var ds = data.dscale, dds = data.ddscale;
			if (ds) { data.scale = s.scale = max(s.scale + pct * ds, 0); }
			if (dds) { data.dscale += pct * dds; }

			// opacity
			var dop = data.dopacity, ddop = data.ddopacity;
			if (dop) { data.opacity = s.opacity = min(max(s.opacity + pct * dop, 0), 1); }
			if (ddop) { data.dopacity += pct * ddop; }

			// triggers
			var index = 0;
			while (index < data.triggers.length) {
				var trig = data.triggers[index],
					// where can the property be found, style or data?
					where = trig.isStyle ? s : data;

				if (trig.smaller && where[trig.property] < trig.value) {
					trig.action(particle);
					if (trig.count) {
						trig.count -= 1;
						if (trig.count <= 0) {
							data.triggers.splice(index, 1);
							index -= 1;
						}
					}
				} else if (!trig.smaller && where[trig.property] > trig.value) {
					trig.action(particle);
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

			i += 1;
		}
	};
});