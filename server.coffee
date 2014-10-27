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
db = new nedb filename: 'db/participants.db', autoload: true
participants = wrap db
co = require 'co'
util = require 'util'

# email sending
config = require './config.json'
postmark = require('postmark')(config.postmark_key)

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
      "url": "http://localhost:5000/#{path}"

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
  path = @request.body.image?.path

  if path
    @body = yield move path, path.replace /[^/]*$/, participant._id+'.jpg'
  else
    @body = "no image? ok"

# GET /participant
app.get '/participant', (next) ->
  @body = yield participants.find()

# GET /trees/{timestamp}.jpg
app.get /^\/trees\/\d{10}.jpg$/, ->
  path = @path.split('/')[2]
  yield send @, path, root: treepath

app.listen process.env.PORT or 5000, ->
  #co( -> console.log yield participants.find({}) )()
  port = @_connectionKey.split(':')[2]
  console.log "[#{process.pid}] listening on :#{port}"
  email =
    "From": "stuff@fakelove.tv"
    "To": "jonathan.d@fakelove.tv"
    "Subject": "Umpqua Growth"
    "TextBody": "test message"
  setInterval ( ->
    co( ->
      for participant in yield participants.find({delivered: false})
        email["To"] = participant.email
        postmark.send email, (error, success) ->
          sent = yield participants.update participant, $set: delivered: success.Message is 'OK'
          console.log "#{sent} emails sent"
    )()
  ), 1000
