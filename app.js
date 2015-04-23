var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var api = require('./routes/api');
var watson = require('./routes/watson');
var multer = require('multer');

var app = express();

function cors(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'authorization,content-type');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Allow', 'GET,POST,PUT,DELETE,OPTIONS');
    next();
}
app.use(cors);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
var multerOptions = {
    dest : './uploads',
    inMemory : true,
    /*
    onFileUploadData: function (file, data, req, res) {
        console.log(data.length + ' of ' + file.fieldname + ' arrived')
    },
    onFileUploadComplete: function (file, req, res) {
        console.log(file.fieldname + ' uploaded to  ' + file.path)
    }
    */
}
app.use(multer(multerOptions))
//app.use(multer({ dest: './uploads'}))
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public/mayday_rock')));

app.use('/', routes);
app.use('/users', users);
app.use('/api', api);
app.use('/watson', watson);

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

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var host = (process.env.VCAP_APP_HOST || '0.0.0.0');
var port = (process.env.VCAP_APP_PORT || 3333);
app.listen(port, host);
console.log('App started on %s:%s', host, port);

module.exports = app;
