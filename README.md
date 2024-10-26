# OpenSIT Social Bot

Post a status update note to Nostr, promoting a random OpenSIT session.

## Setup

make sure your .env file contains the following variables

    // Nostr private key and relay URL (default: wss://relay.damus.io)
    NOSTR_NSEC=
    NOSTR_RELAY_URL=

    // GraphCMS public API endpoint & auth token
    GRAPHCMS_ENDPOINT=
    GRAPHCMS_AUTHTOKEN=


## Usage

type `node opensit-social.js -h`

    Usage: opensit-social [OPTIONS]...

    Options:
      -v, --version                output the version number
      -s, --sessionid <sessionid>  specify session ID to pull
      -p, --post                   post note
      -d, --debug                  log mode
      -h, --help                   output usage information
