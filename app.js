var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var Uber = require('node-uber');
var uber = new Uber({
    server_token : '9fb57ZD2LWMz6pC9WMR9E5Bk_MtA6CUGINtJiFnG'
});
var yelp = require("yelp").createClient({
      consumer_key: "w4HK7F2HdoTWWTNwUjkxew", 
      consumer_secret: "RYFwRi7Io9bEsE2lmQRHK26pyRA",
      token: "uETd3bXMBXbUvr2v6SG_ohjdVd4nusIv",
      token_secret: "kg1mpmhtSW2HxvuPbgjyEvqSPg4"
    });


var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

app.get('/yo', function(req, res) {
    console.log('Got yo from the user');
    console.log('request ' +req);
    console.log('res ' +res);
    console.log('Got yo from '+req.query.username);
    var username = req.query.username;
    var location = req.query.location;
    var splitted = location.split(',');
    var lat = splitted[0];
    var lon = splitted[1];
    getClosestStoreForLocation(lat, lon);
});

function getUberPrices (start_latitude, start_longitude, end_latitude, end_longitude)
{
    uber.estimates.price({
    start_latitude: start_latitude, start_longitude: start_longitude,
    end_latitude: end_latitude, end_longitude : end_longitude},
    function (err, res) {
        if(err) console.log.error(err);
        else 
        {
            var arr = res.prices;
            console.log('Array of prices '+arr);
            var c = JSON.stringify(arr[0].estimate);
            var cheapest = c.replace('$','');
            var cheapestPrice = parseInt(cheapest);
            var rideToSend = arr[0];
            for(var i=0; i < arr.length; i++)
            {
                var selectedPrice = arr[i].estimate.replace('$','');
                console.log('selected price '+selectedPrice);
                if(selectedPrice < cheapest)
                {
                    cheapest = selectedPrice;
                    rideToSend = arr[i];
                }
            }
            console.log('cheapestPrice' +cheapest);
            console.log('rise to send '+rideToSend.product_id);
            sendYo('KAYCRAJU', rideToSend.product_id);
        }
    }
  );
}

function getClosestStoreForLocation (lat, lon)
{
    yelp.search({term: "starbucks", limit: "1", location: "Fremont", cll: '37.77493,-122.419415', sort:1}, function(error, data) {
      if(error) console.log(error);
        else 
        {
            console.log(data.businesses[0].location.coordinate);
            getUberPrices(lat, lon, data.businesses[0].location.coordinate.latitude, data.businesses[0].location.coordinate.longitude);
        }    
    });
}

function sendYo (username, product) 
{
    request.post(
    'http://api.justyo.co/yo/',
    { form: { 'api_token': '410fed01-2684-7619-b936-4863162749f6',
              'username':  username,
              'link': 'uber://?action=setPickup&product_id=a1111c8c-c720-46c3-8534-2fcdd730040d&pickup[latitude]=37.775818&pickup[longitude]=-122.41802&dropoff[latitude]=37.548862805439&dropoff[longitude]=-121.98707559934' } }, 
    function (error, response, body) {
        console.log('Sending yo'+response.statusCode);
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    }
);
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function () {
  console.log('Listening on ' + port);
  getClosestStoreForLocation(37.5483,-121.9886);
});

module.exports = app;