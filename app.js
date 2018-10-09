var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var redis = require('redis');
var redisClient = redis.createClient();

var cache = require('./middlewares/ExpressRedisCache')()
// console.log("cache =====>", cache.route);
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Redis

app.use('/', cache.withDynamicCache({name: "index", expire: 330}), function(req, res, next) {
  const send = res.send.bind(res);
  res.send = function(body){
    const ret = send(body);
    // Do side effects here
    // console.log("Headers", this._headers);
    return ret;
  }
  next();
}, indexRouter, function(req, res, next) {
  next();
});
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

redisClient.on('connect', () => {
  console.log("Redis Connected");
});

redisClient.on('error', (err) => {
  console.log("error", err);
});

redisClient.set('my test key', 'my test value', redis.print);

module.exports = app;
