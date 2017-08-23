/*-----------------------------------------------------------------------------
This Bot uses the Bot Connector Service but is designed to showcase whats
possible on Facebook using the framework. The demo shows how to create a looping
menu how send things like Pictures, Bubbles, Receipts, and use Carousels. It also
shows all of the prompts supported by Bot Builder and how to receive uploaded
photos, videos, and location.

# RUN THE BOT:

    You can run the bot locally using the Bot Framework Emulator but for the best
    experience you should register a new bot on Facebook and bind it to the demo
    bot. You can run the bot locally using ngrok found at https://ngrok.com/.

    * Install and run ngrok in a console window using "ngrok http 3978".
    * Create a bot on https://dev.botframework.com and follow the steps to setup
      a Facebook channel. The Facebook channel config page will walk you through
      creating a Facebook page & app for your bot.
    * For the endpoint you setup on dev.botframework.com, copy the https link
      ngrok setup and set "<ngrok link>/api/messages" as your bots endpoint.
    * Next you need to configure your bots MICROSOFT_APP_ID, and
      MICROSOFT_APP_PASSWORD environment variables. If you're running VSCode you
      can add these variables to your the bots launch.json file. If you're not
      using VSCode you'll need to setup these variables in a console window.
      - MICROSOFT_APP_ID: This is the App ID assigned when you created your bot.
      - MICROSOFT_APP_PASSWORD: This was also assigned when you created your bot.
    * Install the bots persistent menus following the instructions outlined in the
      section below.
    * To run the bot you can launch it from VSCode or run "node app.js" from a
      console window.

# INSTALL PERSISTENT MENUS

    Facebook supports persistent menus which Bot Builder lets you bind to global
    actions. These menus must be installed using the page access token assigned
    when you setup your bot. You can easily install the menus included with the
    example by running the cURL command below:

        curl -X POST -H "Content-Type: application/json" -d @persistent-menu.json
        "https://graph.facebook.com/v2.6/me/thread_settings?access_token=PAGE_ACCESS_TOKEN"

-----------------------------------------------------------------------------*/

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot.
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');

var path = require('path');
var locationDialog = require('botbuilder-location');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bing Maps
//=========================================================

bot.localePath(path.join(__dirname, './locale'));
bot.library(locationDialog.createLibrary(process.env['BingKey']));
var place;

//=========================================================
// Bots Middleware
//=========================================================

// Anytime the major version is incremented any existing conversations will be restarted.
bot.use(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', [
    function (session) {
        // Send a greeting and show help.
        var card = new builder.HeroCard(session)
            .title("Myanmar Red Cross Reporting Bot")
            .text("You can report both assessment and distribution data here.")
            .images([
                 builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/0/05/Myanmar_Red_Cross_Society_logo.png")
            ]);
        var msg = new builder.Message(session).attachments([card]);
        session.send(msg);
        session.send("ဟလို, I'm the Myanmar Red Cross Reborting Bot. I can report data for initial damage assessments and distributions.");
        session.beginDialog('/help');
    },
    function (session, results) {
        // Display menu
        session.beginDialog('/menu');
    },
    function (session, results) {
        // Always say goodbye
        session.send("Ok... See you later!");
    }
]);

bot.dialog('/menu', [
    function (session) {
        builder.Prompts.choice(session, "What would you like to do?", "sitrep|distribution|picture|list|carousel|(quit)");
    },
    function (session, results) {
        if (results.response && results.response.entity != '(quit)') {
            // Launch demo dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.endDialog();
        }
    },
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }
]).reloadAction('reloadMenu', null, { matches: /^menu|show menu/i });

bot.dialog('/help', [
    function (session) {
        session.endDialog("Global commands that are available anytime:\n\n* menu - Exits a demo and returns to the menu.\n* goodbye - End this conversation.\n* help - Displays these commands.");
    }
]);

bot.dialog('/sitrep', [
  function (session) {
      builder.Prompts.text(session, "Hello... What's your name?");
  },
  function (session, results) {
        session.userData.name = results.response;
        locationDialog.getLocation(session, {
          prompt: "What is your location? Tap 'Send Location' to choose your location.",
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
      builder.Prompts.choice(session, "Hi " + session.userData.name + ", What kind of disaster happened?", "flood|earthquake|strong wind|landslide|car accident|(quit)");
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
    console.log(session.userData);
    var msg = new builder.Message(session)
        .attachments([
            new builder.ReceiptCard(session)
                .title("Damage Report")
                .items([
                  builder.ReceiptItem.create(session, '100', 'People Affected')
                    .image(builder.CardImage.create(session, 'http://mw1.google.com/crisisresponse/icons/un-ocha/people_affected_population_64px_icon.png')),
                  builder.ReceiptItem.create(session, '45', 'Injured')
                    .image(builder.CardImage.create(session, 'http://mw1.google.com/crisisresponse/icons/un-ocha/people_injured_64px_icon.png')),
                  builder.ReceiptItem.create(session, '23', 'Deceased')
                    .image(builder.CardImage.create(session, 'http://mw1.google.com/crisisresponse/icons/un-ocha/people_dead_64px_icon.png'))
                ])
                .facts([
                  builder.Fact.create(session, getDateTime()),
                  builder.Fact.create(session, place.locality + ', ' + place.region),
                  builder.Fact.create(session, session.userData.disastertype.entity)
                ])
        ]);
    console.log(msg);

    session.send(msg);


    // .facts([
    //     builder.Fact.create(session, getDateTime()),
    //     // builder.Fact.create(session, place.locality + ', ' + place.region)
    //     // builder.Fact.create(session, disastertype)
    // ])
    // .items([
    //     builder.ReceiptItem.create(session, session.userData.pplaffected, 'People Affected')
    //         .image(builder.CardImage.create(session, 'http://mw1.google.com/crisisresponse/icons/un-ocha/people_affected_population_64px_icon.png')),
    //     builder.ReceiptItem.create(session, session.userData.pplinjured, 'Injured')
    //         .image(builder.CardImage.create(session, 'http://mw1.google.com/crisisresponse/icons/un-ocha/people_injured_64px_icon.png')),
    //     builder.ReceiptItem.create(session, session.userData.ppldead, 'Deceased')
    //         .image(builder.CardImage.create(session, 'http://mw1.google.com/crisisresponse/icons/un-ocha/people_dead_64px_icon.png'))
    // ]);
  }
]);

bot.dialog('/picture', [
    function (session) {
        session.send("You can easily send pictures to a user...");
        var msg = new builder.Message(session)
            .attachments([{
                contentType: "image/jpeg",
                contentUrl: "http://www.theoldrobots.com/images62/Bender-18.JPG"
            }]);
        session.send(msg);
    }
]);

bot.dialog('/cards', [
    function (session) {
        session.send("You can use either a Hero or a Thumbnail card to send the user visually rich information. On Facebook both will be rendered using the same Generic Template...");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Hero Card")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
            ]);
        session.send(msg);

        msg = new builder.Message(session)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Thumbnail Card")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market"))
            ]);
        session.endDialog(msg);
    }
]);

bot.dialog('/receipt', [
    function (session) {
        session.send("You can send a receipts for facebook using Bot Builders ReceiptCard...");
        var msg = new builder.Message(session)
            .attachments([
                new builder.ReceiptCard(session)
                    .title("Recipient's Name")
                    .items([
                        builder.ReceiptItem.create(session, "$22.00", "EMP Museum").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/a/a0/Night_Exterior_EMP.jpg")),
                        builder.ReceiptItem.create(session, "$22.00", "Space Needle").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/7/7c/Seattlenighttimequeenanne.jpg"))
                    ])
                    .facts([
                        builder.Fact.create(session, "1234567898", "Order Number"),
                        builder.Fact.create(session, "VISA 4076", "Payment Method")
                    ])
                    .tax("$4.40")
                    .total("$48.40")
            ]);
        session.endDialog(msg);
    }
]);

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

function damageCard(session) {
    return new builder.ReceiptCard(session)
        .title('Damage Report')
        .facts([
            builder.Fact.create(session, getDateTime()),
            // builder.Fact.create(session, place.locality + ', ' + place.region)
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
}
