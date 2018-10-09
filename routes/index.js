var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log("reached indexRouter");
  setTimeout(function(){
    res.render('index', { title: 'Express' });
  }, 10000);
});

module.exports = router;
