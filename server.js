'use strict'
var config = require('./config.json')
var port = process.env.PORT || 5000
var timeout = 3

var util = require('util')
// koa, from the makers of express
var app = require('koa')()
var time = require('koa-response-time')
var logger = require('koa-logger')
var router = require('koa-router')()
var body = require('koa-better-body')
var send = require('koa-send')
var fs = require('co-fs')
var nodefs = require('fs')

// timing, for co
var defer = require('co-defer')

// directories to store images
var static_dir = __dirname + '/static'
var tree_dir = static_dir + '/trees'
var composite_dir = static_dir + '/composites'

// nedb is a simple datastore like sqlite, but with mongodb syntax
var nedb = require('nedb')
var wrap = require('co-ne-db')
var db = new nedb({ filename: 'participants.db', autoload: true })
db.persistence.setAutocompactionInterval(timeout * 1000)
var participants = wrap(db)
var co = require('co')

// csv stuff
var json2csv = require('bluebird').promisify(require('json2csv'))
var mustache = require('mustache')
var table_template = nodefs.readFileSync('template/index.html', 'utf8')
var zipcodes = require('zipcodes')

// email
var postmark = require('postmark')(config.postmark.key)

var sendEmail = function*(participant) {
  const _id = participant._id
  const first_name = participant.first_name
  const last_name = participant.last_name
  const person = `${first_name} ${last_name}`
  yield participants.update({ _id }, {$set: {delivered: true}})
  console.log(`[${_id}] Emailing ${person} (${participant.email})`)
  const zip = participant.zip
  let address = config.zips[`${zip}`]
  if(address == null) {
    address = config.default_address
    if(zipcodes.lookup(zip)){
      const zips = Object.keys(config.zips).map((z) => parseInt(z))
      const distances = zips.map((_zip) => zipcodes.distance(zip, _zip))
      const min_distance = Math.min.apply(Math, distances)
      if(min_distance && min_distance < 100) {
        address = config.zips[zips[distances.indexOf(min_distance)]]
      }
    }
  }

  var model = { first_name, address }

  var email = {
    "To": participant.email,
    "From": config.postmark.emailFrom || "test@example.com",
    "ReplyTo": config.postmark.emailReplyTo || "reply@example.com",
    "TemplateId": config.postmark.templateId,
    "TemplateModel": model,
    "Attachments": [{
        "Content": (yield fs.readFile(`${composite_dir}/${_id}.jpg`)).toString('base64'),
        "Name": "profile.jpg",
        "ContentType": "image/jpeg",
        "ContentID": "cid:profile.jpg"
      }]
  };

  for (let image of (yield fs.readdir(`template/attachments`)).filter((x) => /png$/.test(x))) {
    email["Attachments"].push({
      "Content": nodefs.readFileSync(`template/attachments/${image}`).toString('base64'),
      "Name": image,
      "ContentType": "image/png",
      "ContentID": "cid:" + image
    });
  }

  postmark.sendEmailWithTemplate(email, function(error, result) {
    if(error) {
      if(error.status == 422) {
        db.remove({ _id })
        console.error(`[${_id}] Removed ${person} due to postmark error:`)
      } else {
        db.update({ _id }, { $set: {delivered: false }})
        console.error(`[${_id}] Delivery to ${person} failed due to error:`)
      }
      return console.error(util.inspect(error))
    }
    console.log(`[${_id}] Emailed ${person}`)
  })
};

// POST /tree image=@tree.jpg timestamp=$(date +%s)
router.post('/tree', body({ multipart: true, formidable: { uploadDir: tree_dir } }), function*() {
  const timestamp = this.request.body.fields.timestamp
  const path = this.request.body.files.image.path
  const size = this.request.body.files.image.size
  const image_path = `${tree_dir}/${timestamp}.jpg`

  if(yield fs.exists(image_path)){
    return this.body = `Image ${info.path} already exists`
  } else {
    yield fs.rename(path, image_path)
    return this.body = {
      "message": "New tree uploaded!",
      "url": `:${port}${image_path.replace(__dirname,'')}`
    };
  }
});

// GET /trees
router.get('/trees', function*() {
  const trees = (yield fs.readdir(tree_dir)).filter( (x) => /jpg$/.test(x) )
  const num = parseInt(this.query.num || 4)
  const offset = parseInt(this.query.offset || 0)
  return this.body = trees.reverse().slice(offset, offset + num);
});

// POST /report
router.post('/report', body(), function*() {
  const address = this.request.body.fields.email

  const start = (new Date()).setHours(0,0,0,0)
  const end = (new Date()).setHours(24,0,0,0)
  const options = { timestamp: { $gte: start, $lte: end } }

  let people = yield participants.find(options).exec()
  if(people.length){
    people = yield json2csv({ data: people })
  }

  var email = {
    "To": address,
    "From": config.postmark.emailFrom || "test@example.com",
    "ReplyTo": config.postmark.emailReplyTo || "reply@example.com",
    "Subject": "Daily report",
    "HtmlBody": "Attached is the daily report for umpqua",
    "Attachments": [{
        "Content": (new Buffer(people)).toString('base64'),
        "Name": "participants.csv",
        "ContentType": "text/csv"
      }]
  };

  postmark.sendEmail(email, (err, res) => {
    console.log(err || res)
  })

  this.body = "Report sent"
  return this.body
})

// POST /participant
router.post('/participant', body({ multipart: true, formidable: { uploadDir: composite_dir } }), function*() {
  let participant = this.request.body.fields
  participant.delivered = false
  participant.interested = JSON.parse(participant.interested)
  participant.timedout = JSON.parse(participant.timedout)
  participant.copy = parseInt(participant.copy_option)
  participant.zip = participant.zip || 90210
  participant.zip = parseInt(participant.zip)
  participant.phone = participant.phone
  participant.date = new Date
  participant.timestamp = parseInt(participant.date.getTime())
  participant = yield participants.insert(participant)
  const path = this.request.body.files.image.path
  const new_path = path.replace(/[^\/]*$/, `${participant._id}.jpg`)
  this.body = yield fs.rename(path, new_path)
});

// GET /participants{,.csv,.json}
router.get(/participants*/, function*() {
  const start = this.query.start || `0`
  const end = this.query.end || `${(new Date).getTime()}`
  const options = { timestamp: { $gte: +start, $lte: +end } }
  let people = yield participants.find(options).exec()
  if (people.length === 0) {
    this.body = this["throw"](404, 'No results found')
  } else {
    if(/.json$/.test(this.path)){
      this.body = people
    } else if(/.csv$/.test(this.path)){
      this.body = yield json2csv({ data: people })
    } else {
      this.body = mustache.render(table_template, {people})
    }
  }
});

router.get(/.*/, function*() {
  return (yield send(this, this.path, { root: static_dir }))
});

// choose our middleware here
app
  .use(time())
  .use(logger())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(port, () => {
  console.log(`[${process.pid}] listening on :${port}`);
  console.log()
  console.log(`curl :${port}/participant \
-F image=@profile.jpg \
-F email=test@example.com \
-F first_name=Bobby \
-F last_name=Tables \
-F timedout=false \
-F copy_option=0 \
-F phone=555-867-5309 \
-F zip=90210`);
  defer.setInterval(function*(){
    var participant = yield participants.findOne({ delivered: false }).exec()
    if(participant) { yield sendEmail(participant); }
  },1000);
})
