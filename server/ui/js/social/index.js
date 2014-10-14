

module.exports = {

    shareOnFacebook: function(url) {
        var width  = 575,
            height = 400,
            left   = ($(window).width()  - width)  / 2,
            top    = ($(window).height() - height) / 2,
            url    = 'http://www.facebook.com/share.php?u=' + url,
            opts   = 'status=1' +
                     ',width='  + width  +
                     ',height=' + height +
                     ',top='    + top    +
                     ',left='   + left;

        window.open(url, 'facebook', opts);
    },

    shareOnTwitter: function(url) {
        var width  = 575,
            height = 400,
            left   = ($(window).width()  - width)  / 2,
            top    = ($(window).height() - height) / 2,
            url    = 'http://www.twitter.com/share' + '?text=WATCH: Check out this video of me in motion, captured at the @AbbotGlobal Health and Fitness Expo.' + '&hashtags=ChiMarathon' + '&url=' + url,
            opts   = 'status=1' +
                     ',width='  + width  +
                     ',height=' + height +
                     ',top='    + top    +
                     ',left='   + left;

        window.open(url, 'twitter', opts);
    },

    shareOnGooglePlus: function(url) {
        var width  = 575,
            height = 800,
            left   = ($(window).width()  - width)  / 2,
            top    = ($(window).height() - height) / 2,
            url    = 'https://plus.google.com/share?url=' + url,
            opts   = 'status=1' +
                     ',width='  + width  +
                     ',height='  + height  +
                     ',top='    + top    +
                     ',left='   + left;

        window.open(url, 'google', opts);
    }
};