/**
 * Helpers for configuring a bot as an app
 * https://api.slack.com/slack-apps
 */

var Botkit = require('botkit');

var _bots = {};

function _trackBot(bot) {
    _bots[bot.config.token] = bot;
}

function die(err) {
    console.log(err);
    process.exit(1);
}

module.exports = {
    configure: function (port, clientId, clientSecret, clientSigningSecret, token, config, onInstallation) {
        var controller = Botkit.slackbot(config).configureSlackApp(
            {
                clientId: clientId,
                clientSecret: clientSecret,
                clientSigningSecret: clientSigningSecret,
                scopes: ['bot', 'commands'], //TODO it would be good to move this out a level, so it can be configured at the root level
            }
        );

        // == BOT ==
        var bot = controller.spawn({
            token: token,
            incoming_webhook: {
                url: 'https://hooks.slack.com/services/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'
            }
        });
        bot.startRTM(function (err, bot, payload) {
            if (err) {
                die(err);
            }
            if(onInstallation) onInstallation(bot);
        });
        // == END BOT==

        // == WEB SERVER ==
        controller.setupWebserver(process.env.PORT,function(err,webserver) {
            controller.createWebhookEndpoints(controller.webserver);

            controller.createOauthEndpoints(controller.webserver,function(err,req,res) {
                if (err) {
                    res.status(500).send('ERROR: ' + err);
                } else {
                    res.send('Success!');
                }
            });
        });
        // == END WEB SERVER ==

        /*controller.on('create_bot', function (bot, config) {

            if (_bots[bot.config.token]) {
                // already online! do nothing.
            } else {

                bot.startRTM(function (err) {
                    if (err) {
                        die(err);
                    }

                    _trackBot(bot);

                    if (onInstallation) onInstallation(bot, config.createdBy);
                });
            }
        });

        controller.storage.teams.all(function (err, teams) {

            if (err) {
                throw new Error(err);
            }

            // connect all teams with bots up to slack!
            for (var t  in teams) {
                if (teams[t].bot) {
                    var bot = controller.spawn(teams[t]).startRTM(function (err) {
                        if (err) {
                            console.log('Error connecting app to Slack:', err);
                        } else {
                            _trackBot(bot);
                        }
                    });
                }
            }

        });*/


        return controller;


    }
}
