const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');


const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the next events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = res.data.items;
  return events.data.items;
  // const events = res.data.items;
  // if (!events || events.length === 0) {
  //   console.log('No upcoming events found.');
  //   return;
  // }
  // console.log('Upcoming 10 events:');
  // events.map((event, i) => {
  //   const start = event.start.dateTime || event.start.date;
  //   console.log(`${start} - ${event.summary}`);
  // });
}


// Refer to the Node.js quickstart on how to setup the environment:
// https://developers.google.com/calendar/quickstart/node
// Change the scope to 'https://www.googleapis.com/auth/calendar' and delete any
// stored credentials.

const session = {
    'summary': 'Nueva reunión',
    'location': 'Av. Sta. Fe 911 Piso 1 A, C1059 Cdad. Autónoma de Buenos Aires',
    'description': 'Sesión de fotos',
    'start': {
      'dateTime': '2024-08-05T09:00:00-03:00',
      'timeZone': 'America/Argentina/Buenos_Aires',
    },
    'end': {
      'dateTime': '2024-08-05T11:00:00-03:00',
      'timeZone': 'America/Argentina/Buenos_Aires',
    },
    // 'attendees': [
    //   {'email': 'lpage@example.com'},
    //   {'email': 'sbrin@example.com'},
    // ],
    'colorId': '4',
    'reminders': {
      'useDefault': false,
      'overrides': [
        {'method': 'email', 'minutes': 24 * 60},
        {'method': 'popup', 'minutes': 10},
      ],
    },
  };

  // Buscar eventos existentes
  async function createEvent(auth){
    const calendar = google.calendar({version: 'v3', auth});
    const existingEvents = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    singleEvents: true,
     orderBy: 'startTime',
  });

  const duplicate = existingEvents.data.items.find(event => {
    return event.start.dateTime === session.start.dateTime || event.end.dateTime === session.end.dateTime;
  });

  if (duplicate) {
    console.log('Event already exists');
    return;
  } else {    
    const calendar = google.calendar({version: 'v3', auth});
    calendar.events.insert({
        auth: auth,
        calendarId: 'primary',
        resource: session,
    }, function(err, event) {
        if (err) {
            console.log('There was an error contacting the Calendar service: ' + err);
            return;
        }
        console.log('Event created: %s', event.htmlLink);
    });
}
}


authorize().then(listEvents).catch(console.error);
// authorize().then(createEvent).catch(console.error);