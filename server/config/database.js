
var url = require('url');

var dbUrl = null;
if(process.env.DATABASE_URL) {
    dbUrl = url.parse(process.env.DATABASE_URL);
}


module.exports = {
  "development": {
    "username": null,
    "password": null,
    "storage": "fakelove-abbott-dev.db",
    "dialect": "sqlite",
    "sync": {"force": true},
    "logging": false
  },  
  "test": {
    "username": null,
    "password": null,
    "storage": "fakelove-abbott-test.db",
    "dialect": "sqlite",
    "sync": {"force": true},
    "logging": false
  },
  "production": {
    "username": "abbottdb",
    "password": "fake*44datdatabase",
    "host": "192.168.1.145",
    "database": "abbottdb",
    "dialect": "postgres",
    "sync": {"force": true},
    "logging": false
  },
};
