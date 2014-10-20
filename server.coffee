koa = require 'koa'
time = require 'koa-response-time'
logger = require 'koa-logger'
router = require 'koa-router'
body = require 'koa-better-body'
send = require 'koa-send'

routes = require './routes.coffee'
treepath = __dirname + '/trees'

app = koa()
app.use time()
app.use logger()
app.use router(app)

app.post '/tree', body({multipart: true, formidable: {uploadDir: treepath}}), routes.newTree
app.get '/trees', routes.getTrees
# /trees/#{unix-epoch-timestamp}.jpg
app.get /^\/trees\/\d{10}.jpg$/, ->
  yield send @, @params['timestamp']+'.jpg', root: treepath

app.listen process.env.PORT or 5000, ->
  port = @_connectionKey.split(':')[2]
  console.log "[#{process.pid}] listening on :#{port}"
  console.log ""
  console.log "# uploading a tree:"
  console.log "http --form :#{port}/tree timestamp=$(date +%s) tree@yo.jpg"
  console.log "# or"
  console.log "curl --include localhost:#{port}/tree --form timestamp=$(date +%s) --form tree=@yo.jpg"
