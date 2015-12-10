# Timestep

A JavaScript game engine for the Game Closure SDK, built on
Canvas and DOM rendering backends. Runtime implementations
are optimized at a low level to develop high-performance games.

## Contributing

Code should follow the style rules set by the `.eslintrc`.  To
get started linting, run the following:

```
npm install -g eslint
npm install -g eslint-plugin-jsio
```

Then you can run `eslint [directory]` or `eslint [filename]`.

We recommend using Sublime Text with the SublimeLinter and 
SublimeLinter-contrib-eslint packages.

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
