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
  let searchKeyword = keyword + (isGif ? ' gif' : '')
  let items
  if (cache.has(searchKeyword)) {
    items = cache.get(searchKeyword)
  } else {
    let resp = await rp({
      url: `${config.images.apiPrefix}${encodeURIComponent(searchKeyword)}`,
      'headers': {
        'User-Agent': config.images.uaString
      }
    })
    resp = JSON.parse(resp)
    if (!resp.status || resp.status != "success") return next()
    items = resp.data.result.items.map(e => e.media).filter(e => {
      return !isGif || (isGif && e.endsWith('.gif'))
    })
    cache.set(searchKeyword, items)
  }
  let photoToSend = items[Math.floor(Math.random() * items.length)]
  if (isGif) {
    reply.video(photoToSend)
  } else {
    reply.photo(photoToSend)
  }
  reply.then((err, sentMessage) => {
    if (err) console.error(err)
  })  
})
