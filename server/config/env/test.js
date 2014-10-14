var path = require('path');

/**
 * Expose
 */

module.exports = {
    username: 'username',
    password: 'password',

    moderatorUsername: 'moderator',
    moderatorPassword: 'moderator',
    
    projectURL: 'http://6c4a208d.ngrok.com',
    staticURL: 'http://myvideo.abbott.com',
    podURLs: ['http://192.168.1.119:7890', 'http://192.168.1.119:7890'],
    publicKeyPath: path.resolve(__dirname + '/../../keys/pub.pem'),
    privateKeyPath: path.resolve(__dirname + '/../../keys/key.pem'),
    email: {
        apiKey: 'a55af4e6-e2b8-4530-bd97-836aa84bdf97',
        subject: '[TEST] Your Abbott Jump video is ready!',
        rejectionSubject: '[TEST] There was a problem with your Abbott Jump video!',
        from: 'admin@myabbottvideo.com',
    },
    s3: {
        bucket: 'abbott-video',
        accessKey: 'AKIAINQ55DET2HUOPH6Q',
        secretKey: 'ic2HzQzTs4QAo5siuV4l9ob6689c9GtMluQ4zOB2'
    },

    twilio: {
        sid: 'AC52728d82e2cc5ea99f1ae280647e5479',
        token: '2d6ac38db4c2818116a6a87a55ab0318',
        from: '7815611349'
    }
};
