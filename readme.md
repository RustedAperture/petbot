# Petbot

A discord bot by RustedAperture 2024

## Setup

**NOTE**: This bot is to be setup on your own. It does support running on multiple guilds at once but I do not have the proccessing power to host it.

### Local

1. In root directory create `config.json` with the below code

```json
{
  "token": "",
  "clientId": "",
  "guildId": ""
}
```

2. Run `npm run dev` to register the global commands and start the bot
3. In a guild channel use the `/setup` command to set the nickname, logging channel and the default pet image.

### Docker

This is currently untested but is how I run the bot on my server. There is an example docker compose file that should be of use to you if you wish to run it this way.

1. If wanting to run in docker use `docker build -t petbot .`
2. Run the docker container `docker run -d --name petbot petbot`
3. The container will automatically register the global commands and start the bot in tui mode but interaction is disabled, meaning you will only be able to view the tui.

## TUI

To run the TUI version of the bot, use the command `npm run dev:tui`. This will start the bot in a terminal interface, allowing for easier debugging and interaction.

The tui is currently very basic and does not support any commands. Interaction is via the arrow keys to move around the log box.
