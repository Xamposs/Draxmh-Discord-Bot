import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionsBitField
} from 'discord.js';

export const announcePanelCmd = {
    name: 'announcepanel',
    description: 'Display a panel with dropdown to send announcements to different channels',
    async execute(message, args, client) {
        // Check if user has administrator permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Only administrators can use this command!');
        }

        // Get all text channels, including admin-only ones
        const allChannels = message.guild.channels.cache
            .filter(channel => 
                channel.type === 0 && // 0 is TextChannel
                channel.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)
            )
            .sort((a, b) => {
                // Sort by category first, then by position
                const catA = a.parent ? a.parent.name : 'No Category';
                const catB = b.parent ? b.parent.name : 'No Category';
                
                if (catA !== catB) return catA.localeCompare(catB);
                return a.position - b.position;
            });

        if (allChannels.size === 0) {
            return message.reply('No channels found where I can send messages!');
        }

        // Group channels by category
        const channelsByCategory = {};
        allChannels.forEach(channel => {
            const categoryName = channel.parent ? channel.parent.name : 'No Category';
            if (!channelsByCategory[categoryName]) {
                channelsByCategory[categoryName] = [];
            }
            channelsByCategory[categoryName].push(channel);
        });

        // Create select menu options grouped by category
        const selectOptions = [];
        let isFirstCategory = true;

        Object.entries(channelsByCategory).forEach(([categoryName, channels]) => {
            // Add category header as a non-selectable option if there are multiple categories
            if (Object.keys(channelsByCategory).length > 1) {
                selectOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`== ${categoryName} ==`)
                        .setDescription('Category header - not selectable')
                        .setValue(`category_${categoryName}`)
                        // Only set the first category as default, if needed
                        // .setDefault(isFirstCategory)
                );
                isFirstCategory = false;
            }
            
            // Add channels in this category
            channels.forEach(channel => {
                selectOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`#${channel.name}`)
                        .setDescription(`Send announcement to #${channel.name}`)
                        .setValue(`channel_${channel.id}`)
                        .setEmoji('📢')
                );
            });
        });
        // Split options into chunks of 25 (Discord's limit)
        const optionChunks = [];
        for (let i = 0; i < selectOptions.length; i += 25) {
            optionChunks.push(selectOptions.slice(i, i + 25));
        }

        // Create multiple select menus if needed
        const rows = [];
        optionChunks.forEach((chunk, index) => {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`announce_channel_select_${index}`)
                .setPlaceholder(`Select a channel to announce to (Group ${index + 1})`)
                .addOptions(chunk)
                .setMinValues(1)
                .setMaxValues(1);

            rows.push(new ActionRowBuilder().addComponents(selectMenu));
        });

        // Create buttons for quick actions
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('announce_info')
                    .setLabel('📋 Information')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('announce_alert')
                    .setLabel('⚠️ Alert')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('announce_event')
                    .setLabel('🎉 Event')
                    .setStyle(ButtonStyle.Success)
            );

        // Add the button row to the components
        rows.push(buttonRow);
        const embed = new EmbedBuilder()
            .setTitle('📢 Enhanced Announcement System')
            .setDescription('Use this panel to send announcements to any channel in the server.')
            .setColor('#00ff00')
            .addFields(
                { name: '📋 Step 1', value: 'Select a channel from the dropdown menu below' },
                { name: '✏️ Step 2', value: 'Enter your message in the popup that appears' },
                { name: '🚀 Step 3', value: 'Submit to send your announcement!' },
                { name: '⚡ Quick Templates', value: 'Use the buttons below for pre-formatted announcements' }
            )
            .setFooter({ text: 'Only administrators can use this panel' });

        await message.channel.send({
            embeds: [embed],
            components: rows
        });
    }
};
