
/**
 * Module dependencies
 */

var express = require('express');
var env = process.env.NODE_ENV || 'development';
var app = express();
var server = require('http').Server(app);

var port = process.env.PORT || 80;


if(env === 'production') {
    var cluster = require('cluster');
    var cpuCount = Math.max(1, require('os').cpus().length);

    if(cluster.isMaster) {
        for( var i = 0; i < cpuCount; i++ ) {
          cluster.fork();
        }

        cluster.on('listening', function(worker) {
            console.log('Worker ' + worker.process.pid + ' listening');
        });

        cluster.on('exit', function( worker ) {
          console.log( 'Worker ' + worker.process.pid + ' died.' );
          cluster.fork();
        });

        console.log('Initializing server with ' + cpuCount + ' threads');
        return;
    }   
}


var models = require('./app/models');
models.sequelize.sync(function() {
});


// // Bootstrap passport config
// require('./config/passport')(passport, config);

// Bootstrap application settings
require('./config/express')(app);

// Bootstrap routes
require('./config/routes')(app);

server.listen(port);

if(env === 'development') {
    console.log('Express app started on port ' + port);
}

module.exports = server;
