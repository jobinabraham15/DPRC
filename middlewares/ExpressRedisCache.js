const Cache = require("express-redis-cache");
const dynamicRedisCache = require("./DynamicRedisCache");
const util = require("util");

function CustomCache(options) {
  Cache.call(this, options);
}

CustomCache.prototype = Object.create(Cache());
const self = CustomCache.prototype;
CustomCache.prototype.withDynamicCache = dynamicRedisCache.bind(self);

// CustomCache.construtor
module.exports = function(options) {
  return new CustomCache(options);
};
