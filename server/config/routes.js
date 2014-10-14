'use strict';
/**
 * Module dependencies.
 */

var home = require('../app/controllers/home');
var pod = require('../app/controllers/pod');
var moderator = require('../app/controllers/moderator');
var participant = require('../app/controllers/participant');
var basicAuth = require('basic-auth-connect');
var config = require('./config');


/**
 * Expose
 */

module.exports = function (app) {

    var auth = basicAuth(config.username, config.password);
    var moderatorAuth = basicAuth(config.moderatorUsername, config.moderatorPassword);

    // these are all behind basic auth
    app.get('/', home.index);
    app.get('/pods/', pod.index);
    app.get('/pods/:pid/', pod.read);
    app.get('/pods/:pid/welcome', pod.showWelcome);
    app.get('/pods/:pid/signup/create', pod.getCreateParticipant);
    app.get('/privacy-policy', pod.showPrivacy);

    app.get('/pods/:pid/signup/:sidentifier/fullest', pod.showFullest);

    app.get('/pods/:pid/signup/:sidentifier/input', pod.showContactCreateEdit);
    app.get('/pods/:pid/signup/:sidentifier/input/:cidentifier', pod.showContactCreateEdit);
    app.get('/pods/:pid/signup/:sidentifier/group-review', pod.showGroupReview);
    app.get('/pods/:pid/signup/:sidentifier/input/:cidentifier/delete', pod.removeContact);
    
    app.get('/pods/:pid/signup/:sidentifier/ambassador-review', pod.showAmbassadorReview);
    app.post('/pods/:pid/signup/:sidentifier/ambassador-review', pod.completeAmbassadorReview);



    app.post('/pods/:pid/signup/:sidentifier/input', pod.createEditContact);
    
    app.post('/pods/:pid/signup/:sidentifier/input/accept-tos/', pod.acceptTOS);
    app.post('/pods/:pid/signup/:sidentifier/input/:cidentifier', pod.createEditContact);
    app.post('/pods/:pid/signup/:sidentifier/input/accept-tos/:cidentifier', pod.acceptTOS);
    app.post('/pods/:pid/signup/:sidentifier/fullest', pod.postFullest);


    app.get('/pods/:pid/signup/:sidentifier/group-ready', pod.confirmSignup);
    app.get('/participants', auth, participant.index);
    app.get('/participants/:pid', auth, participant.read);

    app.get('/participants/:pidentifier/assets/thumbnail', auth, participant.showThumbnail);
    app.get('/participants/:pidentifier/assets/rendered', auth, participant.showRenderedVideo);


    // moderator stuff
    app.get('/moderate', moderatorAuth, moderator.index);
    app.get('/moderate/status/:status', moderatorAuth, moderator.status);
    app.get('/moderate/:page', moderatorAuth, moderator.index);
    app.get('/moderate/status/:status/:page', moderatorAuth, moderator.status);
    app.post('/moderate/participants/:pid', moderatorAuth, participant.update);
    app.put('/moderate/participants/:pid', moderatorAuth, participant.update);
    app.get('/moderate/participants/:pidentifier/assets/thumbnail', moderatorAuth, participant.showThumbnail);
    app.get('/moderate/participants/:pidentifier/assets/rendered', moderatorAuth, participant.showRenderedVideo);

    app.post('/participants/:pid', participant.update);
    app.put('/participants/:pid', participant.update);



    // for public consumption
    app.get('/videos/:cidentifier', participant.showVideo);


    app.use(function (err, req, res, next) {
        // treat as 404
        if (err.message
            && (~err.message.indexOf('not found')
            || (~err.message.indexOf('Cast to ObjectId failed')))) {
            return next();
        }
        console.error(err.stack);
        // error page
        res.status(500).render('500', { error: err.stack });
    });

    // assume 404 since no middleware responded
    app.use(function (req, res, next) {
        res.status(404).render('404', {
            url: req.originalUrl,
            error: 'Not found'
        });
    });
};
