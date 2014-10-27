config = require './config.json'
port = process.env.PORT or 5000

co = require 'co'
thunkify = require 'thunkify'
ipsum = require 'hipsteripsum'

# email template
mustache = require 'mustache'
template = null
fs = require 'fs'
fs.readFile 'templates/css-internal.html', 'utf-8', (err, data) -> template = data

# koa, from the makers of express
koa = require 'koa'
time = require 'koa-response-time'
logger = require 'koa-logger'
body = require 'koa-better-body'

# email sending
postmark = require('postmark')(config.postmark_key)
send = thunkify postmark.send

# choose our middleware here
app = koa()
app.use time()
app.use logger()
app.use body multipart: true, formidable: uploadDir: __dirname+'/test'
app.use (next) ->
  console.log participant = @request.body.fields
  console.log rendered = mustache.render template, participant
  email =
    "From": "stuff@fakelove.tv"
    "To": participant.email
    "Subject": "Umpqua Growth"
    "HtmlBody": rendered
    "TextBody": ipsum.get()

  @body = yield co( ->
    success = yield send email
    if success?.Message is 'OK'
      return "email sent to #{success.To}"
    else
      return success
  )

app.listen port, ->
  console.log "http :#{port} email=jonathan.d@fakelove.tv first_name=Jonathan interested=true"
