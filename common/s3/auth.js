/*!		
* knox - auth		
* Copyright(c) 2010 LearnBoost <dev@learnboost.com>		
* Portions Copyright (c) 2011-2012 VMware, Inc.
* MIT Licensed		
*/

/**
 * Module dependencies.
 */

var crypto = require('crypto');
var url = require('url');

/**
 * Return an "Authorization" header value with the given `options`
 * in the form of "AWS <key>:<signature>"
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.authorization = function(options){
  return 'AWS ' + options.key + ':' + exports.sign(options);
};

/**
 * Simple HMAC-SHA1 Wrapper
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.hmacSha1 = function(options){
  return crypto.createHmac('sha1', options.secret).update(options.message).digest('base64');
};

/**
 * Create a base64 sha1 HMAC for `options`.
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.sign = function(options){
  options.message = exports.stringToSign(options);
  //console.log('message to sign: '+options.message);
  return exports.hmacSha1(options);
};

/**
 * Create a base64 sha1 HMAC for `options`.
 *
 * Specifically to be used with S3 presigned URLs
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.signQuery = function(options){
  options.message = exports.queryStringToSign(options);
  return exports.hmacSha1(options);
};

/**
 * Return a string for sign() with the given `options`.
 *
 * Spec:
 *
 *    <verb>\n
 *    <md5>\n
 *    <content-type>\n
 *    <date>\n
 *    [headers\n]
 *    <resource>
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.stringToSign = function(options){
  var headers = options.amazonHeaders || '';
  if (headers) { headers += '\n'; }
  return [
      options.verb
    , options.md5
    , options.contentType
    , options.date//.toUTCString()
    , headers + options.resource
  ].join('\n');
};

/**
 * Return a string for sign() with the given `options`, but is meant exclusively
 * for S3 presigned URLs
 *
 * Spec:
 *
 *    <date>\n
 *    <resource>
 *
 * @param {Object} options
 * @return {String}
 * @api private
 */

exports.queryStringToSign = function(options){
  return 'GET\n\n\n' +
    options.date + '\n' +
    options.resource;
};

/**
 * Perform the following:
 *
 *  - ignore non-amazon headers
 *  - lowercase fields
 *  - sort lexicographically
 *  - trim whitespace between ":"
 *  - join with newline
 *
 * @param {Object} headers
 * @return {String}
 * @api private
 */

exports.canonicalizeHeaders = function(headers){
  var buf = []
    , fields = Object.keys(headers).sort();
  for (var i = 0, len = fields.length; i < len; ++i) {
    var field = fields[i]
      , val = headers[field];
    field = field.toLowerCase();
    if (0 !== field.indexOf('x-amz')) { continue; }
    buf.push(field + ':' + val);
  }
  return buf.join('\n');
};

/**
 * Perform the following:
 *
 *  - ignore non sub-resources
 *  - sort lexicographically
 *
 * @param {String} resource
 * @return {String}
 * @api private
 */
exports.canonicalizeResource = function(resource){
  var urlObj = url.parse(resource, true);
  var buf = urlObj.pathname;
  var qbuf = [];
  Object.keys(urlObj.query).forEach(function (qs) {
    if (['acl', 'location', 'logging', 'notification', 'partNumber', 'policy', 'requestPayment', 'torrent', 'uploadId', 'uploads', 'versionId', 'versioning', 'versions', 'website','response-content-type', 'response-content-language','response-expires','response-cache-control','response-content-disposition','response-content-encoding'].indexOf(qs) !== -1) {
    qbuf.push(qs + (urlObj.query[qs] !== '' ? '=' + /*encodeURIComponent*/(urlObj.query[qs]) : ''));
    }
  });
  return buf + (qbuf.length !== 0 ? '?' + qbuf.sort().join('&') : '');
};
