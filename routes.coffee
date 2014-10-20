newTree = (next) ->
  console.log next
  @body = "created a new tree!"
  yield next

module.exports = {newTree}
