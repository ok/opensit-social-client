const { GraphQLClient } = require('graphql-request');
const commander = require('commander');
const { TwitterApi } = require('twitter-api-v2');
const WebSocket = require('ws');
global.WebSocket = WebSocket;

if (typeof CustomEvent !== 'function') {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(event, params) {
      params = params || { bubbles: false, cancelable: false, detail: null };
      super(event, params);
      this.detail = params.detail;
    }
  };
}

// check README.md for instructions how to setup .env file.
require('dotenv').config();

const RELAY_URL = process.env.NOSTR_RELAY_URL || 'wss://relay.damus.io';
const RELAY_WAIT_TIME = parseInt(process.env.NOSTR_RELAY_WAIT_TIME, 10) || 2000;

function debugLog(...args) {
  if (commander.debug) {
    console.log('[DEBUG]', ...args);
  }
}

commander
  .version('1.0.0', '-v, --version')
  .usage('[OPTIONS]...')
  .option('-s, --sessionid <sessionid>', 'specify session ID to pull')
  .option('-p, --post', 'post note')
  .option('-d, --debug', 'log mode')
  .parse(process.argv);

async function main() {
  try {
    debugLog('Starting main function');
    // which session should we post?
    let sessionId;
    if (commander.sessionid !== undefined) {
      sessionId = commander.sessionid;
    }
    else {
      // fetch the session IDs from our prepared list
      let response = await fetch("https://opensit.net/sessions/tweet_sessions.json");
      let json = await response.json()
      
      // calc access index (days since list created)
      // let date2 = new Date(2023,1,19,0,0,0,0);
      // console.log("date: " + date2.toDateString());
      let index = getDaysSince(json.created_at, Date.now());
      index %= json.sessions.length; // prevent overrun
      sessionId = json.sessions[index].id;
    }
      
    debugLog("session ID:", sessionId);

    // query session details from our headless CMS
    const graphQLClient = new GraphQLClient(process.env.GRAPHCMS_ENDPOINT, {
      headers: {
        authorization: 'Bearer '+process.env.GRAPHCMS_AUTHTOKEN,
      },
    })
    
    const querySession = `query getSession($id: ID!) {
      session(where: {id: $id}) {
        id
        title
        speakers {
          firstName
          lastName
          twitterId
        }
        topics
        event {
          date
          insideTrack {
            hashtag
            twitterId
          }
        }
      }
    }`
    const data = await graphQLClient.request(querySession, { id: sessionId })
    debugLog(data);

    // generate and post note
    const noteContent = getNote(data.session);
    debugLog('Note content generated:', noteContent);

    if (commander.post) {
      debugLog('Attempting to post note');
      await postNote(noteContent);
      debugLog('Note posting completed');
    }

    if (commander.debug) {
      debugLog('Note text:');
      debugLog(noteContent);
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// credits: https://stackoverflow.com/questions/542938
function getDaysSince(firstDate, secondDate) {
  // Take the difference between the dates and divide by milliseconds per day.
  // Round to nearest whole number to deal with DST.
  return Math.round((secondDate-firstDate)/(1000*60*60*24));
}

function getInsideTrackIdText(twitterId, hashtag) {
  return (twitterId !== null && twitterId.length != 0) ? "@"+twitterId : "#"+hashtag;
}

function postTweet(post) {
  const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
  debugLog(twitterClient);

  const rwClient = twitterClient.readWrite;
  debugLog(rwClient);

  // twitterClient.post('statuses/update', { status: post })
  rwClient.v2.tweet({ post })
  .then(function (post) {
    console.log('post sent!\n');
    console.log(post.text);
    console.log(post.entities.hashtags);
  })
  .catch(function(error) {
    throw error;
  });
}

async function postNote(content) {
  try {
    debugLog('Starting postNote function');
    const nostrify = await import('@nostrify/nostrify');
    const signer = new nostrify.NSecSigner(process.env.NOSTR_NSEC);
    const pubkey = await signer.getPublicKey();
    debugLog('Public key:', pubkey);

    const event = {
      kind: 1,
      pubkey: pubkey,
      content: content,
      created_at: Math.floor(Date.now() / 1000),
      tags: []
    };
    debugLog('Event created:', event);

    const signedEvent = await signer.signEvent(event);
    debugLog('Event signed');

    const relay = new nostrify.NRelay1(RELAY_URL);
    debugLog('Relay created, URL:', RELAY_URL);

    debugLog(`Waiting for ${RELAY_WAIT_TIME}ms before publishing`);
    await new Promise(resolve => setTimeout(resolve, RELAY_WAIT_TIME));

    const publishResult = await relay.event(signedEvent);
    debugLog('Event published, result:', publishResult);

    debugLog(`Waiting for ${RELAY_WAIT_TIME}ms after publishing`);
    await new Promise(resolve => setTimeout(resolve, RELAY_WAIT_TIME));

    await relay.close();
    debugLog('Relay connection closed');

    console.log('Note posted successfully!');
    console.log('Note text:', content);
  } catch (error) {
    console.error('Error posting note:', error);
    throw error;
  }
}

function getNote(session) {
  const sessionDate = new Date(session.event.date);
  const insideTrack = getInsideTrackIdText(
    session.event.insideTrack.twitterId,
    session.event.insideTrack.hashtag
  );
  const speakers = getSpeakerId(session.speakers);

  return getNoteText(
    speakers,
    session.title,
    insideTrack,
    session.event.insideTrack.hashtag,
    sessionDate.getFullYear(),
    session.topics
  )
}

// input is an array of speaker objects,
// including first name, last name and option the Twitter name.
function getSpeakerId(speakers) {
  let speakerId = "";
  // we have one or more speakers in the array
  speakers.forEach((speaker, i) => {
    // we might have to gramatically combine them
    if (i > 0) speakerId += " & ";
    // either add the Twitter compatible speaker name,
    // or his/her first/last name combo.
    speakerId += (speaker.twitterId !== null) 
      ? "@"+speaker.twitterId : (speaker.firstName+" "+speaker.lastName);
  })
  return speakerId;
}

// compose note text
function getNoteText(speakers, title, insideTrack, hashtag, year, topics) {
  const url = `https://opensit.net/${getSlug(hashtag)}/${year}/${ getSlug(title) }`;
  var note =  "A session by "+speakers+" at "+insideTrack+" "+year+ ": "+title+" "+url;
  topics.forEach(topic => {
    note += " #"+topic.replace(/_/g, '');
  });
  return note;
}

// copy from helper.js
function getSlug(title) {
  title = title.replace(/^\s+|\s+$/g, ''); // trim
  title = title.toLowerCase();

  // remove accents, swap  for n, etc
  var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
  var to   = "aaaaaeeeeeiiiiooooouuuunc------";
  for (var i=0, l=from.length ; i<l ; i++) {
    title = title.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  title = title.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return title;
}

main().catch(error => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});
