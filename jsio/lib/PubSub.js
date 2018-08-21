/**
 * Summary: inherit from lib.PubSub if a class wants publish/subscribe ability
 * Methods:
 *  - publish(signal, args...) - all subscribers to signal will be called
 *     with the list of arguments provided.
 *  - subscribe(signal, ctx, method, args...) - register a bound method
 *     to a signal.  Any args that are passed in will be the first args
 *     when the method is invoked during a publish.
 */
import {
  bind,
  GLOBAL,
  logger
} from 'base';

import _uuid from '../std/uuid';
let uuid = _uuid.uuid;

var SLICE = Array.prototype.slice;

export default class PubSub {

  constructor () {
    this._subscribers = {};
    this._listeningTo = {};
  }

  publish (signal) {
    var subs = this._subscribers[signal];
    if (!subs) {
      return this;
    }

    var args;
    if (arguments.length > 1) {
      args = SLICE.call(arguments, 1);
    }

    for (var i = 0; i < subs.length; ++i) {
      subs[i].apply(GLOBAL, args);
    }

    return this;
  }

  subscribe (signal, ctx, method) {
    var cb;
    if (arguments.length == 2) {
      cb = ctx;
    } else {
      cb = bind.apply(GLOBAL, SLICE.call(arguments, 1));
      cb._ctx = ctx;
      // references for unsubscription
      cb._method = method;
    }

    var subs = this._subscribers[signal];
    if (subs) {
      subs = subs.concat([cb]);
    } else {
      subs = [cb];
    }
    this._subscribers[signal] = subs;
    return this;
  }

  subscribeOnce (signal, ctx, method) {
    var args = arguments,
      cb = bind(this, function () {
        this.unsubscribe(signal, cb);
        if (args.length == 2) {
          ctx.apply(GLOBAL, arguments);
        } else {
          bind.apply(GLOBAL, SLICE.call(args, 1)).apply(GLOBAL, arguments);
        }
      });

    if (args.length >= 3) {
      cb._ctx = ctx;
      cb._method = method;
    }

    return this.subscribe(signal, cb);
  }

  unsubscribe (signal, ctx, method) {
    var subs = this._subscribers[signal];
    if (!subs) {
      return this;
    }

    var newSubs = [];
    for (var i = 0; i < subs.length; i++) {
      var cb = subs[i];
      if (cb !== ctx && (cb._ctx !== ctx || (method && cb._method !== method))) {
        newSubs.push(subs[i]);
      }
    }

    this._subscribers[signal] = newSubs;
    return this;
  }

  listeners (type) {
    return this.hasOwnProperty.call(this._subscribers, type) ? this._subscribers[
      type] : this._subscribers[type] = [];
  }

  on (type, f) {
    if (this.listeners(type).length + 1 > this._maxListeners && this._maxListeners !== 0) {
      if (typeof console !== 'undefined') {
        console.warn('Possible EventEmitter memory leak detected. '
          + this._subscribers[type].length
          + ' listeners added. Use emitter.setMaxListeners() to increase limit.'
        );
      }
    }
    this.emit('newListener', type, f);
    return this.subscribe(type, this, f);
  }

  once (type, f) {
    return this.subscribeOnce(type, this, f);
  }

  removeListener (type, f) {
    this.unsubscribe(type, this, f);
    return this;
  }

  removeAllListeners (type) {
    for (var k in this._subscribers) {
      if (type == null || type == k) {
        delete this._subscribers[k];
      }
    }
    return this;
  }

  emit (type) {
    this.publish.apply(this, arguments);
    return this.listeners(type).length > 0;
  }

  setMaxListeners (_maxListeners) {
    this._maxListeners = _maxListeners;
  }

  hasListeners (type) {
    return this._subscribers[type] && this._subscribers[type].length;
  }

  listenTo (obj, name, callback) {
    var id = obj._listenId || (obj._listenId = uuid(8, 16));
    this._listeningTo[id] = obj;
    obj.subscribe(name, this, callback);
    return this;
  }

  stopListening (obj, name, callback) {
    var events, names, retain, i, j, ev;
    var listeningTo = this._listeningTo;

    logger.log(obj);
    var remove = !name && !callback;
    if (obj) {
      (listeningTo = {})[obj._listenId] = obj;
    }

    for (var id in listeningTo) {
      obj = listeningTo[id];

      names = name ? [name] : Object.keys(obj._subscribers);
      for (i = 0; i < names.length; i++) {
        name = names[i];
        if (events = obj._subscribers[name]) {
          obj._subscribers[name] = retain = [];
          for (j = 0; j < events.length; j++) {
            ev = events[j];
            if (callback && callback !== ev._method || this && this !== ev._ctx) {
              retain.push(ev);
            }
          }
          if (!retain.length)
            { delete obj._subscribers[name]; }
        }
      }
      if (remove) {
        delete this._listeningTo[id];
      }
    }
    return this;
  }
};

PubSub.prototype.addListener = PubSub.prototype.on;
PubSub.prototype._maxListeners = 10;

