
var caesar = require('caesar');
var fs = require('fs-extra');
var path = require('path');

var privateKey = caesar.key.createPrivate(512);
var publicKey = privateKey.toPublicPem().toString();

var publicKeyPath = path.resolve(__dirname + '/../keys/pub.pem');


fs.ensureFileSync(publicKeyPath);
fs.writeFileSync(publicKeyPath, publicKey);

var privateKeyPath = path.resolve(__dirname + '/../keys/key.pem');

fs.ensureFileSync(privateKeyPath);
fs.writeFileSync(privateKeyPath, privateKey.toPrivatePem().toString());
