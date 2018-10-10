const Cache = require("express-redis-cache");
const dynamicRedisCache = require("./DynamicRedisCache");
const util = require("util");

function Dprc(options) {
  Cache.call(this, options);
}

Dprc.prototype = Object.create(Cache());
const self = Dprc.prototype;
Dprc.prototype.withDynamicCache = dynamicRedisCache.bind(self);
module.exports = function(options) {
  return new Dprc(options);
};
