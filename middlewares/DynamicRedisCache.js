const ExpressRedisCache = require("express-redis-cache");
const util = require("util");
let domain = require("domain");

module.exports = (function() {
  // Extended RedisCache function
  function dynamicRedisCache() {
    const self = this; // Set self to the calling context

    let middleware; // The middleware to return

    const options = arguments;

    let thisDomain = domain.create(); // Create a new domain

    thisDomain.on("error", function(error) {
      console.log("Caught error in domain", error);
      self.emit("error", error);
    });

    thisDomain.run(function() {
      middleware = customMiddleWare; // Set the middleware to run as the middleware
    });

    function customMiddleWare(req, res, next) {
      console.log("custom middleware");
      // Check if the provided context is inhreited from ExpressRedisCache
      if (!self instanceof ExpressRedisCache) {
        console.log("Not Instance of ExpressRedisCache");
        return next();
      }

      // Check if the route method exists in the ExpressRedisCache
      if (!self.route) {
        console.log("Not Route Method Found");
        return next();
      }

      if (!self.client) {
        console.log("No Configured Redis Client Found");
        return next();
      }

      if (!self.route) {
        console.log("No Route Method Found");
        return next();
      }

      let routeOptions = options[0]; // Assume the first argument is the options

      // Set the name of the redis key to be checked
      // This will also be passed down to the route();
      let name =
        (typeof routeOptions === "object" &&
          typeof routeOptions.name === "string" &&
          routeOptions.name) ||
        res.express_redis_cache_name ||
        req.originalUrl;

      // Set the threshold at which the cache should be expired
      let refreshBefore =
        (typeof routeOptions === "object" &&
          typeof routeOptions.refreshBefore === "number" &&
          routeOptions.refreshBefore) ||
        5 * 60;

      // Match Prefix for redis key. TODO: Can we export it in the protoype???
      const prefix = self.prefix.match(/:$/)
        ? self.prefix.replace(/:$/, "")
        : self.prefix;

      // Redis Key name
      const redisKey = prefix + ":" + (name || "*"); // TODO: Handle the case for wildcard list

      const cacheRoute = self.route.bind(self);

      // Logic for cache updation goes here
      const cacheUpdate = function customCacheUpdation(
        originalKeyExists,
        staleKeyExists
      ) {
        if (originalKeyExists && !staleKeyExists) {
          self.client.watch(redisKey, function() {
            self.client
              .multi()
              .rename(redisKey, redisKey + "_stale")
              .expire(redisKey + "_stale", refreshBefore, function() {
                console.log("After Expire called");
                res.express_redis_cache_name = redisKey + "_stale";
                cacheRoute(routeOptions)(req, res, next);
              })
              .exec(function(err, responses) {
                if (err) {
                  console.log("Error in exec", err);
                }
                if (responses === null) {
                  console.log("Some Change occured on the watched key");
                  next();
                }
                console.log("responses", responses);
              });
          });

          //   self.client.rename(redisKey, redisKey + "_stale", function(err) {
          //     if (err) {
          //       cacheRoute(routeOptions)(req, res, next);
          //     }
          //     self.client.expire(redisKey + "_stale", refreshBefore);
          //     res.express_redis_cache_name = redisKey + "_stale";
          //     cacheRoute(routeOptions)(req, res, next);
          //   }); // TODO: Take the stale marker prefix from options
        } else if (!originalKeyExists && staleKeyExists) {
          res.express_redis_cache_name = redisKey + "_stale";
          cacheRoute(routeOptions)(req, res, next); // TODO: Build Expiry for stale cache
        } else {
          cacheRoute(routeOptions)(req, res, next);
        }
      };

      const ttlPromise = util.promisify(self.client.ttl).bind(self.client);
      const keyExistPromise = util
        .promisify(self.client.exists)
        .bind(self.client);

      ttlPromise(redisKey)
        .then(function(ttl) {
          console.log("ttl", ttl);
          if (ttl !== -1 && ttl !== -2 && ttl <= refreshBefore) {
            // Make a polyfill for non-es6
            return Promise.all([
              keyExistPromise(redisKey),
              keyExistPromise(redisKey + "_stale")
            ]);
          } else {
            return Promise.resolve(null);
          }
        })
        .then(function(keys) {
          if (keys) cacheUpdate(keys[0] ? true : false, keys[1] ? true : false);
          else cacheRoute(routeOptions)(req, res, next);
        })
        .catch(function(err) {
          console.log("err", err);
        });
    }

    return middleware;
  }

  return dynamicRedisCache;
})();
