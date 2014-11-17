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

var start_lat;
var start_long;
var end_lat;
var end_long;

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

app.get('/yo', function(req, res) {
    console.log('Got yo from '+req.query.username);
    var username = req.query.username;
    var location = req.query.location;
    var splitted = location.split(';');
    var lat = splitted[0];
    var lon = splitted[1];
    console.log('lat and long being sent ' +lat +lon);
    getClosestStoreForLocation(lat, lon);
});

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

function getUberPrices (start_latitude, start_longitude, end_latitude, end_longitude)
{
    start_lat = start_latitude;
    start_long = start_longitude;
    end_lat = end_latitude;
    end_long = end_longitude;
    uber.estimates.price({
    start_latitude: start_latitude, start_longitude: start_longitude,
    end_latitude: end_latitude, end_longitude : end_longitude},
    function (err, res) {
        if(err) console.log.error(err);
        else 
        {
            var arr = res.prices;
            var cheapest = (parseInt(arr[0].low_estimate) + parseInt(arr[0].high_estimate))/2;
            var rideToSend = arr[0];
            for(var i=0; i < arr.length; i++)
            {
                var selectedPrice = (parseInt(arr[i].low_estimate) + parseInt(arr[i].high_estimate))/2;
                if(selectedPrice < cheapest)
                {
                    cheapest = selectedPrice;
                    console.log('new cheapest '+cheapest);
                    rideToSend = arr[i];
                    console.log('new ride to send '+rideToSend.product_id);
                }
            }
            console.log('ride to send '+rideToSend.product_id);
            sendYo('KAYCRAJU', rideToSend.product_id);
        }
    }
  );
}

function getClosestStoreForLocation (lat, lon)
{
    request.post('http://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' +lon + '&zoom=18&addressdetails=1',
    function (error, response, body) {
        if(!error && response.statusCode == 200)
        {
            var json = JSON.parse(body);
            var city = json.address.city;
            console.log('city '+city);
            yelp.search({term: "starbucks", limit: "1", location: city, cll: +lat+',' +lon, sort:1}, function(error, data) {
            if(error) console.log(error);
            else 
            {
                console.log('place coords '+data.businesses[0].location.coordinate.latitude, data.businesses[0].location.coordinate.longitude);
                getUberPrices(lat, lon, data.businesses[0].location.coordinate.latitude, data.businesses[0].location.coordinate.longitude);
            }    
            });
        }
    });
}

function sendYo (username, product) 
{
    request.post(
    'http://api.justyo.co/yo/',
    { form: { 'api_token': '343cc02c-69fd-483c-b5a5-dbb4e95f6198',
              'username':  username,
              'link': 'uber://?client_id=client_id=6-nBfhM-oXz1bSNPnkoHtzIXCqLV4yy_&action=setPickup&product_id='+product+'&pickup[latitude]='+start_lat+'&pickup[longitude]='+start_long+'&dropoff[latitude]='+end_lat+'&dropoff[longitude]='+end_long } }, 
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
});

module.exports = app;
