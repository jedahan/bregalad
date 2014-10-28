config = require './config.json'
port = process.env.PORT or 5000
timeout = 1 # every 30 seconds, try sending unsent emails

# koa, from the makers of express
koa = require 'koa'
time = require 'koa-response-time'
logger = require 'koa-logger'
router = require 'koa-router'
body = require 'koa-better-body'
send = require 'koa-send'

# filesystem commands
thunkify = require 'thunkify'
fs = require 'fs'
dir = thunkify fs.readdir
stat = thunkify fs.stat
move = thunkify fs.rename

# directories to store images
tree_dir = __dirname + '/trees'
composite_dir = __dirname + '/composites'

# nedb is a simple datastore like sqlite, but with mongodb syntax
nedb = require 'nedb'
wrap = require 'co-nedb'
db = new nedb filename: 'participants.db', autoload: true
participants = wrap db
co = require 'co'
util = require 'util'

# email sending
postmark = require('postmark')(config.postmark_key)

# email template
mustache = require 'mustache'
template = null
fs = require 'fs'
fs.readFile 'template/email.html', 'utf-8', (err, data) -> template = data

# email sending
postmark = require('postmark')(config.postmark_key)
send = thunkify postmark.send

sendEmail = (participant) ->
  rendered = mustache.render template, participant
  email =
    "From": "stuff@fakelove.tv"
    "To": participant.email
    "Subject": "Umpqua Growth"
    "HtmlBody": rendered
    "Attachments": [{
      "Content": fs.readFileSync("#{composite_dir}/#{participant._id}.jpg").toString('base64')
      "Name": "profile.jpg"
      "ContentType": "image/jpeg"
      "ContentID": "cid:profile.jpg"
    }]

  attached = 0
  images = yield dir "template/images"
  for image in images
    email["Attachments"].push({
      "Content": fs.readFileSync("template/images/#{image}").toString('base64')
      "Name": image
      "ContentType": "image/png"
      "ContentID": "cid:#{image}"
    })
    attached += 1
    if attached is images.length - 1
      postmark.send email, (error, success) ->
        sent = yield participants.update participant, $set: delivered: success.Message is 'OK'
        console.log "#{sent} email sent to #{participant.email} [#{participant._id}]"

# choose our middleware here
app = koa()
app.use time()
app.use logger()
app.use router(app)

# POST /tree image=@tree.jpg timestamp=$(date +%s)
app.post '/tree', body({multipart: true, formidable: {uploadDir: tree_dir}}), (next) ->
  timestamp = @request.body.fields.timestamp
  temp = @request.body.files.image.path
  size = @request.body.files.image.size
  path = "trees/#{timestamp}.jpg"
  files = yield dir "trees"

  if timestamp in files
    info = yield stat path
    if size is info.size
      @status = 202
      @body = "Image #{info.path} already exists, and is the same size."
    else
      @status = 409
      @body = "Image #{info.path} already exists, but is a different size!"
  else
    yield move temp, path
    @body =
      "message": "New tree uploaded!"
      "url": "http://localhost:#{port}/#{path}"

# GET /trees
app.get '/trees', (next) ->
  trees = yield dir 'trees'
  num = +@query['num'] or 4
  offset = +@query['offset'] or 0
  trees = trees.filter (x) -> /jpg$/.test x
  @body = trees.reverse()[offset...offset+num]

# POST /participant
app.post '/participant', body({multipart: true, formidable: {uploadDir: composite_dir}}), (next) ->
  participant = @request.body.fields
  participant.delivered = false
  participant.timestamp ?= (new Date).getTime()
  participant = yield participants.insert participant
  path = @request.body.files.image.path
  new_path = path.replace /[^/]*$/, "#{participant._id}.jpg"
  @body = yield move path, new_path

# GET /participant
app.get '/participant', (next) ->
  @body = yield participants.find()

# GET /trees/{timestamp}.jpg
app.get /^\/trees\/\d{10}.jpg$/, ->
  path = @path.split('/')[2]
  yield send @, path, root: treepath

app.listen port, ->
  #co( -> console.log yield participants.find({}) )()
  console.log "[#{process.pid}] listening on :#{port}"
  console.log "curl localhost:#{port}/participant \
                --form image=@profile.jpg \
                --form email=jonathan.d@fakelove.tv \
                --form first_name=Jonathan \
                --form last_name=Dahan \
                --form interested=true \
                --form timedout=false"
  # Every 15 seconds, try and send
  setInterval ( ->
    co( ->
      for participant in yield participants.find({delivered: false})
        console.log "emailing #{participant.first_name}"
        yield sendEmail participant
    )()
  ), timeout*1000

