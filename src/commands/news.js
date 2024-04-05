const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { QuickDB } = require("quick.db");
const { fetchNews } = require("../utils/fetchNews");
const { newsSchema } = require("../schema/newsSchema");

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription("News posts")
        .addChannelOption((option) =>
            option.setName("channel")
                .setDescription("Choose a channel")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("category")
                .setDescription("Choose a category")
                .setRequired(true)
                .addChoices(
                    { name: 'Gaming', value: 'gaming' },
                    { name: 'Entertainment', value: 'entertainment' },
                    { name: 'TV & Movies', value: 'tv-movies' },
                    { name: 'Esports', value: 'esports' },
                    { name: 'Tech', value: 'tech' },
                )),
    async execute(interaction) {
        try {
            
            if (!interaction.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
                return await interaction.reply({ content: "Bu komutu kullanma izniniz yok.", ephemeral: true });
            }

            const channel = interaction.options.getChannel("channel");
            const category = interaction.options.getString("category");

            /* Kullanici yetkisi kontrol et
            if(!interaction.guild?.members.me?.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                        .setColor("#2F3136")
                         .setAuthor({ name: interaction.user.tag, iconURL: `${interaction.user.avatarURL() || client.user?.avatarURL()}` })
                        .setTitle(`İşlem başarısız`)
                        .setDescription(`> <:kirmizi:1064928050363519038> **|** Deprem bildirimlerin gönderilmesi için bota yetki vermeniz gerekiyor.`)
                        .setTimestamp()
                    ],
                })
    
                return;
            }*/

            if (!channel || !category) {
                console.log("channel ve il değerleri alınmadı");
            }

            const embed = new EmbedBuilder()
                .setColor("#ff0080")
                .setAuthor({ name: `${interaction.user.globalName || interaction.user.username || "bulunamadı"} - News Channel`, iconURL: interaction.user.displayAvatarURL() })
                 .setDescription("> Server information has been updated.")
                .setFooter({ text: `© Powered by News#6259` });
            interaction.reply({ embeds: [embed] });

            const data = await fetchNews(category);
            console.log(data);

            const newsE = await newsSchema.findOne({ guild: interaction.guild?.id });

            if (!newsE) {
                const news = new newsSchema({
                    guild: interaction.guild?.id,
                    channels: [{ channel: channel.id, category: category, previousTimePublished: data.timePublished }]
                });
                await news.save();
            } else {
                newsE.channels.push({ channel: channel.id, category: category, previousTimePublished: data.timePublished });
                await newsE.save();

                //eger ayni kanalda olmasini istemezsek bunu kullanabiliriz
                /*const existingChannelIndex = newsE.channels.findIndex(entry => entry.channel === channel.id);
                if(existingChannelIndex !== -1) {
                    newsE.channels[existingChannelIndex].category = category;
                } else {
                    newsE.channels.push({ channel: channel.id, category: category });
                }
                await newsE.save();*/
            }
            
            channel.send({
                embeds: [
                  new EmbedBuilder()
                    .setAuthor({
                      name: `Dexerto - ${category}`,
                      url: `https://www.dexerto.com/${data.href}`,
                      iconURL: "https://pbs.twimg.com/profile_images/1714301666445402112/5U5myYFv_400x400.jpg",
                    })
                    .setDescription(`**${data.heading}** \n\n${data.timePublished}`)
                    .setImage(data.img.src)
                    .setColor("#ff0080"),
                ]
              }).then(sentMessage => {
                sentMessage.startThread({
                  name: "Comments",
                  autoArchiveDuration: 60,
                  reason: 'Comments for news post\'i',
                });
              });

        } catch (error) {
            console.error("Error fetching election results:", error);
        }
        
    },
};
