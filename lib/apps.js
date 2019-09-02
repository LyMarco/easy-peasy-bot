/**
 * Helpers for configuring a bot as an app
 * https://api.slack.com/slack-apps
 */

var Botkit = require('botkit');
// const { Botkit } = require('botkit');
// const { SlackAdapter, SlackEventMiddleware, SlackMessageTypeMiddleware } = require('botbuilder-adapter-slack');

function die(err) {
    console.log(err);
    process.exit(1);
}

module.exports = {
    configure: function (port, clientId, clientSecret, clientSigningSecret, token, verifToken, config, onInstallation) {
        /*const adapter = new SlackAdapter({
            clientId: clientId,
            clientSecret: clientSecret,
            clientSigningSecret: clientSigningSecret,
            botToken: token,
            //redirectUri: 'https://hooks.slack.com/services/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',
            //verificationToken: verifToken,
            scopes: ['bot', 'commands'],
        })

        adapter.use(new SlackEventMiddleware());
        adapter.use(new SlackMessageTypeMiddleware());

        const controller = new Botkit({
            adapter: adapter,
            // storage: '',
            webhook_uri: 'https://hooks.slack.com/services/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',
        })*/

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
            retry: true,
            /*incoming_webhook: {
                url: 'https://hooks.slack.com/services/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'
            }*/
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

        return controller;


    }
}
