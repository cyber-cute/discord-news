const { Client, Collection, EmbedBuilder, ActivityType } = require('discord.js');
const { readdirSync } = require('node:fs');
const { default: axios } = require('axios');
const logger = require('./modules/logger');
const { localize } = require('./modules/localization');
const { ownerId, developerIds } = require('../config');

const { fetchNews } = require('./utils/fetchNews');
const { newsSchema } = require('./schema/newsSchema');
const news = require('./commands/news');

const client = new Client({
    intents: [
        'Guilds'
    ]
});

client.commands = new Collection();

const commandFiles = readdirSync('src/commands').filter(file => file.endsWith('.js'));

["database"].forEach((file) => {
    require(`./utils/${file}`)(client);
});

  if (commandFiles.length > 0) logger('info', 'COMMAND', 'Found', commandFiles.length.toString(), 'commands');
else logger('warning', 'COMMAND', 'No commands found');

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);

    client.commands.set(command.data.name, command);

    logger('success', 'COMMAND', 'Loaded command', command.data.name);
};

client.on('ready', () => {
    logger('info', 'BOT', 'Logged in as', client.user.tag);
    logger('info', 'COMMAND', 'Registering commands');

    client.user.setPresence({
        activities: [{ name: `/setup | News`, type: ActivityType.Watching }],
        status: 'dnd',
      });
    axios.put(`https://discord.com/api/v10/applications/${client.user.id}/commands`, client.commands.map(command => command.data.toJSON()), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
        }
    }).then(() => logger('success', 'COMMAND', 'Registered commands')).catch(error => logger('error', 'COMMAND', 'Error while registering commands', `${error.response.status} ${error.response.statusText}\n`, JSON.stringify(error.response.data, null, 4)));

    const newsControl = async (guild, category) => {
        let newsDb = await newsSchema.findOne({ guild: guild?.id });
        
        if(newsDb) {
            newsDb.channels.forEach(async channel => {

                let previousTimePublished = channel?.previousTimePublished;

                let channels = guild.channels.cache.get(channel.channel);
                let newsData = await fetchNews(channel.category);

                if (channel) {
                    if (newsData) {
                        if (previousTimePublished != newsData.timePublished){
                            console.log("New news published");

                            channels.send({
                                embeds: [
                                  new EmbedBuilder()
                                    .setAuthor({
                                      name: `Dexerto - ${channel.category}`,
                                      url: `https://www.dexerto.com/${newsData.href}`,
                                      iconURL: "https://pbs.twimg.com/profile_images/1714301666445402112/5U5myYFv_400x400.jpg",
                                    })
                                    .setDescription(`**${newsData.heading}** \n\n${newsData.timePublished}`)
                                    .setImage(newsData.img.src)
                                    .setColor("#ff0080"),
                                ]
                              }).then(sentMessage => {
                                sentMessage.startThread({
                                  name: "Comments",
                                  autoArchiveDuration: 60,
                                  reason: 'Comments for news post\'i',
                                });
                              });

                            await newsSchema.findOneAndUpdate(
                                {
                                  guild: guild?.id,
                                  channels: {
                                    $elemMatch: {
                                      category: channel.category // Kategori kontrolü ekleyin
                                    }
                                  }
                                },
                                {
                                  $set: {
                                    "channels.$.previousTimePublished": newsData.timePublished
                                  }
                                }
                              );


                        } else {
                            console.log("No new news published");
                        }
                        
                    } else {
                        console.log("WHAT MEANINGN NO NEWS DATA");
                    }
                } else {
                    console.log(`Channel not found: ${newsDb.guild}`);
                }
            });
        } else {
            console.log("onca if else bloku icerinde eger burada sorun ciktiysa yazacagin api'e tukureyim");
        }
    }

    const control = () => {
        client.guilds.cache.forEach((guild) => {
            newsControl(guild);
        });
    }

    setInterval(() => control(), 9000);
});



client.on('interactionCreate', async interaction => {
    if (interaction.isCommand() || interaction.isContextMenuCommand()) {
        logger('debug', 'COMMAND', 'Received command', `${interaction.commandName} (${interaction.commandId})`, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            logger('warning', 'COMMAND', 'Command ', interaction.commandName, 'not found');

            return interaction.reply({
                content: localize(interaction.locale, 'NOT_FOUND', 'Command'),
                ephemeral: true
            });
        };
        if (command.category === 'Owner' && interaction.user.id !== ownerId) {
            logger('debug', 'COMMAND', 'Command', interaction.commandName, 'blocked for', interaction.user.tag, 'because it is owner only');

            return interaction.reply({
                content: localize(interaction.locale, 'OWNER_ONLY'),
                ephemeral: true
            });
        };
        if (command.category === 'Developer' && !developerIds.includes(interaction.user.id) && interaction.user.id !== ownerId) {
            logger('debug', 'COMMAND', 'Command', interaction.commandName, 'blocked for', interaction.user.tag, 'because it is developer only');

            return interaction.reply({
                content: localize(interaction.locale, 'DEVELOPER_ONLY'),
                ephemeral: true
            });
        };

        try {
            await command.execute(interaction);
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing command:', `${error.message}\n`, error.stack);

            return interaction.reply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'command', error.message),
                ephemeral: true
            }).catch(() => interaction.editReply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'command', error.message)
            }));
        };
    } else if (interaction.isMessageComponent()) {
        logger('debug', 'COMMAND', 'Received message component', `${interaction.customId} (${interaction.componentType})`, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        try {
            switch (interaction.customId) {
                default: {
                    logger('warning', 'COMMAND', 'Message component', interaction.customId, 'not found');

                    return interaction.reply({
                        content: localize(interaction.locale, 'NOT_FOUND', 'Message component'),
                        ephemeral: true
                    });
                }
            };
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing message component:', `${error.message}\n`, error.stack);

            return interaction.reply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'message component', error.message),
                ephemeral: true
            }).catch(() => interaction.editReply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'message component', error.message)
            }));
        }
    } else if (interaction.isModalSubmit()) {
        logger('debug', 'COMMAND', 'Received modal submit', interaction.customId, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        try {
            switch (interaction.customId) {
                default: {
                    logger('warning', 'COMMAND', 'Modal', interaction.customId, 'not found');

                    return interaction.reply({
                        content: localize(interaction.locale, 'NOT_FOUND', 'Modal'),
                        ephemeral: true
                    });
                }
            };
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing modal:', `${error.message}\n`, error.stack);

            return interaction.reply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'modal', error.message),
                ephemeral: true
            }).catch(() => interaction.editReply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'modal', error.message)
            }));
        };
    };
});

client.login(process.env.DISCORD_TOKEN);