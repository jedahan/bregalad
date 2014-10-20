koa = require 'koa'
time = require 'koa-response-time'
logger = require 'koa-logger'
router = require 'koa-router'

routes = require './routes.coffee'
console.log routes.newTree

app = koa()

app.use time()
app.use logger()
app.use router(app)
app.get '/test', (next) ->
  @body = "test complete"
  yield next
app.post '/tree', routes.newTree
#app.get '/trees', routes.getTrees
#app.post '/participant', routes.newParticipant
#app.get '/participants', routes.getParticipants
#app.get '/participant/:id:', routes.getParticipants

app.listen process.env.PORT or 5000, ->
  console.log "[#{process.pid}] listening on :#{+@_connectionKey.split(':')[2]}"
