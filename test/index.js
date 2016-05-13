'use strict';
const util = require('util');
const assert = require('chai').assert;
const sinon = require('sinon');
const Promise = require('bluebird');
const XError = require('x-error');

const promesso = require('../');

function DummyResponse () {
  ['send', 'status', 'sendStatus'].forEach((method) => {
    this[method] = sinon.stub();
    this[method].returnsThis();
  });
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
    const req = {
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1'
    };

    const res = new DummyResponse();
    const promisedMiddleware = promised[0];

    return promisedMiddleware(req, res).then(() => {
      assert.isTrue(res.status.called);
      assert.isTrue(res.send.called);
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

      const req = {
        body: {},
        params: {},
        query: {},
        ip: '127.0.0.1'
      };
      const res = new DummyResponse();


      return promisedMiddleware(req, res).then(() => {
        assert.isTrue(res.status.called);
        assert.isTrue(res.send.called);
        assert.isTrue(res.status.calledWith(404));
        assert.isTrue(res.send.calledWith('file not found'));
      });
    });

    it('correctly call the logger function', () => {
      assert.isTrue(loggerSpy.called);
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

      const req = {
        body: {},
        params: {},
        query: {},
        ip: '127.0.0.1'
      };
      const res = new DummyResponse();


      return promisedMiddleware(req, res).then(() => {
        assert.isTrue(res.sendStatus.called);
        assert.isTrue(res.sendStatus.calledWith(500));
      });
    });

    it('correctly call the logger function', () => {
      assert.isTrue(loggerSpy.called);
      assert.include(loggerData, 'coding');
      assert.include(loggerData, 'Reference');
    });

    it('stack trace is present in the logs', () => {
      assert.isTrue(loggerSpy.called);
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

      const req = {
        body: {},
        params: {},
        query: {},
        ip: '127.0.0.1'
      };
      const res = new DummyResponse();


      return promisedMiddleware(req, res).then(() => {
        assert.isTrue(res.sendStatus.called);
        assert.isTrue(res.sendStatus.calledWith(500));
      });
    });

    it('correctly call the logger function', () => {
      assert.isTrue(errorSpy.called);
      assert.include(loggerData, 'string');
      assert.include(loggerData, 'This is not an error');
    });
  });

});
