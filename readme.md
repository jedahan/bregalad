# Bregalad, a backend that helps transform people into Ents

## Installation

  `npm install` to install all the dependencies.
  `cp config.json.template && edit config.json`, fill it in with your postmark api key,
  each postmark email template ids, and zip codes that map to address arrays. If your template has image attachments, make sure to have the correct folder in `templates/images/{templateId}` for each template.

## Production

  Run `npm run-script production` and if the server ever crashes it will be restarted.

## Testing

  Start the server with `npm start`. To test creating a new email, try this command:

    curl -i http://localhost:5000/participant --form image=@profile.jpg --form interested=true --form first_name=Bobby --form last_name=Tables --form zip=11201 --form timedout=false --form email=whoever@fake.tv

  You should get two emails, with an inline image from whoever@fake.tv within minutes.

## Templates

  We are using postmark templates - login to edit them.

### The database

  The database is just participants.db, which is json formatted. Just move/delete to reset. Copy this anywhere to have a backup. Copy back to participants.db to restore. Hooray flat files!

  There is also a backup script, called **backup.sh**. If you want to use this to upload the files to a sftp server, copy **config.sh.template** to **config.sh** and fill in the appropriate variables - `USER`, `HOST`, and `IDENTITY`.

## Endpoints


### Post a new tree

    POST /tree?timestamp={timestamp}

Unity App POST’s image file to **/tree**, and the server will respond with the file path to the image, which can then be retrieved via http. The filename of the image will be **$timestamp**.jpg, and the image should be market in a form field called **image**. The timestamp must be 10 decimal digits, like the output from `date +%s`.

### Get the last N trees

     GET /trees[?num=4][&offset=0]

This endpoint is accessed by the iPad app. It returns the "num" most recently created Tree image file paths (default 4 for application/json, 25 for application/html).

If accept-type is application/html, render a paginated gallery of 25 images at a time.

### Get templates

    GET /templates

This will return an array of templates, with associated name and ids. Useful for sending emails.

### Send an email with the chosen treeface

    POST /participant

      first_name: string
      last_name: string
      email: string
      zip: number
      interested: boolean
      timedout: boolean
      image: base64 image
      templateId: number (optional, defaults to random)

When the user has hit submit on the iPad app, the following information is submitted or created as a new entry. There is an optional templateId. If it is not specified, a random template from the list of postmark templates will be sent. You can get an array of templates and thier Ids from the /templates endpoint.

### Get participants

    GET /participants{.csv|.json}[?start={unix timestamp}][&end={unix timestamp}]

You can view all the participants as .json, .csv, or html (no extention). You can filter by start unix timestamp and/or end unix timestamp. The timestamp should be the same format as `date +%s`.

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
