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
var json2csv = co.wrap(require('json2csv'))
var mustache = require('mustache')
var table_template = nodefs.readFileSync('template/table.html', 'utf8')
var zipcodes = require('zipcodes')

// email
var postmark = require('postmark')(config.postmark.key)
const defaultTemplate = config.postmark.defaultTemplateId
var templates;

var sendEmail = function*(participant) {
  yield participants.update({ _id: participant._id }, { $set: { delivered: true } })
  const first = participant.first_name
  const last = participant.last_name
  const templateId = participant.templateId
  const zip = participant.zip
  let address = config.zips[`${zip}`]
  if(address == null) {
    const zips = Object.keys(config.zips)
    const distances = zips.map((_zip) => zipcodes.distance(zip, _zip))
    const min_index = distances.indexOf(Math.min.apply(Math, distances))
    if(min_index != -1){ address = config.zips[zips[min_index]] }
  }

  var _id = participant._id
  const person = `${first} ${last} (${participant.email})`
  console.log(`[${_id}] Emailing ${person}`)
  const image = yield fs.readFile(`${composite_dir}/${_id}.jpg`)
  var model = {"first_name": first}
  if(address) { model["address"] = address }

  var email = {
    "To": participant.email,
    "From": "faketest@exhibitgrowth.com",
    "ReplyTo": "exhibitgrowth@umpquabank.com",
    "TemplateId": templateId,
    "TemplateModel": model,
    "Attachments": [{
        "Content": image.toString('base64'),
        "Name": "profile.jpg",
        "ContentType": "image/jpeg",
        "ContentID": "cid:profile.jpg"
      }]
  };

  for (let image of (yield fs.readdir("template/images"))) {
    email["Attachments"].push({
      "Content": nodefs.readFileSync(`template/images/${image}`).toString('base64'),
      "Name": image,
      "ContentType": "image/png",
      "ContentID": "cid:" + image
    });
  }

  postmark.sendEmailWithTemplate(email, (error, result) => {
    if(!error) {
      if (result.message === 'OK') {
        participants.update({ _id }, { $set: { delivered: true }})
        console.log(`[${_id}] Emailed ${person}`)
      }
    } else {
      if(error.status === 422) {
        participants.remove({ _id }).exec()
        console.error(`[${_id}] Removed ${person} due to postmark error:`)
      } else {
        participants.update({ _id }, { $set: { delivered: false }})
        console.error(`[${_id}] Delivery to ${person} failed due to error:`)
      }
      console.error(util.inspect(error))
    }

  })
};

// POST /tree image=@tree.jpg timestamp=$(date +%s)
router.post('/tree', body({ multipart: true, formidable: { uploadDir: tree_dir } }), function*() {
  const timestamp = this.request.body.fields.timestamp
  const path = this.request.body.files.image.path
  const size = this.request.body.files.image.size
  const image_path = `${tree_dir}/${timestamp}.jpg`

  const stat = yield fs.stat(image_path)
  if(stat.err){
    if (stat.size === info.size) {
      this.status = 202
      return this.body = `Image ${info.path} already exists, and is the same size.`
    } else {
      this.status = 409
      return this.body = `Image ${info.path} already exists, and is a different size.`
    }
  } else {
    yield fs.rename(path, image_path)
    return this.body = {
      "message": "New tree uploaded!",
      "url": `http://localhost:${port}/${image_path}`
    };
  }
});

// GET /trees
router.get('/trees', function*() {
  const trees = (yield fs.readdir(tree_dir)).filter( (x) => /jpg$/.test(x) )
  const num = this.query.num || '4'
  const offset = this.query.offset || '0'
  return this.body = trees.reverse().slice(+offset, +offset + +num);
});

// GET /templates
router.get('/templates', function*() {
  return this.body = templates
})

// POST /participant
router.post('/participant', body({ multipart: true, formidable: { uploadDir: composite_dir } }), function*() {
  let participant = this.request.body.fields
  if(participant.templateId) {
    participant.templateId = + participant.templateId
  } else {
    participant.templateId = templates[Math.floor(Math.random()*templates.length)]
  }
  participant.delivered = false
  participant.interested = JSON.parse(participant.interested)
  participant.timedout = JSON.parse(participant.timedout)
  participant.zip = +participant.zip
  participant.date = new Date
  participant.timestamp = +participant.date.getTime()
  participant = yield participants.insert(participant)
  let path = this.request.body.files.image.path
  let new_path = path.replace(/[^\/]*$/, `${participant._id}.jpg`)
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
      this.body = yield json2csv({ people })
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

postmark.getTemplates(function(err, response) {
  if(err){ console.error(err)
  } else { templates = response.Templates }
})

app.listen(port, () => {
  console.log(`[${process.pid}] listening on :${port}`);
  console.log()
  console.log(`curl localhost:${port}/participant \
--form image=@profile.jpg \
--form email=test@fakelove.tv \
--form first_name=Jonathan \
--form last_name=Dahan \
--form interested=true \
--form timedout=false \
--form template=0 \
--form zip=11201`);
  defer.setInterval( function*(){
    yield sendEmail(yield participants.findOne({ delivered: false }).exec())
  },1000);
})
