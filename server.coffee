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

# directory to store tree images
treepath = __dirname + '/trees'

# nedb is a simple datastore like sqlite, but with mongodb syntax
nedb = require 'nedb'
db = new nedb filename: 'db/participants.db', autoload: true
wrap = require 'co-nedb'
participants = wrap db

# choose our middleware here
app = koa()
app.use time()
app.use logger()
app.use router(app)

# POST /tree image=@tree.jpg timestamp=$(date +%s)
app.post '/tree', body({multipart: true, formidable: {uploadDir: treepath}}), (next) ->
  timestamp = @request.body.fields.timestamp
  temp = @request.body.files.image.path
  size = @request.body.files.image.size
  path = "trees/#{timestamp}.jpg"
  files = yield dir "trees"

  if timestamp in files
    info = yield stat path
    if size is info.size
      @status = 202
      @body = "Tree #{timestamp} already exists, and is the same size."
    else
      @status = 409
      @body = "Tree #{timestamp} already exists, but is a different size!"
  else
    yield move temp, path
    @body = {
      "message": "New tree uploaded!"
      "url": "http://localhost:5000/#{path}"
    }

# GET /trees
app.get '/trees', (next) ->
  trees = yield dir 'trees'
  num = +@query['num'] or 4
  offset = +@query['offset'] or 0
  trees = trees.filter (x) -> x isnt 'archive'
  @body = trees.reverse()[offset...offset+num]

# POST /participant
app.post '/participant', body(), (next) ->
  fields = @request.body.fields
  timestamp = fields.timestamp or (new Date).getTime()

  path = "trees/#{timestamp}.jpg"
  trees = yield dir "trees"
  archive = yield dir "trees/archive"

  if (process.env['NODE_ENV'] is "development") \
  or (timestamp in trees) \
  or (timestamp in archive)
    @body = yield participants.insert fields
  else
    @status = 404
    @body = "Tree #{fields.image} not found"

# GET /participant
app.get '/participant', (next) ->
  @body = yield participants.find()

# GET /trees/{timestamp}.jpg
app.get /^\/trees\/\d{10}.jpg$/, ->
  path = @path.split('/')[2]
  yield send @, path, root: treepath

app.listen process.env.PORT or 5000, ->
  port = @_connectionKey.split(':')[2]
  console.log "[#{process.pid}] listening on :#{port}"
  emailer = setTimeout ( ->
    for participant in db.find({sent: false})
      console.log "sendEmail #{participant}"
	  #sendEmail participant
  ), 5000
