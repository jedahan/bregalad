util = require 'util'
thunkify = require 'thunkify'
fs = require 'fs'
dir = thunkify fs.readdir
stat = thunkify fs.stat
move = thunkify fs.rename

newTree = (next) ->
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
    console.log yield move temp, path
    @body = {
	    "message": "New tree uploaded!"
	    "url": "http://localhost:5000/#{path}"
    }
  yield next


getTrees = (next) ->
  @body = yield dir 'trees'
  yield next

module.exports = {newTree, getTrees}
