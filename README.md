# Timestep

A JavaScript game engine for the Game Closure SDK, built on
Canvas and DOM rendering backends. Runtime implementations
are optimized at a low level to develop high-performance games.

## Tests

Uses Node.js for testing. Install the
[Mocha](http://visionmedia.github.com/mocha/) test framework
and the jsdom module:

~~~
$ npm install -g mocha
$ npm install jsdom
~~~

With these prerequisites installed, at the top of the
timestep directory run:

~~~
$ mocha
~~~

Environment setup for Mocha and Timestep component tests are
in the `test` directory.
