var uuid = require('node-uuid');
var request = require('request');
var Postmark = require('postmark');
var config = require('../../config/config');
var postmark = new Postmark(config.email.apiKey);
var caesar = require('caesar');
var pubKey = caesar.key.loadPublicKeySync(__dirname + '/../../keys/pub.pem');
var _ = require('lodash');
var validator = require('validator');
var Twilio = require('twilio');
var twilio = Twilio(config.twilio.sid, config.twilio.token);
var async = require('async');

module.exports = function(sequelize, DataTypes) {



    var Contact = sequelize.define('Contact', {
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        telephone: { 
            type: DataTypes.STRING(1024),
            set: function(v) {
                if(v) {
                    this.setDataValue('telephone', pubKey.encrypt(v).toString('base64'));
                }
            },
            allowNull: true
        },
        identifier: DataTypes.STRING,
        email: { 
            type: DataTypes.STRING(1024),
            set: function(v) {
                if(v) {
                    this.setDataValue('email', pubKey.encrypt(v).toString('base64'));
                }
            },
            allowNull: true
        },
        meetsAgeRequirements: { type: DataTypes.BOOLEAN, defaultValue: true },
        emailSent: { type: DataTypes.BOOLEAN, defaultValue: false },
        textSent: { type: DataTypes.BOOLEAN, defaultValue: false },
        parentGuardianFirstName: DataTypes.STRING,
        parentGuardianLastName: DataTypes.STRING,
        parentGuardianEmail: { 
            type: DataTypes.STRING(1024), 
            set: function(v) {
                if (v) {
                    this.setDataValue('parentGuardianEmail', pubKey.encrypt(v).toString('base64'));
                }
            },
            allowNull: true
        }, 
        parentGuardianTelephone: { 
            type: DataTypes.STRING(1024),
            set: function(v) {
                if(v) {
                    this.setDataValue('parentGuardianTelephone', pubKey.encrypt(v).toString('base64'));
                }
            },
            allowNull: true
        },
    }, {
        classMethods: {
            associate: function(models) {
                this.belongsTo(models.Participant);
            },

            getEncryptedFields: function() {
                return ['email', 'telephone', 'parentGuardianEmail', 'parentGuardianTelephone'];
            }
        },

        instanceMethods: {

            getFullName: function() {

                if(this.meetsAgeRequirements) {
                    return this.firstName + ' ' + this.lastName;
                }

                return this.parentGuardianFirstName + ' ' + this.parentGuardianLastName;
            },

            getDecryptedField: function(fieldName) {
                if(this[fieldName]) {
                    var privateKey = caesar.key.loadPrivateKeySync(__dirname + '/../../keys/key.pem');
                    return privateKey.decrypt(new Buffer(this[fieldName], 'base64')).toString();
                }
                return null;
            },

            getToPhone: function() {
                var fieldName = (this.meetsAgeRequirements) ? 'telephone' : 'parentGuardianTelephone';
                return this.getDecryptedField(fieldName);
            },

            getToEmail: function() {
                var fieldName = (this.meetsAgeRequirements) ? 'email' : 'parentGuardianEmail';
                return this.getDecryptedField(fieldName);
            },

            getVideoURL: function(cb) {

                this.getParticipant()
                    .success(function(participant) {
                        cb(null, config.staticURL + '/videos/' + participant.s3Location + '/' + participant.overlayWord);
                    }).error(cb || function(){});
            },

            sendTextOrEmail: function(cb) {

                // or should we be sending both?
                var self = this;

                var toPhone = this.getToPhone();
                if(toPhone) {
                    async.parallel([
                        function(callback) {
                            self.sendText(callback);        
                        },
                        function(callback) {
                            self.sendEmail(callback);        
                        },
                    ], cb);
                } else {
                    this.sendEmail(cb);
                }

            },            

            sendRejectionTextOrEmail: function(cb) {

                // or should we be sending both?
                var self = this;

                var toPhone = this.getToPhone();
                if(toPhone) {
                    async.parallel([
                        function(callback) {
                            self.sendRejectionText(callback);        
                        },
                        function(callback) {
                            self.sendRejectionEmail(callback);        
                        },
                    ], cb);
                } else {
                    this.sendRejectionEmail(cb);
                }

            },

            sendText: function(cb) {

                var self = this;

                this.getVideoURL(function(err, videoURL) {

                    twilio.sendMessage({
                        to: self.getToPhone(),
                        from: config.twilio.from,
                        body: 'Thank you for being part of the Abbott Experience. Click to view your video: ' + videoURL
                    }, function(err) {
                        if(err) {
                            return cb(err);
                        }

                        self.textSent = true;
                        self.save().success(function() {
                            cb(null);
                        }).error(function(err) {
                            cb(err);
                        });

                    });
                });

            },

            sendRejectionText: function(cb) {

                var self = this;

                twilio.sendMessage({
                    to: self.getToPhone(),
                    from: config.twilio.from,
                    body: 'SORRY. There seems to be a problem with your video, and we can’t show it on the screen. Please try again. THANK YOU.'
                }, function(err) {
                    if(err) {
                        return cb(err);
                    }

                    cb(null);

                });

            },

            sendRejectionEmail: function(cb) {

                if(!this.getToEmail()) {
                    return cb(null);
                }

                var self = this;

                var name = (this.meetsAgeRequirements) ? this.firstName : this.parentGuardianFirstName;

                var options = {
                    From: config.email.from,
                    To: self.getToEmail(),
                    Subject: config.email.rejectionSubject,
                    TextBody: 'Hi ' + name + ',\r\n\r\nSORRY.\r\n\r\nThere seems to be a problem with your video, and we can\'t show it on the screen. Please try again.\r\n\r\nTHANK YOU.',
                    // HtmlBody: '<html><head><title>Abbott Marathon Experience</title></head><body style="margin:0;font-family: Helvetica, Arial, sans-serif;"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;"><tr><td align="center">SORRY.<br/><br/></td></tr><tr><td align="center">There seems to be a problem with your video, and we can\'t show it on the screen. Please try again.<br/><br/></td></tr><tr><td align="center">THANK YOU.</td></tr></table></body>',
                    HtmlBody: '<html><head><title>Abbott Marathon Experience</title></head><body style="margin:0;font-family: Helvetica, Arial, sans-serif;"><p style="padding:20px;">Hi ' + name + ',<br/><br/>SORRY.<br/><br/>There seems to be a problem with your video, and we can\'t show it on the screen. Please try again.<br/><br/>THANK YOU.</p><br/><br/></body>',
                };

                postmark.send(options, function(err) {
                    if(err) {
                        return cb(err);
                    }

                    self.emailSent = true;
                    self.save().success(function() {
                        cb(null, options);
                    }).error(function(err) {
                        cb(err);
                    });
                });

            },

            sendEmail: function(cb) {

                if(!this.getToEmail()) {
                    return cb(null);
                }

                var self = this;

                var name = (this.meetsAgeRequirements) ? this.firstName : this.parentGuardianFirstName;

                this.getVideoURL(function(err, videoURL) {

                    var options = {
                        From: config.email.from,
                        To: self.getToEmail(),
                        Subject: config.email.subject,
                        TextBody: 'Hi ' + name + ',\r\n\r\nThanks for visiting us at the Abbott Health & Fitness Expo. Get Excited, your video is now ready.\r\n\r\n' + 'Click here to view, download and share it: ' + videoURL + '\r\n\r\nBest,\r\nAbbott',
                        HtmlBody: '<html><head><title>Abbott Marathon Experience</title></head><body style="margin:0;font-family: Helvetica, Arial, sans-serif;"><p style="padding:20px;">Hi ' + name + ',<br/><br/>Thanks for visiting us at the Abbott Health &amp; Fitness Expo. Get Excited, your video is now ready.<br/><br/>' + 'Click here to view, download and share it: <a href="' + videoURL + '">' + videoURL + '</a><br/><br/>Best,<br/><b>Abbott</b></p><br/><br/><table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#002838"><tr><td align="center"><img src="http://abbottchicago.s3.amazonaws.com/email/images/abbott-logo.png" width="125px" style="margin-top:30px;" /></td></tr></table></body>',
                    };

                    postmark.send(options, function(err) {
                        if(err) {
                            return cb(err);
                        }

                        self.emailSent = true;
                        self.save().success(function() {
                            cb(null, options);
                        }).error(function(err) {
                            cb(err);
                        });
                    });
                });


            }
        },

        hooks: {
            beforeCreate: function(contact, done) {
                contact.identifier = uuid.v4();
                done();
            }

        }
    });

    return Contact;
};

