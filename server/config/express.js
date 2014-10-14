
/**
 * Module dependencies.
 */

var express = require('express');
var session = require('cookie-session');
var compression = require('compression');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var csrf = require('csurf');
var serveStatic = require('serve-static');
var slashes = require('connect-slashes');

var flash = require('connect-flash');
var winston = require('winston');
var helpers = require('view-helpers');
var config = require('./config');
var pkg = require('../package.json');
var moment = require('moment');

var env = process.env.NODE_ENV || 'development';


/**
 * Expose
 */

module.exports = function (app) {

    // Compression middleware (should be placed before express.static)
    app.use(compression({
        threshold: 512
    }));

    // Static files middleware
    app.use(serveStatic(config.root + '/public'));


    // Use winston on production
    var log;
    if (env !== 'development') {
        log = {
            stream: {
                write: function (message, encoding) {
                    winston.info(message);
                }
            }
        };
    } else {
        log = { format: 'dev' };
    }

    // Don't log during tests
    // Logging middleware
    // if (env !== 'test') app.use(morgan(log));

    app.use(slashes());

    // set views path, template engine and default layout
    // app.engine('html', swig.renderFile);
    app.set('views', config.root + '/app/views');
    app.set('view engine', 'jade');

    app.use(function (req, res, next) {
        next();
    });


    // expose package.json to views
    app.use(function (req, res, next) {
        res.locals.pkg = pkg;
        res.locals.env = env;
        res.locals.moment = moment;
        res.locals._ = require('lodash');
        res.locals.utils = require('../app/utilities/view-helpers');
        res.locals.config = require('./config');
        res.locals.STATIC_URL = '/';
        next();
    });

    // cookieParser should be above session
    app.use(cookieParser());

    // bodyParser should be above methodOverride
    app.use(bodyParser.json());    
    app.use(bodyParser.urlencoded({ extended: true }));


    app.use(methodOverride(function (req, res) {
        if (req.body && typeof req.body === 'object' && '_method' in req.body) {
            // look in urlencoded POST bodies and delete it
            var method = req.body._method;
            delete req.body._method;
            return method;
        }
    }));

    // express/mongo session storage
    app.use(session({
        secret: pkg.name + 'f4k3l0v3',
        saveUninitialized: true,
        resave: true
    }));

    // use passport session
    // app.use(passport.initialize());
    // app.use(passport.session());

    // connect flash for flash messages - should be declared after sessions
    app.use(flash());

    // should be declared after session and flash
    app.use(helpers(pkg.name));

    // adds CSRF support
    if (process.env.NODE_ENV !== 'test') {
        // app.use(csrf());

        // // This could be moved to view-helpers :-)
        // app.use(function(req, res, next){
        //     res.locals.csrf_token = req.csrfToken();
        //     next();
        // });
    }
};
