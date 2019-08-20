/**
 * A Bot for Slack, handles slash commands. Forked from slackapi/easy-peasy-bots
 */

// For development, using a .env file to quickly deploy environment variables (ty Code Realm)
// require('dotenv').config(); 

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
        process.env.CLIENT_SIGNING_SECRET, token, config, onInstallation);
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

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!");
    // console.log(message);
});

/**
 * ========================
 * Handling direct messages
 * ========================
 */

controller.hears('hello', 'direct_message', function (bot, message) {
    bot.reply(message, 'Hello!');
});

controller.hears('joke', 'direct_message', function(bot, message) {
    // bot.reply(message, 'Here\'s a joke!');
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
});

controller.hears('cheer', 'direct_message', function(bot, message) {
    var cheerNumber = randomInt(0, 9);

    bot.reply(message, 'Oh, here\'s a good one!');
    
    // create instance of readline
    let rl = readline.createInterface({
        input: fs.createReadStream('Cheers/' + cheerNumber + '.txt')
    })

    let lineNo = 0;
    rl.on('line', function(line) {
        if (lineNo == 0) {
            bot.reply(message, 'It\'s called ' + line + '!');
        } else {
            bot.reply(message, line);    
        }
        lineNo++;
    }) 
});

/**
 * Any un-handled direct mention gets a reaction and a pat response!
 */
controller.on('direct_message, mention, direct_mention', function (bot, message) {
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
    // bot.replyAcknowledge();
    switch (message.command) {
        case "/echo":
            bot.replyPrivate(message, 'ECHO! Echo! echo! echo...');
            break;
        case "/notifyall":
            bot.replyPrivate(message, 'I\'m on it!');
            bot.sendWebhook({
                text: message.text,
            } , function (err, response) {
                if (err) {
                    console.log('webhook error', err);
                }
            });
            break;
        default:
            bot.replyPrivate(message, 'Did not recognize that command, sorry!');
    }
});

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