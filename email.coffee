config = require './config.json'
port = process.env.PORT or 5000

co = require 'co'
thunkify = require 'thunkify'
ipsum = require 'hipsteripsum'

# email template
mustache = require 'mustache'
template = null
fs = require 'fs'
fs.readFile 'templates/css-inline.html', 'utf-8', (err, data) -> template = data

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
  path = @request.body.files.image.path
  rendered = mustache.render template, participant
  email =
    "From": "stuff@fakelove.tv"
    "To": participant.email
    "Subject": "Umpqua Growth"
    "HtmlBody": rendered
    "TextBody": ipsum.get()
    "Attachments": [{
      "Content": fs.readFileSync(path).toString('base64'),
      "Name": "profile.jpg",
      "ContentType": "image/jpeg",
      "ContentID": "cid:profile.jpg"
    }]

  @body = yield co( ->
    success = yield send email
    if success?.Message is 'OK'
      return "email sent to #{success.To}"
    else
      return success
  )

app.listen port, ->
  console.log "curl localhost:#{port} --form image=@yo.jpg --form email=jonathan.d@fakelove.tv --form first_name=Jonathan --form interested=true"
