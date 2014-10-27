config = require './config.json'
port = process.env.PORT or 5000

ipsum = require 'hipsteripsum'

# koa, from the makers of express
koa = require 'koa'
time = require 'koa-response-time'
logger = require 'koa-logger'
body = require 'koa-better-body'

# email sending
postmark = require('postmark')(config.postmark_key)
co = require 'co'
thunkify = require 'thunkify'
send = thunkify postmark.send

# choose our middleware here
app = koa()
app.use time()
app.use logger()
app.use body multipart: true, formidable: uploadDir: __dirname+'/test'
app.use (next) ->
  console.log participant = @request.body.fields
  email =
    "From": "stuff@fakelove.tv"
    "To": participant.email
    "Subject": "Umpqua Growth"
    "TextBody": ipsum.get()

  @body = yield co( ->
    success = yield send email
    if success?.Message is 'OK'
      return "email sent to #{success.To}"
    else
      return success
  )

app.listen port, ->
  console.log "http :#{port} email=jonathan.d@fakelove.tv"
