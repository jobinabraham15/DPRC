const Cache = require("express-redis-cache"); // Requires express redis cache

module.exports = (function(options){

    function CustomRedisCache() {
    }

    CustomCache.prototype = new Cache(); // Inherit from express redis cache
    const self = CustomCache.prototype;

    

    return CustomRedisCache;
}());