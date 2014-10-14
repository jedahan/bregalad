
var models = require('../app/models');
var _ = require('lodash');

models.Participant
    .findAll()
    .success(function(participants) {
        _.each(participants, function(participant) {

            if(!participant.s3Location) {
                participant.uploadToS3(function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log('[Participant' + participant.id + '] uploaded to s3 successfully');

                        models.Contact.update({
                            textSent: false,
                            emailSent: false
                        }, {
                            ParticipantId: participant.id
                        }).success(function() {
                            console.log('[Participant' + participant.id + '] associated contacts updated successfully');
                        });
                    }
                });
            }
        });
    });
