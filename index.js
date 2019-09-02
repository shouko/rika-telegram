const config = require("./config")
const botgram = require("botgram")
const bot = botgram(config.telegram.token)
const rp = require("request-promise")
const LRU = require("lru-cache")

let cache = new LRU({
  max: 100,
  maxAge: 1000 * 60 * 60
})

bot.command("start", "help", (msg, reply) =>
  reply.text("Hello, this is Rika!"))

bot.command("alert", (msg, reply, next) => {
  var [ seconds, text ] = msg.args(2)
  if (!seconds.match(/^\d+$/) || !text) return next()

  setTimeout(() => reply.text(text), Number(seconds) * 1000)
})

bot.command("dcimg", (msg, reply, next) => {
  let dcPrefix = /http:\/\/dcimg.awalker.jp\/[^\/]+\//g
  let apiPrefix = config.dcimg.apiPrefix
  let [ dcUrl ] = msg.args(1)
  if (!dcPrefix.test(dcUrl)) return next()
  reply.photo(dcUrl.replace(dcPrefix, apiPrefix))
  reply.then((err, sentMessage) => {
    if (err) console.error(err)
  })
})

bot.command((msg, reply) =>
  reply.text("Invalid command."))

bot.text(async (msg, reply, next) => {
  let matches = msg.text.match(/^(.+)\.(jpg|png|gif|bmp)$/)
  if (!matches) return next()
  console.log(matches)
  let keyword = matches[1]
  let ext = matches[2]
  let isGif = ext === 'gif'
  let cacheKey = keyword + (isGif ? ' gif' : '')
  let items
  if (cache.has(cacheKey)) {
    items = cache.get(cacheKey)
  } else {
    let resp = await rp({
      url: `${config.images.apiPrefix}${encodeURIComponent(keyword)}${config.images.apiSuffix}${isGif ? config.images.gifOption : ""}`,
      'headers': {
        'User-Agent': config.images.uaString
      },
      resolveWithFullResponse: true,
      simple: false
    })
    resp.body = JSON.parse(resp.body)
    if (!resp.body.status || resp.body.status !== 'success') return next()
    items = resp.body.data.result.items.map(e => e.media)
    cache.set(cacheKey, items)
  }
  let photoKeys = []
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length - i; j++) {
      photoKeys.push(i)
    }
  }
  let photoToSend = items[photoKeys[Math.floor(Math.random() * photoKeys.length)]]
  if (isGif) {
    reply.video(photoToSend)
  } else {
    reply.photo(photoToSend)
  }
  reply.then((err, sentMessage) => {
    if (err) console.error(err)
  })  
})
