
var models = require('../app/models');
var _ = require('lodash');

models.Participant
    .findAll()
    .success(function(participants) {
        _.each(participants, function(participant) {
            participant.dispatchUnsentNotifications(function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log('[Participant' + participant.id + '] notifications sent successfully');
                }
            });
        });
    });
