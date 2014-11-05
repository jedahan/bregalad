config = require './config.json'
port = process.env.PORT or 5000
timeout = 90 # how many seconds before emailing from the queue

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
readFile = thunkify fs.readFile
async = require 'async'

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

# csv stuff
deepjson2csv = require 'deepjson2csv'
json2csv = thunkify deepjson2csv

table_template = fs.readFileSync('template/table.html', 'utf8')

# email
postmark = require('postmark')(config.postmark_key)
mustache = require 'mustache'
template = null
Styliner = require 'styliner'
styliner = new Styliner(__dirname + '/template')
source = fs.readFileSync('template/email.html', 'utf8')
styliner.processHTML(source).then((html) -> template = html)
postmark_send = thunkify postmark.send

sendEmail = (participant) ->
  console.log "emailing #{participant.first_name} #{participant.last_name} (#{participant.email}) [#{participant._id}]"
  yield participants.update {_id: participant._id}, $set: delivered: true
  rendered = mustache.render template, participant
  image = yield readFile "#{composite_dir}/#{participant._id}.jpg"
  email =
    "From": "stuff@fakelove.tv"
    "To": participant.email
    "Subject": "Umpqua Growth"
    "ReplyTo": "exhibitgrowth@umpquabank.com"
    "TextBody": "Please email exhibitgrowth@umpquabank.com if you are interested in being contacted by a specialist"
    "HtmlBody": rendered
    "Attachments": [{
      "Content": image.toString('base64')
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
    if attached is images.length
      try
        sent = yield postmark_send email
        if sent?.Message is 'OK'
          console.log "email sent to #{participant.email} [#{participant._id}]"
      catch error
        console.error error
        if error.status is 422
          yield participants.remove _id: participant._id
          console.error "removing [#{participant._id}]:"
        else
          yield participants.update {_id: participant._id}, $set: delivered: false
          console.error "email sending failed to #{participant.email} [#{participant._id}]"

# choose our middleware here
app = koa()
app.use time()
app.use logger()
app.use router(app)

# POST /tree image=@tree.jpg timestamp=$(date +%s)
app.post '/tree', body({multipart: true, formidable: {uploadDir: tree_dir}}), ->
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
app.get '/trees', ->
  trees = yield dir 'trees'
  num = +@query['num'] or 4
  offset = +@query['offset'] or 0
  trees = trees.filter (x) -> /jpg$/.test x
  @body = trees.reverse()[offset...offset+num]

# GET /trees/{timestamp}.jpg
app.get /^\/trees\/\d{10}.jpg$/, ->
  yield send @, @path.split('/')[2], root: tree_dir

# POST /participant
app.post '/participant', body({multipart: true, formidable: {uploadDir: composite_dir}}), ->
  participant = @request.body.fields
  participant.delivered = false
  participant.timestamp = (new Date).getTime()
  participant.date = new Date(participant.date)
  participant = yield participants.insert participant
  path = @request.body.files.image.path
  new_path = path.replace /[^/]*$/, "#{participant._id}.jpg"
  @body = yield move path, new_path

# GET /participants
app.get '/participants', ->
  options = timestamp: $gte: (+ @query?.start or 0), $lte: +(@query?.end or (new Date).getTime())
  @body = mustache.render table_template, participants: yield participants.find(options)

app.get '/images/:image', ->
  @body = yield send @, @path, { root: __dirname + '/public' }

# GET /participants.json
app.get '/participants.json', ->
  options = timestamp: $gte: (+ @query?.start or 0), $lte: +(@query?.end or (new Date).getTime())
  @body = yield participants.find(options)

# GET /participants.csv
app.get '/participants.csv', ->
  options = timestamp: $gte: (+ @query?.start or 0), $lte: +(@query?.end or (new Date).getTime())
  @body = yield json2csv data: yield participants.find(options)

app.listen port, ->
  #co( -> console.log yield participants.find({}) )()
  console.log "[#{process.pid}] listening on :#{port}"
  console.log "curl localhost:#{port}/participant \
                --form image=@profile.jpg \
                --form email=jonathan.d@fakelove.tv \
                --form first_name=Jonathan \
                --form last_name=Dahan \
                --form interested=true \
                --form timedout=false \
                --form zip=11201 \
                --form date=$(date +%s)"
  # Every 15 seconds, try and send
  setInterval ( ->
    co( ->
      for participant in yield participants.find({delivered: false})
        yield sendEmail participant
    )()
  ), timeout*1000

