Unit testing is done using the [Mocha](http://visionmedia.github.com/mocha/)
test runner and the Node.js [assertion library](http://nodejs.org/api/assert.html).

The tests are setup using the Mocha 'BDD' interface, using
`describe`, `it`, `before`, `after`, `beforeEach`, and `afterEach`.

Command-line options for Mocha are in the `mocha.opts` file,
this loads `mocha-setup.js`, which configures a Node.js
environment for loading *timestep* classes by shimming out a
minimal browser environment and loading *jsio*.

The browser shims use [jsdom](https://github.com/tmpvar/jsdom), to install:

~~~
$ npm install jsdom
~~~

And for a system-wide install of Mocha, run the following:

~~~
$ npm install -g mocha
~~~

Navigate to the `basil/lib/timestep` directory and run the tests:

~~~
$ mocha
~~~
