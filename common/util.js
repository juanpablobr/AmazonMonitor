const { MessageEmbed } = require('discord.js')
const pup = require('puppeteer')
const cheerio = require('cheerio')
const amazon = require('./Amazon')
var browser

module.exports = {
  startPup: () => startPup(),
  getPage: (url) => getPage(url),
  startWatcher: (bot) => startWatcher(bot)
}

/**
 * Start a puppeteer instance
 */
async function startPup() {
  browser = await pup.launch()
  console.log("Puppeteer launched")
}

/**
 * Get page HTML
 */
function getPage(url) {
  return new Promise(res => {
    browser.newPage().then(page => {
      page.goto(url).then(() => {
        page.evaluate(() => document.body.innerHTML).then(html => {
          page.close()
          res(load(html))
        })
      })
    })
  })
}

/**
 * Load HTML with cheerio
 */
function load(html) {
  return new Promise(res => res(cheerio.load(html)))
}

/**
 * Inits a watcher that'll check all of the items for price drops
 */
function startWatcher(bot) {
  bot.con.query(`SELECT * FROM watchlist`, (err, rows) => {
    bot.watchlist = JSON.parse(JSON.stringify(rows))
    console.log("Watchlist loaded")

    // Set an interval with an offset so we don't decimate Amazon with requests
    setInterval(() => {
      if(bot.watchlist.length > 0) doCheck(bot, 0)
    }, 5000)
  })
}

function doCheck(bot, i) {
  if (i+1 < bot.watchlist.length) {
    var obj = bot.watchlist[i]
    amazon.details(obj.link).then(item => {
      if (obj.lastPrice < parseFloat(item.price)) sendPriceAlert(bot, obj, item)
    })

    setTimeout(() => doCheck(bot, i + 1), 2000)
  }
}


/**
 * Sends an alert to the guildChannel specified in the DB entry
 * 
 * TODO: Maybe support multiple alerts (out of stock, back in stock, etc.)
 */
function sendPriceAlert(bot, obj, item) {
  var channel = bot.channels.cache.get(obj.channel)
  var embed = new MessageEmbed()
    .setTitle(`Price alert for ${item.full_title}`)
    .setAuthor(item.seller)
    .setDescription(`Old Price: $${obj.lastPrice}\nNew Price: ${item.price}`)

  if(channel) channel.send(embed)
}