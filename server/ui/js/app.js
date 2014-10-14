'use strict';


var parsley = require('parsleyjs');
var vid = require('video.js');
var utils = require('./utils');
var social = require('./social');
require('./lib/mask');
require('./lib/confirmon');

var over18Template = require('../../app/views/pods/includes/over-18.jade');
var under18Template = require('../../app/views/pods/includes/under-18.jade');


var lastAgeVal = null;


var $cob = $('#contact-onboard-form');

if($cob.length) {
    $('#contact-onboard-form').parsley().subscribe('parsley:form:validate', function(formInstance) {
        if(!formInstance.isValid()) {
              $('input[type=submit]').attr('disabled', false).val('continue');
        }
    });
}

$('input[name="meetsAgeRequirements"]').change(function() {

    $('#contact-onboard-form').parsley().destroy();

    if($(this).val() === lastAgeVal) {
        return;
    }

    lastAgeVal = $(this).val();

    if($(this).val() === "false") {
        $('.parent-guardian-container').hide().html('').append(under18Template()).fadeIn();
    } else {
        $('.parent-guardian-container').hide().html('').append(over18Template()).fadeIn();
    }

    mask();
    $('#contact-onboard-form').parsley().subscribe('parsley:form:validate', function(formInstance) {
        console.log('form:validate');
        console.log(formInstance.isValid());
        if(!formInstance.isValid()) {
              $('input[type=submit]').attr('disabled', false).val('continue');
        }
    });

    $('.hidden').fadeIn();
});

$('input[name="overlayWord"]').change(function() {
    $('.after-action-message').animate({ opacity: 1.0});
    $('input').removeClass('disabled');
});


$('#facebook-share').click(function() {
    social.shareOnFacebook(utils.getCurrentURL());
});

$('#twitter-share').click(function() {
    social.shareOnTwitter(utils.getCurrentURL());
});
$('#google-plus-share').click(function() {
    social.shareOnGooglePlus(utils.getCurrentURL());
});


var timeoutId = 0;

$('.footer-image').bind('touchstart mousedown', function() {

    var $self = $(this);

    console.log('mousedown')
    timeoutId = setTimeout(function() {
            
        var confirmOptions = {
            questionText: 'Are you sure you want to restart the signup process?',
            textYes: 'Restart',
            textNo: 'Cancel'
        };

        $self.confirmOn(confirmOptions, 'restart-signup', function(e, result) {
            if(!result) {
                return;
            }

            window.location.href = '/pods/' + window.podId;
            return result;
        });

        $self.trigger('restart-signup');

    }, 3000);
}).bind('touchend mouseleave mouseup', function() {
    console.log('mouseleave')
    clearTimeout(timeoutId);
});

$('form').submit(function(){
  $('input[type=submit]').attr('disabled', true).val('please wait...');
  return true;
});


$('[data-confirm]').each(function() {
    var $self = $(this);

    var confirmOptions = {
        questionText: $self.data('confirm'),
        textYes: 'Delete',
        textNo: 'Cancel'
    };



    $self.confirmOn(confirmOptions, 'click', function(e, result) {
        if(!result) {
            return;
        }

        if ($self.data('confirm-href')) {
            window.location.href = $self.data('confirm-href');
            return;
        }
        return result;
    });
});


var mask = function() {

    var maskPhone = function(phoneNumber) {
        // expect well-formed input
        return phoneNumber;
    }

    $('[data-mask]').each(function() {
        var $this = $(this);
        var maskPattern = $this.data('mask');

        if($this.data('initial-value')) {
            $this.val(maskPhone($this.data('initial-value')));
        }

        $this.mask(maskPattern);


        var m = $this.data('mask');
        console.log(m);


    })

};

mask();
