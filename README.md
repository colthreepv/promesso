promesso
========
[![NPM](https://nodei.co/npm/promesso.png)](https://nodei.co/npm/promesso/)
[![Build Status](https://travis-ci.org/colthreepv/promesso.svg?branch=master)](https://travis-ci.org/colthreepv/promesso)

Opinionated Promise handler for express.js 4.x

__Promess-o__ wraps a Promise-based middleware with different error handlers and converts it to a simple function (actually an array of functions) to be used by [express](http://expressjs.com/)

**Status:** Tested, production uptime medium.

# Install
Install in your project using:
`npm i --save promesso`

# Example

An Express middleware can be declared like this:
```javascript
const XError = require('x-error');

function myValidator (req) {
  if (!req.body.creditcard)
    throw new XError(801).m('creditcard is required').hc(403);
}

function exmplMiddleware (req) {
  return Promise.resolve({ status: 'ok', data: req.body.creditcard });
}
module.exports = [myValidator, exmplMiddleware];
```

In this sample middleware the main functions is asynchronous and requires a specific `req.body.creditcard` otherwise it cannot function properly.

`promesso` will wrap `exmplMiddleware` with `myValidator` using express middleware Array notation.

This is the corrisponding express.js vanilla code
```javascript
function myValidator (req, res, next) {
  if (!req.body.creditcard) next('creditcard is required');
  else next();
}

function exmplMiddleware (req, res) {
  Promise.resolve({ status: 'ok', data: req.body.creditcard })
    .then(function (data) {
      res.send(data);
    });
}

function errorHandler (err, req, res) {
  if (err) res.status(403).send(err);
}

module.exports = [myValidator, exmplMiddleware];
```

Here there are tricky `next()` calls to remember and Error(s) are not class-based.


## API

### `promesso.logger([loggingFn], [errorFn])`
Changes standard `console.log` and `console.error` functions to output informations;

### `promesso(Function|Function[])`
Promesso can receive a single function or an array of ordered functions.
All the functions will be promisified unless they have a `@raw = true` annotation.
The functions will call `next()` when the promise is completed, the last one calls `res.send()` appropriately.

## Synchronous returns
If you need to return a static template of some kind you can just return it, **promesso** will handle it gracefully.

```javascript
function webpage (req) {
  return `
    <html>
      <head></head>
      <body><h1>Hello World</h1></body>
    </html>
  `;
}
```


## Raw Functions
Sometime you might need a **raw** express function, in this case you can use the `handler['@raw'] = true` annotation.

```javascript
function rawHandler (req, res, next) {
  if (req.accepts('html')) return next();
  res.sendFile('welcome-logo.png');
}
rawHandler['@raw'] = true;

function webpage (req) {
  return Promise.resolve(`<html><body><h1>Hello World</h1></body></html>`)
}

module.exports = [rawHandler, webpage];
```


## Custom `res` methods using Promises
It can happen that is required to give a response with a webpage `res.render(...)` or give multiple commands, like `res.set(...)`.

In that case the Promise should be resolved with a Function having as first parameter the `req` node/express object

Example:

```javascript
function customResponseMiddleware (req) {
  var variableInClosure = 55;
  return Promise.resolve(customFn);

  function customFn (res) {
    res.set('Content-Type', 'text/plain');
    res.send({ message: 'everything ok', variable: variableInClosure });
  }
}
```

Altough a bit verbose, the implementation is very simple, it's just a sequence of `res[method].apply(res, r.args)` calls, it's not tought to be used often.

## TODO

- `example` directory, with full Express 5.x example

## Roadmap

- Possibility to extend with another type of errors *(?)*
- Remove `express-validation` from dependencies - [#1](//github.com/colthreepv/promesso/issues/1)

## Changelog

## [5.0.0] - 2016-07-19
### Changes
- Response handled by promess-o middlewares are now any type, except functions.
If returned a function, it would be a custom response handler. More flexible and concise.

## [4.0.0] - 2016-06-09
### Changes
- Changed the way the library works, handles Array of middlewares, automatically handles `next()` calls

## [3.0.0] - 2016-05-19
### Changes
- `XError`s httpResponse gets converted to a JSON response `{ code: 1xx, message: 'error message' }` in case is a plain `string`

## [2.0.1] - 2016-05-13
### Changes
- Uniformed `loggingFn` calls to ([obj], message) to support [pino](https://github.com/mcollina/pino) / [bunyan](https://github.com/trentm/node-bunyan)
- `errorFn` calls are still all string-based, it's used for unknown-type of errors

## [2.0.0] - 2016-05-11
### Added
- Tests!

### Changes
- Some erroneous calls in the code

## [1.1.0] - 2016-05-03
## Added
- `promesso.logger` to customize the logging/error functions
