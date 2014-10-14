
# setup

## installation

run `npm install` to install all the dependencies

## running

* `gulp build` to compile the front-end code
* `npm start` to run the server


## testing

This project uses the [mocha](http://visionmedia.github.io/mocha/) testing framework.

To install it run `npm install -g mocha`. (you may need sudo depending on your setup. The test suite has three sections: api related tests, other tests for interacting with s3 and email servers, and tests for interacting with other software involved in this installation.

To run all of the tests, use the command:

```
NODE_ENV=test mocha --timeout 20000
```

To run a specific test suite run:
```
NODE_ENV=test mocha --timeout 20000 --grep <suite>
```

e.g.

```
NODE_ENV=test mocha --timeout 20000 --grep api
NODE_ENV=test mocha --timeout 20000 --grep s3
NODE_ENV=test mocha --timeout 20000 --grep interaction
```

Will each run one the three test suites.




# docs

## configuration

The configuration files are stored in the [/config](./config) folder. Configuration settings that change between development and production are stored in `/config/env/development.js` and `/config/env/production.js` respectively. For example this is where basic auth passwords are stored.

## authentication

The entire app is behind basic auth. If the app is running in production mode (i.e. `NODE_ENV=production`), then the username and password will be read from environmental variables `ABBOTT_USERNAME` and `ABBOTT_PASSWORD`. If these variables are not found, they should fallback to a [default stored in the config](./config/env/production/js).

## endpoints

### participants

**note:** requests are json based, but you can add `xml`, or `xml=true` as a query param on your `GET` requests to have the results returned in XML format.

#### `GET /participants`

Fetch participant information, including name, email, etc. This endpoint accepts filters. For example:

`/participants?status=pending` 

will return all pending participants, and

`/participants?status=approved&wasOnWall=0` 

returns all approved participants that haven't been pushed up to the wall yet.

#### `GET /participants/:pid`

Fetch information about a particular participant, based on id.

#### `PUT /participants/:pid`

Update a participants information. This should be used to update paths of video files. For example

```
PUT /participants/1

{
    "rawFileLocation": "location",
    "renderedFileLocation": "location",
    "thumbnailFileLocation": "location"
}
```

will update the file locations of participant `1`.


## data model

### participant


```js

{
    id: Integer,
    contacts: [{ // array of contact objects

        email: String,
        firstName: String,
        lastName: String,
        telephone: String,
        
        meetsAgeRequirements: Boolean,
        // Only used if age requirements aren't met
        parentGuardianEmailAddress: String,
        parentGuardianTelephone: String,
        parentGuardianFirstName: String,
        parentGuardianLastName: String,

        // Marked true once the email/text containing
        // a link to the video permalink has been sent
        emailSent: Boolean,
        textSend: Boolean
    }],
    identifier: String, // unique identifier for the video sharing URLs,
    sharePreference: Boolean, // not currently used,
    rawFileLocation: String,
    renderedFileLocation: String,
    thumbnailFileLocation: String,
    s3Location: String,
    overlayWord: String, // User chooses words to overlay on video,
    status: Enum('pending', 'approved', 'rejected'), // defaults to pending until a moderator approves or rejects
    wasOnWall: Boolean, // has this been sent to the wall yet?
    PodId: Integer // What pod did this user sign up at?
}
```


# helper scrips

## s3 uploading

This script will search the database and upload video files to s3 where the s3 upload never completed (because of network failure, computer turned off, whatever)

```sh
NODE_ENV=production node ./scripts/upload-missing-s3.js
```

`NODE_ENV=production` tells the script to run agains the production database. To use it in dev or test set `NODE_ENV=development` or `NODE_ENV=test`.

## sending email / texts


This script will search the database and send email or text notifications to anyone who hasn't been notified about their video yet.

```sh
NODE_ENV=production node ./scripts/send-unsent-notifications.js
```

`NODE_ENV=production` tells the script to run agains the production database. To use it in dev or test set `NODE_ENV=development` or `NODE_ENV=test`.

