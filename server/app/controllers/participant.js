'use strict';

var models = require('../models');
var _ = require('lodash');
var env = process.env.NODE_ENV || 'development';
var jstoxml = require('jstoxml');


exports.index = function(req, res, next) {

    // filter on the query params
    var opts = {
        where: _.omit(req.query || {}, 'xml'),
        include: [ models.Contact ]
    };

    var Participant = models.Participant;
    Participant
        .findAll(opts)
        .success(function(participants) {

            if('xml' in req.query) {
                res.set('Content-Type', 'text/xml');
                res.send(jstoxml.toXML({
                    participants: _.map(participants, function(participant) {    
                        return {
                            participant: participant.getAPIFieldsAsJSON()
                        };
                    })
                }, true));
            } else {
                return res.json(_.map(participants, function(participant) {
                    return participant.getAPIFieldsAsJSON();
                }));   
            }
        }).error(function(err) {
            console.log('Error fetching participant.');
            console.log(err);
            next(err);
        });
};

exports.read = function(req, res, next) {
    var Participant = models.Participant;
    var pid = req.params.pid;

    var whereObj = {};

    if(pid.indexOf('-') > -1) {
        whereObj.identifier = pid;
    } else {
        whereObj.id = pid;
    }

    Participant
        .find({
            include: [ models.Contact ],
            where: whereObj
        })
        .success(function(participant) {            
            if('xml' in req.query) {
                res.set('Content-Type', 'text/xml');

                return res.send(jstoxml.toXML({
                    participant: participant.getAPIFieldsAsJSON()
                }, true));
            }

            return res.json(participant.getAPIFieldsAsJSON());
        }).error(function(err) {
            console.log('Error updating participant.');
            console.log(err);
            next(err);
        });
};


exports.update = function(req, res, next) {

    var backURL = req.header('Referer');
    var Participant = models.Participant;
    var participantObj = _.pick(req.body, 'status', 'renderedFileLocation', 'rawFileLocation', 'thumbnailFileLocation', 'wasOnWall');
    var pid = req.params.pid;

    var whereObj = {};

    if(pid.indexOf('-') > -1) {
        whereObj.identifier = pid;
    } else {
        whereObj.id = pid;
    }

    console.log('Updating participant ' + pid);
    
    console.log(whereObj);
    console.log(participantObj);


    Participant
        .find({
            where: whereObj
        })
        .success(function(participant) {
            console.log('got participant ' + participant.identifier);
            return participant.updateAttributes(participantObj);
        }).success(function(participant) {

            if(['production', 'qa'].indexOf(env.toLowerCase()) > -1 && participant.status === 'approved' && !participant.s3Location && participant.hasAllFiles()) {
                participant.uploadToS3(function(err) {
                    if(err) {
                        console.log('error uploading files to s3 for participant: ' + participant.identifier);
                        console.log(err);
                    } else {
                        console.log('success uploading to s3 for participant: ' + participant.identifier);
                        participant.dispatchNotifications(function(err) {
                            if(err) {
                                console.log('error sending notifications');
                                console.log(err);
                            } else {
                                console.log('notifications sent successfully');
                            }
                        });
                    }
                });
            }

            else if(['production', 'qa'].indexOf(env.toLowerCase()) > -1 && participant.status === 'rejected' && participantObj.status === 'rejected') {
                participant.dispatchRejections(function(err) {
                    if(err) {
                        console.log('error sending notifications');
                        console.log(err);
                    } else {
                        console.log('notifications sent successfully');
                    }
                });
            }

            if(backURL) {
                res.redirect(backURL);
            } else {
                res.status(200).send();
            }
        }).error(function(err) {
            console.log('Error updating participant.');
            console.log(err);
            next(err);
        });
};

exports.showThumbnail = function(req, res, next) {
    var Participant = models.Participant;
    var pidentifier = req.params.pidentifier;

    var whereObj = {};

    if(pidentifier.indexOf('-') > -1) {
        whereObj.identifier = pidentifier;
    } else {
        whereObj.id = pidentifier;
    }

    Participant
        .find({
            where: whereObj
        }).success(function(participant) {
            try {
                res.sendfile(participant.thumbnailFileLocation);
            } catch(err) {
                return res.status(404).send('Could not find thumbnail');
            }
        }).error(next);
};

exports.showRenderedVideo = function(req, res, next) {
    var Participant = models.Participant;
    var pidentifier = req.params.pidentifier;

    var whereObj = {};

    if(pidentifier.indexOf('-') > -1) {
        whereObj.identifier = pidentifier;
    } else {
        whereObj.id = pidentifier;
    }

    Participant
        .find({
            where: whereObj
        }).success(function(participant) {
            try {
                res.sendfile(participant.renderedFileLocation);
            } catch(err) {
                return res.status(404).send('Could not find rendered video');
            }
        }).error(next);
};



exports.showVideo = function(req, res, next) {
    var Contact = models.Contact;
    var Participant = models.Participant;
    var identifier = req.params.cidentifier;

    Contact
        .find({
            where: {
                identifier: identifier
            },

            include: [Participant]
        })
        .success(function(contact) {

            if(!contact) {
                return res.status(404).send();
            }

            res.render('participant/show-video', {
                contact: contact
            });

        })
        .error(next);

};

