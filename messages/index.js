/*-----------------------------------------------------------------------------
This template demonstrates how to use Waterfalls to collect input from a user using a sequence of steps.
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-waterfall
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


bot.dialog('/', [
    function (session) {
        builder.Prompts.text(session, "Hello... What's your name?");
    },
    function (session, results) {
        session.userData.name = results.response;
        locationDialog.getLocation(session, {
          prompt: "What is your location",
          useNativeControl: true,
          reverseGeocode: true
        });
    },
    function (session, results) {
        session.userData.place = results.response;
        builder.Prompts.number(session, "Hi " + results.response + ", How many people are affected?");
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
        builder.Prompts.choice(session, "What are the major needs", ["Food", "Shelter", "Water", "Other"]);
        //TODO this needs to be a multi-select question
    },
    function (session, results) {
        session.userData.needs = results.response.entity;
        session.send("Thanks " + session.userData.name +
                    " In " + session.userData.place.locality + session.userDate.place.region +
                    " People Affected: " + session.userData.pplaffected +
                    " Injured: " + session.userData.pplinjured +
                    " Deceased: " + session.userData.ppldead +
                    " Major Needs: " + session.userData.needs +  ".");
    }
]);

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
