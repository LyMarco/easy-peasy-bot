/**
 * A Bot for Slack, handles slash commands. Forked from slackapi/easy-peasy-bots
 */

// For development, using a .env file to quickly deploy environment variables (ty Code Realm)
require('dotenv').config(); 

/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
        // debug: true,
        clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN) ?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
        // debug: true,
        clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,
    };
}

/**
 * Initialize controller
 */

// We want to try treating this as an app since custom integrations may not be a thing in slack for future
var bot_capable = process.env.TOKEN || process.env.SLACK_TOKEN;
var command_capable = process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT && process.env.VERIFICATION_TOKEN;
if (!bot_capable) {
    console.log('Warning: Environment variables for bot (TOKEN or SLACK_TOKEN) are not present');
}
if (!command_capable) {
    console.log('Warning: Environment variables for slash command app (PORT, CLIENT_ID, CLIENT_SECRET and VERIFICATION_TOKEN) are not present');
}
/*if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);*/
if (bot_capable || command_capable) {
    //Treat this as an app
    var app = require('./lib/apps');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, 
        process.env.CLIENT_SIGNING_SECRET, token, process.env.VERIFICATION_TOKEN, config, onInstallation);
} else {
    console.log('Error: Please specify proper environment variables for at least a bot or slash command app.');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * Bad way to handle closing. Needs a fix.
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
    myBot = bot;
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * =============================
 * =====  Core bot logic =======
 * =============================
 */

const fs = require('fs');  
const readline = require('readline');
const axios = require('axios');

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!");
    console.log(message);
});

/**
 * ========================
 * Handling direct messages
 * ========================
 */

/*controller.on('direct_message, direct_mention, mention', function (bot, message) {
    handleMessages(bot, message, message.text);
});

function handleMessages(bot, message, text) {
    if (text.toLowerCase().includes('hello')) {
        greetings(bot, message);
    } else if (text.toLowerCase().includes('joke')) {
        joke(bot, message);
    // } else if (text.toLowerCase().includes('cheer')) {
        // cheers(bot, message);
    } else if (text.toLowerCase().includes('weather')) {
        weather(bot, message, 'Toronto');
    } else if (text.toLowerCase().includes('webhook')) {
        console.log(bot.config.incoming_webhook.url);
            bot.sendWebhook({
                text: message.text,
            } , function (err, response) {
                if (err) {
                    console.log('webhook error', err);
                }
            });
    } else if (text.toLowerCase().includes('post')) {
        bot.api.channels.list({}, function(err, response) {
            if (err) {
                console.log(err);
            } else {
                response.channels.forEach(function(channel) {
                    console.log(channel.id); 
                    var message_to_channel = {
                        
                        channel: channel.id,
                        text: 'hello',
                    };

                    bot.api.chat.postMessage(message_to_channel, function(err, response) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(response);
                    });
                });
            }
        });
        
    } else {
        bot.reply(message, 'I heard you loud and clear boss.');
    }
}*/

controller.hears(new RegExp('^.*cheer.*$', 'i'), 'direct_mention, mention, direct_message', function (bot, message) {
    cheer(bot, message);
});

controller.hears(new RegExp('^.*joke.*$', 'i'), 'direct_mention, mention, direct_message', function (bot, message) {
    joke(bot, message);
});

controller.hears(new RegExp('^.*weather.*$', 'i'), 'direct_mention, mention, direct_message', function (bot, message) {
    var split = message.text.split(" ");
    var hook = 'in';
    var hook_found = false;
    for (var i = 0; i < split.length; i++) {
        if (split[i] === hook && i+1 < split.length) {    
            weather(bot, message, split[i+1], null);
            hook_found = true;
            break;
        }
    }
    if (!hook_found) weather(bot, message, null, null);
});

controller.hears(['hi', 'hello', 'hey', 'Hi', 'Hello', 'Hey'], 'direct_mention, mention, direct_message', function (bot, message) {
    greetings(bot, message);
});

/**
 * Any un-handled direct mention gets a reaction and a pat response!
 */
controller.on('direct_message, mention, direct_mention', function (bot, message) {
    console.log(message);

    bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
        }, function (err) {
    if (err) {
       console.log(err)
    }
    bot.reply(message, 'I heard you loud and clear boss.');
    });
});

/**
 * ===================
 * Slash Commands
 * ===================
 */ 

controller.on('slash_command', function(bot, message) {
    bot.replyAcknowledge();
    // console.log('SLASH MESSAGE ', message);

    switch (message.command) {
        case "/echo":
            bot.replyPrivate(message, 'ECHO! Echo! echo! echo...');
            break;
        case "/msgall":
            bot.replyPrivate(message, 'I\'m on it! Messaging all channels ...');
            var channelTypes = {types: 'public_channel, private_channel',};
            postToChannels(bot, message, channelTypes);
            break;
        case "/msgpublic":
            bot.replyPrivate(message, 'I\'m on it! Messaging public channels ...');
            postToChannels(bot, message, {});
            break;
        case "/weather":
            var message_options = message.text.split(" ");
            // console.log(message_options);
            weather(bot, message, message_options[0], message_options[1]);
            break;
        default:
            bot.replyPrivate(message, 'Did not recognize that command, sorry!');
    }
});

function postToChannels(bot, message, channelTypes) {
    bot.api.conversations.list(channelTypes, function(err, response) {
        if (err) {
            console.log('Problem with getting list of channels: ', err);
        } else {
            response.channels.forEach(function(channel) {
                // console.log(channel.id); 
                var message_to_channel = {
                    channel: channel.id,
                    text: message.text,
                };
                bot.api.chat.postMessage(message_to_channel, function(err, response) {
                    if (err) console.log(err);
                });
            });
        }
    });
}

/**
 * =======================
 * Core Message Functions
 * =======================
 */ 

function joke(bot, message) {
    switch (randomInt(0, 3)) {
        case 0:
            bot.reply(message, 'This one is hilarious!');
            break;
        case 1:
            bot.reply(message, 'Oh, this one is a gut-wrencher!');
            break;
        case 2: 
            bot.reply(message, 'This one\'s a personal favourite!');
            break;
        default:
            bot.reply(message, 'Here\'s a joke!');
    }

    axios({
        url: "https://icanhazdadjoke.com/",
        method: 'get',
        headers: {"Accept" : "application/json",
                "User-Agent" : "Slackbot for fun (https://github.com/LyMarco/goliath-bot)"
            }
    })
    .then(response => {
        // console.log(response.data.joke);
        bot.reply(message, response.data.joke);
    })
    .catch(error => {
        console.log(error);
    })
}

function weather(bot, message, city, countryCode) {
    if (city == null || city === '') {
        city = 'Toronto';
        countryCode = 'CA';
    }

    // console.log('https://api.openweathermap.org/data/2.5/find?q='+city+'&units=metric&appid=' + process.env.OWM_API_KEY);

    axios({
        url: 'https://api.openweathermap.org/data/2.5/find?q='+city+','+countryCode+'&units=metric&appid=' + process.env.OWM_API_KEY,
        method: 'get',
    })
    .then(response => {
        var weather_data = response.data.list[0];

        if (weather_data == null) {
            bot.reply(message, 'We couldn\'t find that city!');
            throw "Error: No returning weather data";
        }

        var weather_info = 'Right now in ' + weather_data.name + ', ' + weather_data.sys.country + ' we\'re experiencing ' + weather_data.weather[0].description;
        weather_info += '\n The current temperature is ' + weather_data.main.temp + ' degrees!';
        weather_info += '\n Humidity is at ' + weather_data.main.humidity + '%, and wind speed is ' + msTokph(weather_data.wind.speed) + 'km/h!';

        // console.log(response.data);
        // console.log(weather_data.main);
        bot.reply(message, weather_info);
    })
    .catch(error => {
        console.log(error);
    })
}

async function cheer(bot, message) {
    var cheerNumber = randomInt(0, 9);

    // await cheerHelper(bot, message);
    
    bot.reply(message, 'Oh, here\'s a good one!'); 
    
    fs.readFile('Cheers/' + cheerNumber + '.txt', 'utf8', (err, data) => {
        if (err) console.log(err);
        bot.reply(message, data);
    });
   
}

// I'm really bad at async
async function cheerHelper(bot, message) {

    switch (randomInt(0, 3)) {
        case 0:
            // return 'Oh, here\'s a good one!';
            bot.reply(message, 'Oh, here\'s a good one!');
            break;
        case 1:
            // return 'This cheer\'s pretty hype!';
            bot.reply(message, 'This cheer\'s pretty hype!');
            break;
        case 2: 
            // return 'This one\'s a personal favourite!';
            bot.reply(message, 'This one\'s a personal favourite!');
            break;
        default:
            // return 'Here\'s a cheer!';
            bot.reply(message, 'Here\'s a cheer!');
    }
}

function greetings(bot, message) {
    bot.reply(message, 'Hello!');
}

/**
 * =============================
 * ==== Core bot logic end =====
 * =============================
 */

/**
 * ================
 * Helper functions
 * ================
 */

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low)
}

function msTokph(ms) {
    return (ms*3.6).toFixed(2);
}