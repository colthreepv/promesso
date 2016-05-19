promesso
========
[![NPM](https://nodei.co/npm/promesso.png)](https://nodei.co/npm/promesso/)
[![Build Status](https://travis-ci.org/colthreepv/promesso.svg?branch=master)](https://travis-ci.org/colthreepv/promesso)

Opinionated Promise handler for express.js 4.x

__Promess-o__ wraps a Promise-based middleware with different error handlers and converts it to a simple function (actually an array of functions) to be used by [express](http://expressjs.com/)

**Status:** Tested, production uptime short.

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
exmplMiddleware['@before'] = myValidator;
module.exports = exmplMiddleware;
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

## Roadmap

- Possibility to extend with another type of errors *(?)*
- Remove `express-validation` from dependencies - [#1](//github.com/colthreepv/promesso/issues/1)

## Changelog

## [3.0.0] - 2016-05-19
### Changed
- `XError`s httpResponse gets converted to a JSON response `{ code: 1xx, message: 'error message' }` in case is a plain `string`

## [2.0.1] - 2016-05-13
### Changed
- Uniformed `loggingFn` calls to ([obj], message) to support [pino](https://github.com/mcollina/pino) / [bunyan](https://github.com/trentm/node-bunyan)
- `errorFn` calls are still all string-based, it's used for unknown-type of errors

## [2.0.0] - 2016-05-11
### Added
- Tests!

### Changed
- Some erroneous calls in the code

## [1.1.0] - 2016-05-03
## Added
- `promesso.logger` to customize the logging/error functions
