const { GraphQLClient, gql } = require('graphql-request');
const commander = require('commander');
const Twitter = require('twitter');

// check README.md for instructions how to setup .env file.
require('dotenv').config();

commander
  .version('1.0.0', '-v, --version')
  .usage('[OPTIONS]...')
  .option('-s, --sessionid <sessionid>', 'specify session ID to pull')
  .option('-t, --tweet', 'send tweet')
  .option('-d, --debug', 'log mode')
  .parse(process.argv);

async function main() {
  
  // which session should we post?
  let sessionId;
  if (commander.sessionid !== undefined) {
    sessionId = commander.sessionid;
  }
  else {
    // fetch the session IDs to tweet from our prepared list
    let response = await fetch("https://opensit.net/sessions/tweet_sessions.json");
    let json = await response.json()
    
    // calc access index (days since list created)
    // let date2 = new Date(2023,1,19,0,0,0,0);
    // console.log("date: " + date2.toDateString());
    let index = getDaysSince(json.created_at, Date.now());
    index %= json.sessions.length; // prevent overrun
    sessionId = json.sessions[index].id;
    
    if (commander.debug) {
      console.log("index: " + index);
      console.log("session ID: " + sessionId);
    }
  }

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

  // generate and post tweet
  const tweetText = getTweetPost(data.session);
  if (commander.tweet) postTweet(tweetText);

  if (commander.debug) {
    console.log("session data: " + JSON.stringify(data.session));
    console.log("status text:\n" + tweetText);
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
  var twitterClient = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  });
  
  twitterClient.post('statuses/update', { status: post })
  .then(function (tweet) {
    console.log('tweet sent!\n');
    console.log(tweet.text);
    console.log(tweet.entities.hashtags);
  })
  .catch(function(error) {
    throw error;
  });
}

function getTweetPost(session) {
  const sessionDate = new Date(session.event.date);
  const insideTrack = getInsideTrackIdText(
    session.event.insideTrack.twitterId,
    session.event.insideTrack.hashtag
  );
  const speakers = getSpeakerId(session.speakers);

  return getTweetText(
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

// compose tweet text
function getTweetText(speakers, title, insideTrack, hashtag, year, topics) {
  const url = `https://opensit.net/${getSlug(hashtag)}/${year}/${ getSlug(title) }`;
  var tweet =  "A session by "+speakers+" at "+insideTrack+" "+year+ ": "+title+" "+url;
  topics.forEach(topic => {
    tweet += " #"+topic.replace(/_/g, '');
  });
  return tweet;
}

// copy from helper.js
function getSlug(title) {
  title = title.replace(/^\s+|\s+$/g, ''); // trim
  title = title.toLowerCase();

  // remove accents, swap ñ for n, etc
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

main();