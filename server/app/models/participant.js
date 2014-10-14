var uuid = require('node-uuid');
var request = require('request');
var randomstring = require('randomstring');
var knox = require('knox');
var Q = require('q');
var _ = require('lodash');
var config = require('../../config/config');
var async = require('async');


module.exports = function(sequelize, DataTypes) {

    var Participant = sequelize.define('Participant', {
        identifier: DataTypes.STRING,
        sharePreference: { type: DataTypes.BOOLEAN, defaultValue: false },
        rawFileLocation: DataTypes.STRING,
        renderedFileLocation: DataTypes.STRING,
        thumbnailFileLocation: DataTypes.STRING,
        s3Location: DataTypes.STRING,
        overlayWord: DataTypes.STRING,
        status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
        wasOnWall: { type: DataTypes.BOOLEAN, defaultValue: false },
        PodId: DataTypes.INTEGER
    }, {
        classMethods: {
            associate: function(models) {
                this.hasMany(models.Contact);
            }
        },

        instanceMethods: {
            hasAllFiles: function() {
                return (this.rawFileLocation && this.renderedFileLocation && this.thumbnailFileLocation);
            },

            getPodUrl: function() {
                return config.podURLs[this.PodId-1];
            },

            getAPIFieldsAsJSON: function() {
                return _.pick(this.toJSON(), 'PodId', 'identifier', 'overlayWord', 'rawFileLocation', 'renderedFileLocation', 'status', 'thumbnailFileLocation', 'wasOnWall');
            },

            sendToBooth: function(cb) {

                console.log('Sending ' + this.identifier + ' to booth: ' + this.getPodUrl());

                var options = {
                    uri: this.getPodUrl() + '/post',
                    method: 'POST',
                    json: _.pick(this.toJSON(), 'identifier', 'PodId', 'overlayWord')
                };

                request(options, function(err) {
                    cb(err);
                });
            },

            uploadToS3: function(cb) {

                if(!this.renderedFileLocation || !this.thumbnailFileLocation) {
                    return cb(new Error('Missing video files!'));
                }

                var uploadName = randomstring.generate();
                var destPath = '/videos/';
                var s3Path = destPath + uploadName;

                var s3Client = knox.createClient({
                    key: config.s3.accessKey,
                    secret: config.s3.secretKey,
                    bucket: config.s3.bucket
                });


                var self = this;

                async.parallel([
                    function(callback) {
        
                        var headers = {
                            'x-amz-acl': 'public-read',
                            'Content-Type': 'video/mp4',
                            'Content-disposition': 'attachment; filename=render.mp4'
                        };

                        s3Client.putFile(self.renderedFileLocation.trim(), s3Path + '/render.mp4', headers, callback);
                    }, 
                    function(callback) {
        
                        var headers = {
                            'x-amz-acl': 'public-read',
                            'Content-disposition': 'attachment; filename=render.mp4'
                        };

                        s3Client.putFile(self.renderedFileLocation.trim(), s3Path + '/download/render.mp4', headers, callback);
                    }, 
                    function(callback) {

                        var headers = {
                            'x-amz-acl': 'public-read',
                            'Content-Type': 'image/png'
                        };

                        s3Client.putFile(self.thumbnailFileLocation.trim(), s3Path + '/thumbnail.png', headers, callback);
                    }
                ], function(err, results) {

                    if(err) {
                        return cb(err);
                    }

                    self.s3Location = uploadName;
                    self.save()
                        .success(function() {
                            cb(null);
                        }).error(function(err) {
                            cb(err);
                        });
                });
            },

            getS3VideoURL: function() {
                return 'http://s3.amazonaws.com/' + config.s3.bucket + '/videos/' + this.s3Location + '/render.mp4';
            },
            
            getS3ThumbnailURL: function() {
                return 'http://s3.amazonaws.com/' + config.s3.bucket + '/videos/' + this.s3Location + '/thumbnail.png';
            },

            sendTexts: function(cb) {

                this.getContacts()
                    .success(function(contacts) {
                        var funcs = [];
                        _.each(contacts, function(contact) {

                            if(!contact.textSent) {
                                funcs.push(function(callback) {
                                    contact.sendText(callback);
                                });
                            }
                        });

                        async.parallel(funcs, function(err, results) {
                            cb(err, results);
                        });
                    }).error(function(err) {
                        cb(err);
                    });
            },

            sendEmails: function(cb) {

                this.getContacts()
                    .success(function(contacts) {
                        var funcs = [];
                        _.each(contacts, function(contact) {

                            if(!contact.emailSent) {
                                funcs.push(function(callback) {
                                    contact.sendEmail(callback);
                                });
                            }
                        });

                        async.parallel(funcs, function(err, results) {
                            cb(err, results);
                        });
                    }).error(function(err) {
                        cb(err);
                    });
            },

            dispatchRejections: function(cb) {
                this.getContacts()
                    .success(function(contacts) {
                        var funcs = [];
                        _.each(contacts, function(contact) {
                            funcs.push(function(callback) {
                                contact.sendRejectionTextOrEmail(callback);
                            });
                        });

                        async.parallel(funcs, function(err, results) {
                            cb(err, results);
                        });
                    }).error(function(err) {
                        cb(err);
                    });

            },

            dispatchNotifications: function(cb) {
                this.getContacts()
                    .success(function(contacts) {
                        var funcs = [];
                        _.each(contacts, function(contact) {
                            funcs.push(function(callback) {
                                contact.sendTextOrEmail(callback);
                            });
                        });

                        async.parallel(funcs, function(err, results) {
                            cb(err, results);
                        });
                    }).error(function(err) {
                        cb(err);
                    });

            },

            dispatchUnsentNotifications: function(cb) {
                this.getContacts()
                    .success(function(contacts) {
                        var funcs = [];
                        _.each(contacts, function(contact) {

                            if(!contact.emailSent && !contact.textSent) {
                                funcs.push(function(callback) {
                                    contact.sendTextOrEmail(callback);
                                });
                            }
                        });

                        async.parallel(funcs, function(err, results) {
                            cb(err, results);
                        });
                    }).error(function(err) {
                        cb(err);
                    });

            }

        },

        hooks: {

            beforeCreate: function(participant, done) {
                participant.identifier = uuid.v4();
                done();
            }
        }
    });

    return Participant;
};

