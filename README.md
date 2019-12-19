# OpenSIT Twitter Bot

Post a Twitter status update, promoting a random OpenSIT session.

## Setup

make sure your .env file contains the following variables

    // Twitter app tokens
    TWITTER_CONSUMER_KEY=
    TWITTER_CONSUMER_SECRET=
    TWITTER_ACCESS_TOKEN_KEY=
    TWITTER_ACCESS_TOKEN_SECRET=

    // GraphCMS public API endpoint
    GRAPHCMS_ENDPOINT=


## Usage

type `node opensit-twitter.js -h`

    Usage: opensit-twitter [OPTIONS]...

    Options:
      -v, --version                output the version number
      -s, --sessionid <sessionid>  specify session ID to pull
      -t, --tweet                  send tweet
      -d, --debug                  log mode
      -h, --help                   output usage information
