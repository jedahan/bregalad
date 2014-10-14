
var models = require('../app/models');
var _ = require('lodash');

models.Participant
    .find({
        where: {
            identifier: process.env.IDENTIFIER
        }
    })
    .success(function(participant) {

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
                    participant.dispatchNotifications(function(err) {
                        if(err) {
                            return console.log(err);
                        }

                        console.log('sent notifications successfully');
                    })
                });
            }
        });
    });
