/*-----------------------------------------------------------------------------
Waterfall Damage Bot
-----------------------------------------------------------------------------*/
"use strict";

//local env testing
require('dotenv-extended').load();

var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');

var locationDialog = require('botbuilder-location');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));
bot.library(locationDialog.createLibrary(process.env['BingKey']));
var place;
var disastertype;

bot.dialog('/', [
    function (session) {
        builder.Prompts.text(session, "Hello... What's your name?");
    },
    function (session, results) {
        session.userData.name = results.response;
        locationDialog.getLocation(session, {
          prompt: "What is your location?",
          useNativeControl: true,
          reverseGeocode: true,
			           skipFavorites: true,
			           skipConfirmationAsk: true,
          requiredFields:
                locationDialog.LocationRequiredFields.locality |
                locationDialog.LocationRequiredFields.region |
                locationDialog.LocationRequiredFields.country
        });
    },
    function (session, results) {
        place = results.response;
        builder.Prompts.choice(session, "Hi " + session.userData.name + ", What kind of disaster happened?", ["Flood", "Fire", "Storm", "Earthquake", "Other"]);
    },
    function (session, results) {
        session.userData.disastertype = results.response;
        builder.Prompts.number(session, "How many people are affected?");
    },
    function (session, results) {
        session.userData.pplaffected = results.response;
        builder.Prompts.number(session, "How many people are injured?");
    },
    function (session, results) {
        session.userData.pplinjured = results.response;
        builder.Prompts.number(session, "How many people are dead?");
    },
    function (session, results) {
        session.userData.ppldead = results.response;
        builder.Prompts.choice(session, "What are the major needs", ["Food", "Shelter", "Water", "Medicine", "Other"]);
    },
    function (session, results) {
        session.userData.needs = results.response.entity;

        // create the card based on selection
        var card = createCard(session);
        console.log('creating card');
        // attach the card to the reply message
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);

        // session.endDialog();
    }

]);

function createCard(session) {
    return new builder.ReceiptCard(session)
        .title('Damage & Needs Assessment')
        .facts([
            builder.Fact.create(session, getDateTime()),
            builder.Fact.create(session, place.locality + ', ' + place.region)
            // builder.Fact.create(session, disastertype)
        ])
        .items([
            builder.ReceiptItem.create(session, session.userData.pplaffected, 'People Affected')
                .image(builder.CardImage.create(session, 'http://mw1.google.com/crisisresponse/icons/un-ocha/people_affected_population_64px_icon.png')),
            builder.ReceiptItem.create(session, session.userData.pplinjured, 'Injured')
                .image(builder.CardImage.create(session, 'http://mw1.google.com/crisisresponse/icons/un-ocha/people_injured_64px_icon.png')),
            builder.ReceiptItem.create(session, session.userData.ppldead, 'Deceased')
                .image(builder.CardImage.create(session, 'http://mw1.google.com/crisisresponse/icons/un-ocha/people_dead_64px_icon.png'))
        ]);
        // TODO make a link to the dashboard
        // .buttons([
        //     builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/pricing/', 'More Information')
        //         .image('https://raw.githubusercontent.com/amido/azure-vector-icons/master/renders/microsoft-azure.png')
        // ]);
        session.endDialog();
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    // var sec  = date.getSeconds();
    // sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "/" + month + "/" + day + " - " + hour + ":" + min;

}

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = { default: connector.listen() }
}
