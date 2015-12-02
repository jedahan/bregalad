# Bregalad, a backend that helps transform people into Ents

## Installation

The API requires [node.js](http://nodejs.org) v4, and is built on the [koa](koajs.com) web framework.

First, add your [postmark](postmarkapp.com) `api_key`, and `default_address` to **config.json**:

    mv config.json{.template,} && edit config.json

Now configure daily email sending:

    mv config.sh{.template,} && edit config.sh

On OSX, I have provided plists for the server and backup to run on startup:

    cp *.plist /Library/LaunchDaemons
    launchctl load com.umpqua.bregalad.backup.plist
    launchctl load com.umpqua.bregalad.plist

Install dependencies with `npm install` and run with `npm start`. The intial database will be empty,
but users can be added with the following command:

    curl :${port}/participant -F image=@profile.jpg -F email=test@example.com -F interested=false -F timedout=false -F copy_option=0 -F phone=555-867-5309 -F zip=90210 -F first_name=Bobby -F last_name=Tables

The user bobby tables should appear in [http://localhost:5000/participants](), and an email will be
sent to test@example.com

For production, if you want the server to restart on crash, try:

    npm run-script production

On OSX, I recommend using the plist files for launchd as described above

## Database

  The database is just participants.db, which is json formatted. Just move/delete to reset.
  Copy this anywhere to have a backup. Copy back to participants.db to restore. Hooray flat files!

  There is also a backup script, called **backup.sh**. If you want to use this to upload the files
  to a sftp server, copy **config.sh.template** to **config.sh** and fill in the appropriate
  variables - `USER`, `HOST`, and `IDENTITY`.

## Templates

    We are using postmark templates - login to edit the template.

## Endpoints


### Post a new tree

    POST /tree?timestamp={timestamp}

Unity App POST’s image file to **/tree**, and the server will respond with the file path to the image, which can then be retrieved via http. The filename of the image will be **$timestamp**.jpg, and the image should be market in a form field called **image**. The timestamp must be 10 decimal digits, like the output from `date +%s`.

### Get the last N trees

     GET /trees[?num=4][&offset=0]

This endpoint is accessed by the iPad app. It returns the "num" most recently created Tree image file paths (default 4 for application/json, 25 for application/html).

If accept-type is application/html, render a paginated gallery of 25 images at a time.

### Send an email with the chosen treeface

    POST /participant

      first_name: string
      last_name: string
      email: string
      phone: string
      zip: number
      interested: boolean
      timedout: boolean
      image: base64 image

When the user has hit submit on the iPad app, the following information is submitted or created as a new entry.

### Get participants

    GET /participants{.csv|.json}[?start={unix timestamp}][&end={unix timestamp}]

You can view all the participants as .json, .csv, or html (no extention). You can filter by start unix timestamp and/or end unix timestamp. The timestamp should be the same format as `date +%s`.

#### Participant Model
  * **fist_name** participants first name
  * **last_name** participants last name
  * **phone** participants phone number
  * **email** where to send the email(string@string.string)
  * **interested** is "name" interested in being contacted by a representative (boolean)
  * **timedout** true if they walked away
  * **delivered** was this email successfully sent? (boolean)
  * **\_id** the id of the participant/composite image

### Get a report of the last day

    POST /report

      email: string

Send a report of the current day activities to the specified address
