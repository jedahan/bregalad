# Bregalad, a backend that helps transform people into Ents

## Testing

  Once the server is up and running, if you want to test a new email try this command:

    curl -i http://localhost:/participant --form image=@profile.jpg --form interested=true --form first_name=Bobby --form last_name=Tables --form zip=11201 --form timed_out=false

  You should get an email, with an inline image from stuff@fakelove.tv within minutes. Make sure you have config.json filled out.

### The database

  The database is just participants.db, which is json formatted. Just move/delete to reset. Copy this anywhere to have a backup. Copy back to participants.db to restore. Hooray flat files!

  There is also a backup script, called **backup.sh**. If you want to use this to upload the files to a sftp server, copy **config.sh.template** to **config.sh** and fill in the appropriate variables - `USER`, `HOST`, and `IDENTITY`.

## Endpoints

### Post a new tree

    POST /tree?timestamp={timestamp}

Unity App POST’s image file to **/tree**, and the server will respond with the file path to the image, which can then be retrieved via http. The filename of the image will be **$timestamp**.jpg, and the image should be market in a form field called **image**. The timestamp must be 10 decimal digits, like the output from `$(date +%s)`.

### Get the last N trees

     GET /trees[?num=4][&offset=0]

This endpoint is accessed by the iPad app. It returns the "num" most recently created Tree image file paths (default 4 for application/json, 25 for application/html).

If accept-type is application/html, render a paginated gallery of 25 images at a time.

### Send an email with the chosen treeface

    POST /participant?name={string} \
                     &email={email} \
                     &interested={true|false|**empty**} \
                     &image={unix timestamp} \
                     &timestamp={unix timestamp}

When the user has hit submit on the iPad app, the following information is submitted or created as a new entry.

### Get participants

    GET /participants{.csv|.json}[?start={unix timestamp}][&end={unix timestamp}]

You can view all the participants as .json, .csv, or html (no extention). You can filter by start unix timestamp and/or end unix timestamp.

#### Participant Model
  * **fist_name** participants first name
  * **last_name** participants last name
  * **email** where to send the email(string@string.string)
  * **interested** is "name" interested in being contacted by a representative (boolean)
  * **timedout** true if they walked away
  * **delivered** was this email successfully sent? (boolean)
  * **_id** the id of the participant/composite image

## Installation and Deployment
 
The API requires [node.js](http://nodejs.org) v0.11.x, [coffeescript](http://github.com/jashkenas/coffeescript) trunk, and is built on the [koa](koajs.com) web framework.

The recommended setup is to use [nvm](https://github.com/creationix/nvm) to handle installing and using the correct version of node when doing `npm install` and `npm start`.

For example, if you are on a fresh Yosemite:

    # Install nvm (node version manager)
    curl https://raw.githubusercontent.com/creationix/nvm/v0.17.3/install.sh | bash

    # Install node v0.11.13
    nvm install v0.11.13

    # Set v0.11.13 to the default
    nvm alias default v0.11.13

    # Install libraries
    npm install


Its possible that npm doesn't get picked up in your `$PATH`, so add it to your **.profile**:

    echo 'source ${HOME}/.nvm/nvm.sh' > ~/.profile

Make sure to add your postmarkapp api_key to **config.json**

    mv config.json{.template,}
    vim config.json

Now you should be ready to run the server

    npm start

Now check out [http://localhost:5000](http://localhost:5000)


For production, if you want the server to restart on crash, make sure to install forever globally:

    npm install -g forever

Then you can run:

    npm run-script production

Try killing the process, and watch it revive
