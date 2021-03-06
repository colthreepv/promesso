'use strict';
const util = require('util');
const assert = require('chai').assert;
const sinon = require('sinon');
const sAssert = sinon.assert;
const Promise = require('bluebird');
const XError = require('x-error');

const promesso = require('../');

function DummyResponse () {
  ['send', 'status', 'sendStatus'].forEach((method) => {
    this[method] = sinon.stub();
    this[method].returnsThis();
  });
}

function newRequest (options) {
  return Object.assign({}, {
    body: {},
    params: {},
    query: {},
    ip: '127.0.0.1'
  }, options);
}

describe('Starting from a Promise middleware', () => {
  function middleware (req) {
    return Promise.resolve('Hello world');
  }

  const promised = promesso(middleware);

  it('should return a classic middleware', () => {
    assert.isArray(promised);
    promised.forEach(assert.isFunction);
  });

  it('should call res methods when the Promise completed', () => {
    const req = newRequest();

    const res = new DummyResponse();
    const promisedMiddleware = promised[0];

    return promisedMiddleware(req, res).then(() => {
      sAssert.called(res.status);
      sAssert.called(res.send);
    });
  });

});

describe('Has basic functionality of', () => {

  describe('middleware can return a Promise', () => {
    function middleware (req) {
      return Promise.all([
        Promise.resolve('hello'),
        Promise.resolve('world!')
      ]);
    }

    const promised = promesso(middleware);

    it('will be resolved if it\'s not a function', () => {
      const req = newRequest();

      const res = new DummyResponse();
      const promisedMiddleware = promised[0];

      return promisedMiddleware(req, res).then(() => {
        const responseMatch = sinon.match(['hello', 'world!']);
        sAssert.called(res.status);
        sAssert.called(res.send);
        sAssert.calledWith(res.send, responseMatch);
      });
    });
  });

  describe('middleware can return a function', () => {
    function middleware (req) {
      return resFn;
      function resFn (res) {
        res.status(200);
        res.send({ message: 'ok' });
      }
    }

    const promised = promesso(middleware);

    it('will be used as a custom \'res\' responder', () => {
      const req = newRequest();

      const res = new DummyResponse();
      const promisedMiddleware = promised[0];

      return promisedMiddleware(req, res).then(() => {
        const responseMatch = sinon.match({ message: 'ok' });
        sAssert.called(res.status);
        sAssert.called(res.send);
        sAssert.calledWith(res.send, responseMatch);
      });
    });
  });
});

describe('Error handling during middleware execution', () => {

  describe('should handle XErrors', () => {
    function throwXError (req) {
      throw XError(9999).hc(404).hr('file not found');
    }

    let loggerData = '';
    function loggerFn () {
      const args = Array.prototype.slice.call(arguments);
      loggerData += args.map(arg => typeof arg === 'object' ? util.inspect(arg) : arg).join('\n');
    }

    let promised, loggerSpy;

    before(() => {
      loggerSpy = sinon.spy(loggerFn);
      promesso.logger(loggerSpy);

      promised = promesso(throwXError);
    });

    it('giving an HTTP response', () => {
      const promisedMiddleware = promised[0];

      const req = newRequest();
      const res = new DummyResponse();


      return promisedMiddleware(req, res).then(() => {
        const responseMatch = sinon.match({ code: 9999, message: 'file not found' });
        const stringMatch = sinon.match('file not found');

        sAssert.called(res.status);
        sAssert.called(res.send);
        sAssert.calledWith(res.status, 404);

        sAssert.calledWith(res.send, responseMatch);
        sAssert.neverCalledWith(res.send, stringMatch);
      });
    });

    it('correctly call the logger function', () => {
      sAssert.called(loggerSpy);
      assert.include(loggerData, '9999');
      assert.include(loggerData, '404');
      assert.include(loggerData, 'file not found');
    });

  });

  describe('should handle coding errors', () => {
    function throwCodingErr (req) {
      eval('randomfunction()');
    }

    let loggerData = '';
    function loggerFn () {
      const args = Array.prototype.slice.call(arguments);
      loggerData += args.map(arg => typeof arg === 'object' ? util.inspect(arg) : arg).join('\n');
    }

    let promised, loggerSpy;

    before(() => {
      loggerSpy = sinon.spy(loggerFn);
      promesso.logger(loggerSpy);

      promised = promesso(throwCodingErr);
    });

    it('giving an HTTP response', () => {
      const promisedMiddleware = promised[0];

      const req = newRequest();
      const res = new DummyResponse();


      return promisedMiddleware(req, res).then(() => {
        sAssert.called(res.sendStatus);
        sAssert.calledWith(res.sendStatus, 500);
      });
    });

    it('correctly call the logger function', () => {
      sAssert.called(loggerSpy);
      assert.include(loggerData, 'coding');
      assert.include(loggerData, 'Reference');
    });

    it('stack trace is present in the logs', () => {
      sAssert.called(loggerSpy);
      assert.include(loggerData, 'throwCodingErr');
      assert.include(loggerData, 'at eval');
    });
  });

  describe('should handle generic errors', () => {
    function throwStringErr (req) {
      throw 'This is not an error';
    }

    let loggerData = '';
    function errorFn () {
      const args = Array.prototype.slice.call(arguments);
      loggerData += args.map(arg => typeof arg === 'object' ? util.inspect(arg) : arg).join('\n');
    }

    let promised, errorSpy;

    before(() => {
      errorSpy = sinon.spy(errorFn);
      promesso.logger(null, errorSpy);

      promised = promesso(throwStringErr);
    });

    it('giving an HTTP response', () => {
      const promisedMiddleware = promised[0];

      const req = newRequest();
      const res = new DummyResponse();


      return promisedMiddleware(req, res).then(() => {
        sAssert.called(res.sendStatus);
        sAssert.calledWith(res.sendStatus, 500);
      });
    });

    it('correctly call the logger function', () => {
      sAssert.called(errorSpy);
      assert.include(loggerData, 'string');
      assert.include(loggerData, 'This is not an error');
    });
  });

});
