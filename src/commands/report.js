import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

const LOGS_CHANNEL_ID = '1252358095116701716';

export const reportCmd = {
    name: 'report',
    description: 'Create a private report ticket',
    async execute(message, args) {
        try {
            const channelName = `report-${message.author.username.toLowerCase()}`;
            const modRole = message.guild.roles.cache.find(role => role.name === "Moderator");

            const reportChannel = await message.guild.channels.create({
                name: channelName,
                type: 0,
                permissionOverwrites: [
                    {
                        id: message.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: message.author.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    },
                    ...(modRole ? [{
                        id: modRole.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    }] : [])
                ],
            });

            const embed = new EmbedBuilder()
                .setTitle('🚨 New Report Ticket')
                .setColor('#ff0000')
                .setDescription('Please provide details about what you want to report. A moderator will assist you shortly.')
                .addFields(
                    { name: 'Reporter', value: message.author.tag },
                    { name: 'Instructions', value: 'Please describe:\n1. What you are reporting\n2. Any evidence (screenshots/links)\n3. Additional details' },
                    { name: 'Commands', value: '`!close` - Close this ticket when finished' }
                )
                .setTimestamp();

            await reportChannel.send({ embeds: [embed] });
            await message.reply(`Your report ticket has been created in ${reportChannel}. Please provide your report details there.`);

            // Set up message collector for !close command
            const filter = m => m.content.toLowerCase() === '!close';
            const collector = reportChannel.createMessageCollector({ filter });

            collector.on('collect', async m => {
                // Log the report to the logs channel
                const logsChannel = message.guild.channels.cache.get(LOGS_CHANNEL_ID);
                if (logsChannel) {
                    const messages = await reportChannel.messages.fetch();
                    const reportContent = messages.map(msg => `${msg.author.tag}: ${msg.content}`).join('\n');
                    
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📝 Report Ticket Closed')
                        .setColor('#00ff00')
                        .addFields(
                            { name: 'Ticket Creator', value: message.author.tag },
                            { name: 'Closed By', value: m.author.tag },
                            { name: 'Content', value: reportContent.slice(0, 1024) }
                        )
                        .setTimestamp();

                    await logsChannel.send({ embeds: [logEmbed] });
                }

                // Close the channel
                await reportChannel.send('Closing ticket in 5 seconds...');
                setTimeout(() => reportChannel.delete(), 5000);
            });

        } catch (error) {
            console.error('Error creating report:', error);
            await message.reply('There was an error creating your report ticket. Please contact a moderator.');
        }
    }
};
