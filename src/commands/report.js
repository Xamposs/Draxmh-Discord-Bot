import { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

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

            // Create a button row with a close button
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

            const embed = new EmbedBuilder()
                .setTitle('🚨 New Report Ticket')
                .setColor('#ff0000')
                .setDescription('Please provide details about what you want to report. A moderator will assist you shortly.')
                .addFields(
                    { name: 'Reporter', value: message.author.tag },
                    { name: 'Instructions', value: 'Please describe:\n1. What you are reporting\n2. Any evidence (screenshots/links)\n3. Additional details' },
                    { name: 'Commands', value: '`!close` - Close this ticket when finished\nOr use the button below' }
                )
                .setTimestamp();

            // Send the embed with the button
            await reportChannel.send({ 
                embeds: [embed],
                components: [row]
            });
            
            await message.reply(`Your report ticket has been created in ${reportChannel}. Please provide your report details there.`);

            // Set up message collector for !close command
            const messageFilter = m => {
                // Check if the message content is !close
                if (m.content.toLowerCase() === '!close') {
                    // Allow if the user is the ticket creator
                    if (m.author.id === message.author.id) {
                        return true;
                    }
                    
                    // Allow if the user has administrator permissions
                    if (m.member && m.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        return true;
                    }
                    
                    // Allow if the user has the moderator role
                    if (modRole && m.member && m.member.roles.cache.has(modRole.id)) {
                        return true;
                    }
                }
                return false;
            };
            
            const messageCollector = reportChannel.createMessageCollector({ filter: messageFilter });

            // Function to close the ticket
            const closeTicket = async (closer) => {
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
                            { name: 'Closed By', value: closer.tag },
                            { name: 'Content', value: reportContent.slice(0, 1024) }
                        )
                        .setTimestamp();

                    await logsChannel.send({ embeds: [logEmbed] });
                }

                // Close the channel
                await reportChannel.send('Closing ticket in 5 seconds...');
                setTimeout(() => reportChannel.delete(), 5000);
            };

            // Handle message-based closing
            messageCollector.on('collect', async m => {
                await closeTicket(m.author);
                messageCollector.stop();
            });

            // Set up interaction collector for the close button
            const buttonFilter = i => i.customId === 'close_ticket';
            const buttonCollector = reportChannel.createMessageComponentCollector({ filter: buttonFilter });

            // Handle button-based closing
            buttonCollector.on('collect', async interaction => {
                // Check permissions for button interaction
                const canClose = 
                    interaction.user.id === message.author.id || // Ticket creator
                    interaction.member.permissions.has(PermissionFlagsBits.Administrator) || // Admin
                    (modRole && interaction.member.roles.cache.has(modRole.id)); // Moderator
                
                if (canClose) {
                    await interaction.reply({ content: 'Closing this ticket...', ephemeral: true });
                    await closeTicket(interaction.user);
                    buttonCollector.stop();
                    messageCollector.stop();
                } else {
                    await interaction.reply({ 
                        content: 'You do not have permission to close this ticket.', 
                        ephemeral: true 
                    });
                }
            });

        } catch (error) {
            console.error('Error creating report:', error);
            await message.reply('There was an error creating your report ticket. Please contact a moderator.');
        }
    }
};