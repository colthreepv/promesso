'use strict';

const validation = require('express-validation');
const XError = require('x-error');
const ValidationError = validation.ValidationError;
const Promise = require('bluebird');

const logger = {
  log: console.log,
  error: console.error
};

function changeLogger (loggerFn, errorFn) {
  if (isFunction(loggerFn)) logger.log = loggerFn;
  if (isFunction(errorFn)) logger.error = errorFn;
}

/**
 * promesso takes a Promise-based middleware function and converts it to a classic array of middlewares
 *
 * @param  {Function|Function[]} handler: Promise-based Express middleware
 * @return {Function[]} Express-compliant Array of middlewares
 */
function promesso (handler) {
  const handleFn = isFunction(handler) ? [handler] : handler;
  const middlewares = [];
  let validations = 0;

  handleFn.forEach(h => {
    if (!isFunction(h)) throw new Error('Handler is expected to be a function or an Array of functions.');

    if (isObject(handleFn['@validation'])) {
      middlewares.push(validation(h['@validation']), validationMiddleware);
      if (++validations > 1) throw new Error('Every handler can have only one validator per chain.');
    }

    middlewares.push(h);
  });

  return middlewares.map(rawOrPromise);
}
promesso.logger = changeLogger;

function rawOrPromise (handler, index, array) {
  if (handler['@raw']) return handler;
  return handleFactory(handler, (index !== array.length - 1));
}

function handleFactory (handler, usesNext) {

  // handle more cases
  return function (req, res, next) {
    const promisified = Promise.method(handler);
    return promisified(req) // express ignores return value, but useful for testing
    .then(response => {
      if (usesNext) return next();
      if (isFunction(response)) response(res);
      else res.status(200).send(response);
    })
    .catch(XError, xerrorHandler.bind(null, res))
    .catch(Error, errorHandler.bind(null, req, res))
    .catch(genericHandler.bind(null, res));
  };
}

function isObject (obj) { return (obj !== null && typeof obj === 'object'); }
function isFunction (fn) { return typeof fn === 'function'; }
function isString (fn) { return typeof fn === 'string'; }

/**
 * Error Handlers
 */
function xerrorHandler (res, err) {
  logger.log(err, `Error: ${err.code} - ${err.message}`);

  const httpCode = err.httpCode || 500;
  const httpResponse = { code: err.code };
  if (isObject(err.httpResponse)) return res.status(httpCode).send(err.httpResponse);

  if (isString(err.httpResponse)) httpResponse.message = err.httpResponse;
  return res.status(httpCode).send(httpResponse);
}
function errorHandler (req, res, err) {
  logger.log(err.stack, 'coding error', { body: req.body, query: req.query, params: req.params, ip: req.ip, status: 500 });
  // if (page) return res.status(500).render('error');
  return res.sendStatus(500);
}
function genericHandler (res, err) {
  logger.error('Non-Error Error, probably string:');
  logger.error(err);
  return res.sendStatus(500);
}

/**
 * Handles thrown errors from express-validation
 */
function validationMiddleware (err, req, res, next) {
  if (!err instanceof ValidationError) return next(err);
  return res.status(err.status).send({ errors: err.errors });
}
validationMiddleware['@raw'] = true;

module.exports = promesso;
