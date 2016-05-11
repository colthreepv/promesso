# promesso
Opinionated Promise handler for express.js 4.x

Still Work in Progress

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


## Changelog

## [2.0.0] - 2016-05-11
### Added
- Tests!

### Changed
- Some erroneous calls in the code

## [1.1.0] - 2016-05-03
## Added
- `promesso.logger` to customize the logging/error functions
