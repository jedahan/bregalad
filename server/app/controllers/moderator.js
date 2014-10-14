'use strict';

var _ = require('lodash');
var models = require('../models');
var Q = require('q');

var statuses = ['approved', 'pending', 'rejected'];


exports.index = function(req, res, next) {

    var Participant = models.Participant;

    var limit = 25;
    var page = req.params.page || 1;


    var opts = {
        limit: limit,
        offset: (page - 1) * limit,
        where: {
            status: 'pending',
            rawFileLocation: {ne: null},
            renderedFileLocation: {ne: null},
            thumbnailFileLocation: {ne: null}
        }
    };


    Q.all([
        Participant.count({where: {status: 'pending'}}),
        Participant.count({where: {status: 'approved'}}),
        Participant.count({where: {status: 'rejected'}}),
        Participant.findAll(opts)
    ])
    .spread(function(pendingCount, approvedCount, rejectedCount, pendingParticipants) {

            res.render('moderator/index', {
                participants: pendingParticipants,
                pendingCount: pendingCount,
                approvedCount: approvedCount,
                rejectedCount: rejectedCount,
                page: page,
                hasMorePages: ((page) * limit < pendingCount)
            });
    })
    .fail(function(err) {
        console.log('Error fetching participants for moderator.');
        console.log(err);
        next(err);
    });
};


exports.status = function(req, res, next) {

    var Participant = models.Participant;
    var status = req.params.status;

    if(statuses.indexOf(status) < 0) {
        next(new Error(500));
    }
    var limit = 25;
    var page = req.params.page || 1;

    var opts = {
        limit: limit,
        offset: (page - 1) * limit,
        where: {
            status: status,
            rawFileLocation: {ne: null},
            renderedFileLocation: {ne: null},
            thumbnailFileLocation: {ne: null}
        }
    };

    Q.all([
        Participant.count({where: {status: status}}),
        Participant.findAll(opts)
    ]).spread(function(participantCount, participants) {

            res.render('moderator/status', {
                participants: participants,
                status: status,
                page: page,
                hasMorePages: ((page) * limit < participantCount)
            });
    }).fail(function(err) {
        console.log('Error fetching participants for moderator.');
        console.log(err);
        next(err);
    });
};

