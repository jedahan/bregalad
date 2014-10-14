
var path = require('path');
/**
 * Expose
 */

module.exports = {
    username: 'username',
    password: 'password',

    moderatorUsername: 'moderator',
    moderatorPassword: 'moderator',

    projectURL: 'http://localhost:3000',
    staticURL: 'http://lit-woodland-5251.herokuapp.com',
    podURLs: ['http://192.168.1.119:7890', 'http://192.168.1.119:7890'],
    publicKeyPath: path.resolve(__dirname + '/../../keys/pub.pem'),
    privateKeyPath: path.resolve(__dirname + '/../../keys/key.pem'),
    email: {
        apiKey: 'POSTMARK_API_TEST',
        subject: '[DEV] Your Abbott Jump video is ready!',
        rejectionSubject: '[DEV] There was a problem with your Abbott Jump video!',
        from: 'no-reply@fakelove.tv',
    },
    s3: {
        bucket: 'abbott-video',
        accessKey: 'AKIAINQ55DET2HUOPH6Q',
        secretKey: 'ic2HzQzTs4QAo5siuV4l9ob6689c9GtMluQ4zOB2'
    },

    twilio: {
        sid: 'SID',
        token: 'TOKEN',
        from: 'fromphonenumber'
    }
};
