const { request } = require('graphql-request');
const fs = require('fs')
const aws = require("aws-sdk");
const ddoc = require("dynamodb-doc");

const fileName = 'sessions.json'

// query ID of all sessions in GraphCMS
// query a session by given SIT hashtag
const queryAllSessions = `query allSessions {
  sessions {
    id
    title
    recordingUrl
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

   
const getAllSessions = async() => {
  const data = await request(process.env.GRAPHCMS_ENDPOINT, queryAllSessions)
  return data
  // const rand = Math.floor(Math.random() * data.sessions.length)
  // sessionId = data.sessions[rand].id
  // console.log(sessionId)
}

// query a session by given speaker last name
const querySessionBySpeaker = `query sessionBySpeaker($speaker: String) {
  sessions(where: {speakers_every: {lastName_contains: $speaker}}) {
    id
    title
    recordingUrl
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

const getBySit = function() {
  return false
}

// query a session by given SIT hashtag
const querySessionBySit = `query sessionBySit($sit: String) {
  insideTracks(where: {hashtag: $sit}) {
    events {
      date
      sessions {
        id
        title
        speakers {
          firstName
          lastName
          twitterId
        }
      }
    }
    hashtag
    twitterId
  }
}`

const getBySpeaker = async(speaker) => {
  const data = await request(process.env.GRAPHCMS_ENDPOINT, querySessionBySpeaker, { speaker: speaker })
  console.log(data)
  return data
}

const update = function() {
  // read full list of sessions from CMS
  // update tweet state from local storage
  // write sessions state to local storage
}

const load = () => {
  try {
    const dataBuffer = fs.readFileSync(fileName)
    const dataJSON = dataBuffer.toString()
    return JSON.parse(dataJSON)
  }
  catch (e) {
    return []
  }
}

const save = (sessions) => {
  const dataJSON = JSON.stringify(sessions)
  fs.writeFileSync(fileName, dataJSON)
}

module.exports = {
  update: update,
  getBySit: getBySit,
  getBySpeaker: getBySpeaker,
  getAllSessions: getAllSessions
}