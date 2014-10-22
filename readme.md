# Bregalad, a backend that helps transform people into Ents

### Post a new tree

    POST /tree?timestamp={timestamp}

Unity App POST’s image file to **/tree**, and the server will respond with the file path to the image, which can then be retrieved via http. The filename of the image will be **$timestamp**.jpg, and the image should be market in a form field called **image**.

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

    GET /participants[?num=4][&offset=0]
    GET /participant/{id}

#### Participant Model
  * **uuid** unique number generated by the server
  * **name** participants full name
  * **email** where to send the email(string@string.string)
  * **interested** is "name" interested in being contacted by a representative (boolean or blank if they walked away)
  * **image** the timestamp of the photo to claim
  * **delivered** was this email successfully sent? (boolean)

## Installation and Deployment
 
The API requires [node.js](http://nodejs.org) v0.11.x, [coffeescript](http://github.com/jashkenas/coffeescript) trunk, and is built on the [koa](koajs.com) web framework.

The recommended setup is to use [nvm](https://github.com/creationix/nvm) to handle installing and using the correct version of node when doing `npm install` and `npm start`.
