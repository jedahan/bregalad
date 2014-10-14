'use strict';

var expect = require('expect.js');
var models = require('../app/models');
var config = require('../config/config');
var _ = require('lodash');
var request = require('request');
var path = require('path');


var testParticipantId, testParticipantIdentifier;
var server;

describe('api tests', function() {

    before(function(done) {
        // start the server
        process.env.PORT = 3000;
        server = require('../server');

        models.sequelize.sync({force: true}).success(function() {
            models.Participant
                .create({
                    PodId: 1
                }).success(function(participant) {
                    testParticipantId = participant.id;
                    models.Contact
                        .create({
                            firstName: 'matthew',
                            lastName: 'conlen',
                            email: 'matthew.conlen@fakelove.tv'
                        }).success(function(contact) {
                            participant.addContact(contact)
                                .success(function() {
                                    done();
                                });
                        });
                });
        });
    });


    it('should find exactly one participant', function(done) {

        request({url: 'http://username:password@localhost:3000/participants', json: true}, function(err, req, body) {
            expect(err).to.be(null);
            expect(body.length).to.be(1);

            var participant = body[0];

            // The response should not include identifying information
            expect(participant.firstName).to.be(undefined);
            expect(participant.lastName).to.be(undefined);
            expect(participant.email).to.be(undefined);

            expect(participant.identifier).to.be.a('string');
            testParticipantIdentifier = participant.identifier;


            expect(participant.status).to.be('pending');
            done();
        });
    });


    it('should find a participant based on their string identifier', function(done) {

        request({url: 'http://username:password@localhost:3000/participants/' + testParticipantIdentifier, json: true}, function(err, req, body) {
            expect(err).to.be(null);
            expect(body).to.be.an('object');

            expect(body.identifier).to.be(testParticipantIdentifier);

            expect(body.firstName).to.be(undefined);
            expect(body.status).to.be('pending');

            done();
        });
    });

    it('should encrypt a users email', function(done) {
        models.Contact
            .create({
                firstName: 'matthew',
                lastName: 'conlen',
                email: 'matthew.conlen@fakelove.tv'
            }).success(function(contact) {
                expect(contact).to.be.an('object');

                // this should be encrypted
                expect(contact.email).to.not.be('matthew.conlen@fakelove.tv');
                expect(contact.email).to.be.a('string');

                done();
            });
    });

    it('should decrypt a users email using the private key', function(done) {
        models.Contact
            .create({
                firstName: 'matthew',
                lastName: 'conlen',
                email: 'matthew.conlen@fakelove.tv'
            }).success(function(contact) {
                expect(contact).to.be.an('object');

                // this should be encrypted
                expect(contact.email).to.not.be('matthew.conlen@fakelove.tv');
                expect(contact.email).to.be.a('string');
                expect(contact.getDecryptedField('email')).to.be('matthew.conlen@fakelove.tv');

                done();
            });
    });


    it('should fail to create a contact with an emoji in their email address', function(done) {
        request.post({url: 'http://username:password@localhost:3000/pods/1/signup/' + testParticipantIdentifier + '/input', json: {
            firstName: 'matthew',
            lastName: 'conlen',
            email: '👌@fakelove.tv'
        }}, function(err, res) {
            expect(res.statusCode).to.be(400);
            done();
        });
    });


    it('should create a contact with some unicode in their email address', function(done) {
        request.post({url: 'http://username:password@localhost:3000/pods/1/signup/' + testParticipantIdentifier + '/input', json: {
            firstName: 'matthew',
            lastName: 'conlen',
            email: '✔@fakelove.tv'
        }}, function(err, res) {
            expect(res.statusCode).to.be(302);
            done();
        });
    });


    it('should create a contact with an email address of length 254 characters', function(done) {
        request.post({url: 'http://username:password@localhost:3000/pods/1/signup/' + testParticipantIdentifier + '/input', json: {
            firstName: 'matthew',
            lastName: 'conlen',
            email: new Array(254 - '@fakelove.tv'.length + 1).join( 'z' ) + '@fakelove.tv'
        }}, function(err, res) {
            expect(res.statusCode).to.be(302);
            done();
        });
    });

    it('should not create a contact with an email address of length 255 characters', function(done) {
        request.post({url: 'http://username:password@localhost:3000/pods/1/signup/' + testParticipantIdentifier + '/input', json: {
            firstName: 'matthew',
            lastName: 'conlen',
            email: new Array(255 - '@fakelove.tv'.length + 1).join( 'z' ) + '@fakelove.tv'
        }}, function(err, res) {
            expect(res.statusCode).to.be(400);
            done();
        });
    });


    it('should update video path on the participant', function(done) {

        var paths = {
            renderedFileLocation: path.resolve(__dirname + '/data/test-video.mp4'),
            thumbnailFileLocation: path.resolve(__dirname + '/data/test-thumbnail.png')
        };


        request.post({url: 'http://username:password@localhost:3000/participants/' + testParticipantIdentifier, json: paths }, function(err, res) {
            expect(err).to.be(null);
            expect(res.statusCode).to.be(200);

            request({url: 'http://username:password@localhost:3000/participants/' + testParticipantIdentifier, json: true}, function(err, req, body) {
                expect(err).to.be(null);
                expect(body).to.be.an('object');

                expect(body.identifier).to.be(testParticipantIdentifier);

                expect(body.renderedFileLocation).to.be(path.resolve(__dirname + '/data/test-video.mp4'));
                expect(body.thumbnailFileLocation).to.be(path.resolve(__dirname + '/data/test-thumbnail.png'));

                done();

            });

            
        });
    });


    after(function(done) {
        server.close(function() {
            done();    
        });
    });
});

describe('s3, email, text tests', function() {

    before(function(done) {
        // start the server
        process.env.PORT = 3000;
        delete require.cache[require.resolve('../server')];
        server = require('../server');

        models.sequelize.sync({force: true}).success(function() {
            models.Participant
                .create({
                    PodId: 1,
                    renderedFileLocation: path.resolve(__dirname + '/data/test-video.mp4'),
                    thumbnailFileLocation: path.resolve(__dirname + '/data/test-thumbnail.png'),
                    overlayWord: 'joyFullest'
                }).success(function(participant) {
                    testParticipantId = participant.id;
                    models.Contact
                        .create({
                            firstName: 'matthew',
                            lastName: 'conlen',
                            email: 'matthew.conlen@fakelove.tv',
                            telephone: '8103331178'
                        }).success(function(contact) {
                            participant.addContact(contact)
                                .success(function() {
                                    done();
                                });
                        });
                });
        });
    });

    it('should upload video to s3', function(done) {

        models.Participant
            .find(testParticipantId)
            .success(function(participant) {
                participant.uploadToS3(function(err) {
                    expect(err).to.be(null);
                    done();
                });
            });
    });
    
    it('the video and thumbnail should be on s3', function(done) {

        models.Participant
            .find(testParticipantId)
            .success(function(participant) {


                var videoURL = participant.getS3VideoURL();
                var thumbnailURL = participant.getS3ThumbnailURL();

                request(videoURL, function(err, req) {
                    expect(req.statusCode).to.be(200);
                    request(thumbnailURL, function(err, req) {
                        expect(req.statusCode).to.be(200);
                        done();
                    });
                });
            });
    });


    // it('should email a link to static video page', function(done) {



    //     models.Participant
    //         .find(testParticipantId)
    //         .success(function(participant) {
    //             participant.sendEmails(function(err, results) {
    //                 expect(err).to.not.be.ok();
    //                 expect(results.length).to.be(1);

    //                 var email = results[0];
    //                 expect(email).to.be.an('object');

    //                 done();
    //             });
    //         });
    // });

    it('should email and text a rejection', function(done) {

        models.Participant
            .find(testParticipantId)
            .success(function(participant) {
                participant.dispatchRejections(function(err, results) {
                    expect(err).to.not.be.ok();
                    console.log(results);
                    done();
                });
            });
    });

    // it('should text a link to static video page', function(done) {

    //     models.Participant
    //         .find(testParticipantId)
    //         .success(function(participant) {
    //             participant.sendTexts(function(err) {
    //                 expect(err).to.not.be.ok();
    //                 done();
    //             });
    //         });
    // });

    it('should email and text a link to static video page', function(done) {

        models.Participant
            .find(testParticipantId)
            .success(function(participant) {
                participant.dispatchNotifications(function(err, results) {
                    expect(err).to.not.be.ok();
                    expect(results.length).to.be(1);

                    var email = results[0];
                    expect(email).to.be.an('object');

                    done();
                });
            });
    });
    
    it('should be hosting a static page with the video from s3', function(done) {

        models.Participant
            .find(testParticipantId)
            .success(function(participant) {

                participant.getContacts().success(function(contacts) {

                    var contact = contacts[0];

                    contact.getVideoURL(function(err, videoURL) {
                        expect(err).to.be(null);

                        request(videoURL, function(err, res) {
                            expect(err).to.be(null);
                            expect(res.statusCode).to.be(200);

                            done();
                        });    

                    });

                });

            });
    });
    

    after(function(done) {
        server.close(function() {
            done();    
        });
    });
});


describe('installation interaction tests', function() {


    before(function(done) {
        // start the server
        process.env.PORT = 3000;
        delete require.cache[require.resolve('../server')];
        server = require('../server');

        models.sequelize.sync({force: true}).success(function() {
            models.Participant
                .create({
                    PodId: 1
                }).success(function(participant) {
                    testParticipantId = participant.id;
                    models.Contact
                        .create({
                            firstName: 'matthew',
                            lastName: 'conlen',
                            email: 'matthew.conlen@fakelove.tv'
                        }).success(function(contact) {
                            participant.addContact(contact)
                                .success(function() {
                                    done();
                                });
                        });
                });
        });
    });
    
    it('should successfully post to the pod', function(done) {

        models.Participant
            .find(testParticipantId)
            .success(function(participant) {
                participant.sendToBooth(function(err) {
                    expect(err).to.be(null);
                    done();
                });
            });
    });

    after(function(done) {
        server.close(function() {
            done();    
        });
    });
});