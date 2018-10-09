const Cache = require("express-redis-cache");
const util = require("util");

function CustomCache(options) {
  Cache.call(this, options);
}

CustomCache.prototype = new Cache();
// CustomCache.prototype.route = CustomCache.prototype.route;

const self = CustomCache.prototype;

CustomCache.prototype.withDynamicCache = function() {
  var routeOptions = arguments;
  var refreshTreshold = 5 * 60;
  var name_in_options;
  if (typeof routeOptions[0] === "object") {
    if (
      routeOptions[0].refreshBefore &&
      typeof routeOptions[0].refreshBefore === "number"
    ) {
      refreshTreshold = routeOptions[0].refreshBefore;
    }
    if (routeOptions[0].name) {
      name_in_options = routeOptions[0].name;
    }
  }

  var domain = require("domain").create();
  domain.on("error", function(error) {
    self.emit("error", error);
  });
  var middleware;

  domain.run(function() {
    middleware = function express_cache_middleware(req, res, next) {
      var name =
        res.express_redis_cache_name || name_in_options || req.originalUrl;
      var prefix = self.prefix.match(/:$/)
        ? self.prefix.replace(/:$/, "")
        : self.prefix;
      var redisKey = prefix + ":" + (name || "*"); // TODO: Handle the case for wildcard list
      console.log("redisKey", redisKey);
      self.client.ttl(redisKey, function(err, ttl) {
        if (err) {
          console.log("error", err);
        }
        console.log("ttl", ttl);
        if (
          ttl !== -1 && // No Key exists with this name
          ttl !== -2 && // No Expiry set on this key
          ttl <= refreshTreshold
        ) {
          console.log("timeToLive", ttl);
          self.client.exists(redisKey + "_stale", function(err, stale_exists) {
            if (err) {
              console.log("err in stale key check", err);
            }
            stale_exists = stale_exists ? true : false;
            self.client.exists(redisKey, function(err, key_exists) {
              if (err) {
                console.log("err in original key check", err);
              }
              key_exists = key_exists ? true : false;
              console.log("key_exists", key_exists);
              console.log("stale_exists", stale_exists);
              if (key_exists && !stale_exists) {
                self.client.rename(redisKey, redisKey + "_stale");
                self.route(routeOptions[0])(req, res, next);
                //   next();
              } else if (!key_exists && stale_exists) {
                res.express_redis_cache_name = redisKey + "_stale";
                self.route(routeOptions[0])(req, res, next); // TODO: Build Expiry for stale cache
              } else {
                console.log("routeOptions[0] in else", routeOptions[0]);
                self.route(routeOptions[0])(req, res, next);
              }
            });
          });
        } else {
          self.route(routeOptions[0])(req, res, next);
        }
      });

      // var stale_key_exists = self.client.exists(redisKey + "_stale")
      //   ? true
      //   : false;
      // var key_exists = self.client.exists(redisKey) ? true : false;
      // console.log("timeToLive", self.client.ttl(redisKey));
      // console.log("timeToLive", refreshTreshold);
      // if (
      //   timeToLive !== -1 && // No Key exists with this name
      //   timeToLive !== -2 && // No Expiry set on this key
      //   timeToLive <= refreshTreshold
      // ) {
      //   console.log("routeOptions in if", routeOptions);
      //   if (key_exists && !stale_key_exists) {
      //     self.client.rename(redisKey, redisKey + "_stale");
      //     self.route()(req, res, next);
      //     //   next();
      //   } else if (!key_exists && stale_key_exists) {
      //     res.express_redis_cache_name = redisKey + "_stale";
      //     self.route()(req, res, next); // TODO: Build Expiry for stale cache
      //   } else {
      //     self.route(routeOptions[0])(req, res, next);
      //   }
      // } else {
      //   console.log("routeOptions", routeOptions);
      //   self.route(routeOptions[0])(req, res, next);
      // }
    };
  });
  return middleware;
};

// CustomCache.construtor
module.exports = function(options) {
  return new CustomCache(options);
};
