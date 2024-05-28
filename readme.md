# Petbot
A discord bot by RustedAperture 2024

---

## Setup
1. In root directory create `config.json` with the below code
```json
{
    "token": "",
    "clientId": "",
    "guildId": ""
}
```
2. Run `node deploy-commands.js` to register the commands in the guild
3. If wanting to run in docker use `docker build -t petbot .`
4. Run the docker container `docker run -d --name petbot petbot`
5. In a guild channel use the `/setup` command to set the nickname, logging channel and the default pet image.