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
var table_template = nodefs.readFileSync('templates/table.html', 'utf8')
var zipcodes = require('zipcodes')

// email
var postmark = require('postmark')(config.postmark.key)
var templates;

var sendEmailWithTemplate = function*(_id, email, templateId) {
  console.log(`[${_id}/${templateId}] Emailing ${email.TemplateModel.first_name} (${email.To})`)

  if (templateId === config.postmark.templateIds.portrait){
      yield participants.update({ _id }, {$set: {delivered: true}})
  } else {
      yield participants.update({ _id }, {$set: {deliveredInterested: true}})
  }
  const images = (yield fs.readdir(`templates/images/${templateId}`)).filter( (x) => /jpg$/.test(x) )
  for (let image of images) {
    email["Attachments"].push({
      "Content": nodefs.readFileSync(`template/images/${templateId}/${image}`).toString('base64'),
      "Name": image,
      "ContentType": "image/png",
      "ContentID": "cid:" + image
    });
  }
  postmark.sendEmailWithTemplate(email, function*(error, result) {
    if(!error) {
      if (result.message === 'OK') {
        console.log(`[${_id}] Emailed ${person}`)
      }
    } else {
      if(error.status === 422) {
        participants.remove({ _id }).exec()
        console.error(`[${_id}] Removed ${person} due to postmark error:`)
      } else {
        if (templateId === config.postmark.templateIds.portrait){
            (yield participants.update({ _id }, { $set: {delivered: false }}))
        } else {
            (yield participants.update({ _id }, { $set: {deliveredInterested: false }}))
        }
        console.error(`[${_id}] Delivery to ${person} failed due to error:`)
      }
      console.error(util.inspect(error))
    }
  })
}

var sendInterestedEmail = function*(participant) {
  const templateId = config.postmark.templateIds.branch
  const first = participant.first_name
  const zip = participant.zip
  let address = config.zips[`${zip}`]
  if(address == null) {
    const zips = Object.keys(config.zips)
    const distances = zips.map((_zip) => zipcodes.distance(zip, _zip))
    const min_index = distances.indexOf(Math.min.apply(Math, distances))
    if(min_index != -1){ address = config.zips[zips[min_index]] }
  }
  var model = {"first_name": first}
  if(address) { model["address"] = address }

  var email = {
    "To": participant.email,
    "From": "faketest@exhibitgrowth.com",
    "ReplyTo": "exhibitgrowth@umpquabank.com",
    "TemplateId": templateId,
    "TemplateModel": model,
    "Attachments": []
  };
  yield sendEmailWithTemplate(participant._id, email, templateId)
}

var sendEmail = function*(participant) {
  const templateId = config.postmark.templateIds.portrait
  const first = participant.first_name
  const last = participant.last_name

  var _id = participant._id
  const image = yield fs.readFile(`${composite_dir}/${_id}.jpg`)
  var model = {"first_name": first}

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
  yield sendEmailWithTemplate(participant._id, email, templateId)
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
  const num = parseInt(this.query.num || 4)
  const offset = parseInt(this.query.offset || 0)
  return this.body = trees.reverse().slice(offset, offset + num);
});

// GET /templates
router.get('/templates', function*() {
  return this.body = templates
})

// POST /participant
router.post('/participant', body({ multipart: true, formidable: { uploadDir: composite_dir } }), function*() {
  let participant = this.request.body.fields
  participant.delivered = false
  participant.deliveredInterested = false
  participant.interested = JSON.parse(participant.interested)
  participant.timedout = JSON.parse(participant.timedout)
  participant.copy = parseInt(participant.copy_option)
  participant.zip |= 90210
  participant.zip = parseInt(participant.zip)
  participant.phone = participant.phone
  participant.date = new Date
  participant.timestamp = parseInt(participant.date.getTime())
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
--form copy_option=0 \
--form phone=555-8675309 \
--form zip=11201`);
  defer.setInterval( function*(){
    yield sendEmail(yield participants.findOne({ delivered: false }).exec())
    yield sendInterestedEmail(yield participants.findOne({ interested: true, deliveredInterested: false }).exec())
  },5000);
})
