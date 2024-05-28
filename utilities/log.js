const { EmbedBuilder } = require('discord.js');

exports.log = async (title, desc, channel, image=null) => {
    let logEmbed = new EmbedBuilder()

    if(!image){
        logEmbed.setTitle(title).setDescription(desc)
    } else {
        logEmbed.setTitle(title).setDescription(desc).setThumbnail(image)
    }

    channel.send({embeds: [logEmbed]})
}