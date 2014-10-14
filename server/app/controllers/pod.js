
/*!
 * Module dependencies.
 */
var _ = require('lodash');
var models = require('../models');
var Q = require('q');
var validator = require('validator');

exports.index = function(req, res) {

    res.render('pods/index', {
    });
};

exports.read = function(req, res) {

    var pid = req.params.pid;
    return res.redirect('/pods/' + pid + '/welcome');
};

exports.getCreateParticipant = function (req, res, next) {
    // user agrees to TOS    
    var pid = req.params.pid;

    models.Participant
        .create({
            PodId: pid
        })
        .success(function(participant) {

            console.log('Participant ' + participant.identifier + ' created');

            return res.redirect('/pods/' + pid + '/signup/' + participant.identifier + '/fullest');
        }).error(function(err) {
            console.log(err);
            return res.status(500).send('Something went wrong');
        });
};

exports.showGroupReview = function (req, res) {

    var Contact = models.Contact;
    var Participant = models.Participant;
    var sidentifier = req.params.sidentifier;

    Participant
        .find({
            where: {
                identifier: sidentifier
            },
            include: [ Contact ]
        }).success(function(participant) { 
            res.render('pods/group-review', {
                participant: participant
            });            
        });
};
exports.showAmbassadorReview = function (req, res) {

    var Contact = models.Contact;
    var Participant = models.Participant;
    var sidentifier = req.params.sidentifier;

    Participant
        .find({
            where: {
                identifier: sidentifier
            },
            include: [ Contact ]
        }).success(function(participant) { 
            res.render('pods/ambassador-review', {
                participant: participant
            });            
        });
};

exports.showWelcome = function (req, res) {
    // user agrees to TOS

    res.render('pods/welcome', {
    });
};

exports.showFullest = function (req, res) {
    // user agrees to TOS


    res.render('pods/fullest-select', {
    });
};


exports.postFullest = function (req, res, next) {
    // user agrees to TOS

    var Participant = models.Participant;
    var sidentifier = req.params.sidentifier;
    var pid = req.params.pid;
    var overlayWord = req.body.overlayWord;

    Participant
        .update({
            overlayWord: overlayWord
        }, {
            identifier: sidentifier
        }).success(function() {
            return res.redirect('/pods/' + pid + '/signup/' + sidentifier + '/input');
        }).error(next);

};

exports.showContactCreateEdit = function(req, res, next) {

    var backURL = req.header('Referer');
    var Contact = models.Contact;
    var cidentifier = req.params.cidentifier;

    if(cidentifier) {

        Contact
            .find({
                where: {
                    identifier: cidentifier
                }
            })
            .success(function(contact) {
                res.render('pods/contact-onboard', {
                    contact: contact,
                    backURL: backURL
                });
            }).error(next);

    } else {

        res.render('pods/contact-onboard', {
            backURL: backURL
        });

    }
};


exports.acceptTOS = function(req, res, next) {
    var Contact = models.Contact;
    var Participant = models.Participant;
    var cidentifier = req.params.cidentifier;
    var sidentifier = req.params.sidentifier;
    var pid = req.params.pid;

    var contactObj = _.pick(req.body, 'firstName', 'lastName', 'meetsAgeRequirements', 'email', 'telephone', 'parentGuardianFirstName', 'parentGuardianLastName', 'parentGuardianEmail', 'parentGuardianTelephone');

    contactObj.meetsAgeRequirements = (contactObj.meetsAgeRequirements === 'true');

    if(!contactObj.meetsAgeRequirements) {
        contactObj.firstName = '';
        contactObj.lastName = '';
    }

    if(cidentifier) {

        Contact
            .update(contactObj, {
                identifier: cidentifier
            })
            .success(function() {
                return res.redirect('/pods/' + pid + '/signup/' + sidentifier + '/group-review');
            }).error(next);

    } else {

        Participant
            .find({
                where: {
                    identifier: sidentifier
                }
            }).success(function(participant) {
                Contact
                    .create(contactObj)
                    .success(function(contact) {
                        return participant.addContact(contact);
                    }).success(function() {
                        return res.redirect('/pods/' + pid + '/signup/' + sidentifier + '/group-review');
                    }).error(function(err) {
                        console.log(err);
                        return res.status(500).send('Something went wrong');
                    });
            });

    }
};

exports.showPrivacy = function(req, res, next) {
    var backURL = req.header('Referer'); 
    res.render('pods/privacy', {
        backURL: backURL
    });
};

exports.createEditContact = function(req, res, next) {

    var Contact = models.Contact;
    var cidentifier = req.params.cidentifier;
    var sidentifier = req.params.sidentifier;
    var pid = req.params.pid;

    var contactObj = _.pick(req.body, 'firstName', 'lastName', 'meetsAgeRequirements', 'email', 'telephone', 'parentGuardianFirstName', 'parentGuardianLastName', 'parentGuardianEmail', 'parentGuardianTelephone');

    _.each(['telephone', 'parentGuardianTelephone'], function(field) {
        var telephone = contactObj[field];

        if(!telephone) {
            return;
        }

        contactObj[field] = telephone.replace(/[\(\) -]/g, '');
    });


    var failed = false;
    _.each(['email', 'parentGuardianEmail'], function(field) {
        if(!contactObj[field]) {
            return;
        }

        if(!validator.isEmail(contactObj[field]) || contactObj[field].length > 254) {
            failed = true;
            return res.status(400).send();
        }
    });

    if(failed) {
        return;
    }

    if(cidentifier) {
    
        contactObj.meetsAgeRequirements = (contactObj.meetsAgeRequirements === 'true');

        if(!contactObj.meetsAgeRequirements) {
            contactObj.firstName = '';
            contactObj.lastName = '';
        }

        Contact
            .update(contactObj, {
                identifier: cidentifier
            })
            .success(function() {
                return res.redirect('/pods/' + pid + '/signup/' + sidentifier + '/group-review');
            }).error(next);

    } else {


        // render privacy policy page with a hidden form

        res.render('pods/tos', {
            contact: contactObj,
            contactIdentifier: cidentifier
        });
    }

};


exports.completeAmbassadorReview = function (req, res, next) {
    
    var Participant = models.Participant;
    var sidentifier = req.params.sidentifier;
    var pid = req.params.pid;

    Participant
        .find({
            where: {
                identifier: sidentifier
            }
        }).success(function(participant) {

            participant.sendToBooth(function(err) {
                if(err) {
                    console.log('Error Sending to booth');
                }

                return res.redirect('/pods/' + pid + '/welcome');
            });
            
        }).error(function(err) {
            console.log('Error');
            console.log(err);
            return next(err);
        });
};

exports.removeContact = function(req, res, next) {
    var backURL = req.header('Referer');
    var cidentifier = req.params.cidentifier;
    var Contact = models.Contact;

    Contact
        .destroy({
            identifier: cidentifier
        })
        .success(function() {
            if(backURL) {
                res.redirect(backURL);
            } else {
                res.status(200).send();
            }

        }).error(function(err) {
            console.log('Error removing contact.');
            console.log(err);
            next(err);
        });
};


exports.confirmSignup = function(req, res, next) {

    var Participant = models.Participant;
    var identifier = req.params.pidentifier;

    Participant
        .find({
            where: {
                identifier: identifier
            }
        })
        .success(function(participant) {
            res.render('pods/confirm', {
                participant: participant
            });            
        }).error(next);


};
