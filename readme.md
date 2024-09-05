# Petbot
A discord bot by RustedAperture 2024

## Setup

**NOTE**: This bot is to be setup on your own. It does support running on multiple guilds at once but I do not have the proccessing power to host it.

1. In root directory create `config.json` with the below code
```json
{
    "token": "",
    "clientId": "",
    "guildId": ""
}
```
2. Run `node deploy-commands.js` to register the global commands
3. If wanting to run in docker use `docker build -t petbot .`
4. Run the docker container `docker run -d --name petbot petbot`
5. In a guild channel use the `/setup` command to set the nickname, logging channel and the default pet image.