import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} from 'discord.js';
import axios from 'axios';

const LOGS_CHANNEL_ID = '1252358095116701716';
const SUGGESTIONS_CHANNEL = '1252357439807033374';

async function handleTradingButtons(interaction, client) {
    const commands = {
        price_check: {
            title: '🚀 DRX Token Price',
            async execute() {
                try {
                    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT');
                    const price = parseFloat(response.data.price);
                  
                    return new EmbedBuilder()
                        .setTitle('🚀 DRX Token Price')
                        .setColor('#00ff00')
                        .addFields(
                            { name: '💎 Price', value: `${price.toFixed(6)} USDT`, inline: true },
                            { name: '📊 Market', value: 'Binance', inline: true },
                            { name: '🔄 Status', value: 'Live Price', inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Real-time data from Binance' });
                } catch (error) {
                    console.error('Price fetch error:', error);
                    throw error;
                }
            }
        },
        volume_check: {
            title: '📊 XRP Trading Volume',
            async execute() {
                const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT');
                const data = response.data;
                return new EmbedBuilder()
                    .setTitle('📊 XRP Trading Volume')
                    .setColor('#0099ff')
                    .addFields(
                        { name: '24h Volume', value: `${Number(data.volume).toLocaleString()} XRP`, inline: true },
                        { name: 'Volume in USDT', value: `${Number(data.quoteVolume).toLocaleString()}`, inline: true },
                        { name: 'Number of Trades', value: data.count.toLocaleString(), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Data from Binance' });
            }
        },
        swap_tokens: {
            title: '🔄 DRX Swap',
            async execute() {
                return new EmbedBuilder()
                    .setTitle('🔄 DRX Swap Preview')
                    .setColor('#00ff00')
                    .addFields(
                        { name: '🔗 Swap Now', value: `[Click to open Sologenic DEX](https://sologenic.org/trade?market=DRX%2BrUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX%2FXRP&network=mainnet)` }
                    )
                    .setFooter({ text: 'Swap on Sologenic DEX' });
            }
        }
    };

    try {
        const command = commands[interaction.customId];
        if (command) {
            const embed = await command.execute();
            await interaction.reply({ embeds: [embed], ephemeral: true });

            setTimeout(async () => {
                if (interaction.replied) {
                    await interaction.deleteReply().catch(console.error);
                }
            }, 15000);
        }
    } catch (error) {
        console.error('Trading button error:', error);
        if (!interaction.replied) {
            await interaction.reply({ 
                content: 'There was an error executing this command!', 
                ephemeral: true 
            });
        }
    }
}

async function handleInformationButtons(interaction, client) {
    const commands = {
        info_check: {
            title: 'ℹ️ DRX Token Information',
            fields: [
                { name: 'Token Name', value: 'DRX', inline: true },
                { name: 'Network', value: 'XRPL', inline: true },
                { name: 'Contract', value: 'rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX', inline: true },
                { name: 'Total Supply', value: '2,000,000,000 DRX', inline: true },
                { name: 'Website', value: 'https://www.cryptodraxmh.gr/', inline: true },
                { name: 'DEX', value: 'Sologenic', inline: true }
            ]
        },
        dapps_check: {
            title: '🔗 DRX Ecosystem Links',
            fields: [
                { name: '💎 DRX Staking dApp', value: 'https://drxdefi.app/', inline: true },
                { name: '💱 Quick Swap', value: 'https://drxdefi.app/', inline: true },
                { name: '🌐 Website', value: 'https://www.cryptodraxmh.gr/', inline: true },
                { name: '📊 Analytics', value: 'https://drxdefi.app/', inline: true }
            ]
        },
        stake_stats_check: client.commands.get('stake-stats')
    };

    const commandData = commands[interaction.customId];
    if (commandData) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('Information Panel')
                .setColor('#0099ff');

            if (commandData && commandData.title) {
                embed.setTitle(commandData.title);
            }

            if (commandData && commandData.fields) {
                embed.addFields(commandData.fields);
            }

            embed.setTimestamp()
                .setFooter({ text: 'DRX Information' });
            await interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });

            setTimeout(async () => {
                if (interaction.replied) {
                    await interaction.deleteReply().catch(console.error);
                }
            }, 15000);
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: 'There was an error executing this command!', 
                ephemeral: true 
            });
        }
    }
}

async function handleSecurityButtons(interaction, client) {
    switch (interaction.customId) {
        case 'security_scam_alert_check':
        case 'scam_alert_check':
            await handleScamAlert(interaction);
            break;
        case 'security_report_check':
        case 'report_check':
            await createReportTicket(interaction);
            break;
        case 'security_suggest_check':
        case 'suggest_check':
            await handleSuggestion(interaction);
            break;
    }
}

async function handleScamAlert(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🚨 DRX Security Alert System')
        .setDescription('**Stay protected with our comprehensive security guide**')
        .setColor('#ff0000')
        .setThumbnail('https://i.imgur.com/your-drx-logo.png') // Add your DRX logo URL
        .addFields(
            { 
                name: '⚠️ Known Scam Projects & Red Flags', 
                value: 
                    '```diff\n' +
                    '- DraxMH Token (Fake)\n' +
                    '- DraxMH Inu\n' +
                    '- DraxMH AI\n' +
                    '- DraxMH 2.0\n' +
                    '- Any "DraxMH" variations\n' +
                    '```\n' +
                    '🔍 **Warning Signs:**\n' +
                    '• Promises of guaranteed returns\n' +
                    '• Urgent "limited time" offers\n' +
                    '• Requests for private keys/seeds\n' +
                    '• Unofficial social media accounts',
                inline: false
            },
            { 
                name: '✅ Official DRX Information', 
                value: 
                    '**Contract Address:**\n' +
                    '```\nrUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX\n```\n' +
                    '**Official Platforms:**\n' +
                    '🌐 Website: [drxdefi.app](https://drxdefi.app/)\n' +
                    '🌐 Website: [cryptodraxmh.gr](https://www.cryptodraxmh.gr/)\n' +
                    '💱 DEX: [Sologenic DEX](https://sologenic.org/trade?market=DRX%2BrUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX%2F524C555344000000000000000000000000000000%2BrMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De)\n' +
                    '📱 Twitter: [@Crypto_draxmi](https://x.com/Crypto_draxmi?t=Yinx4sJQEFj0DBuV4jNf5A&s=09)\n' +
                    '💬 Discord: This server only',
                inline: false
            },
            { 
                name: '🛡️ Security Best Practices', 
                value: 
                    '**Essential Security Rules:**\n' +
                    '🔐 Never share private keys or seed phrases\n' +
                    '👥 Team members never DM first\n' +
                    '🔍 Always verify contract addresses\n' +
                    '💰 Only trade on official platforms\n' +
                    '📧 Be wary of phishing emails\n' +
                    '🔗 Check URLs carefully (official sites only)',
                inline: false
            },
            { 
                name: '🚨 If You\'ve Been Scammed', 
                value: 
                    '**Immediate Actions:**\n' +
                    '1️⃣ Stop all transactions immediately\n' +
                    '2️⃣ Change all passwords & 2FA\n' +
                    '3️⃣ Report to our moderators\n' +
                    '4️⃣ Document everything (screenshots)\n' +
                    '5️⃣ Report to relevant authorities',
                inline: false
            }
        )
        .setFooter({ 
            text: 'DRX Security Team • Stay vigilant, stay safe', 
            iconURL: 'https://i.imgur.com/shield-icon.png' // Add shield icon URL
        })
        .setTimestamp();

    // Create action buttons for additional resources
    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('🔍 Verify Contract')
                .setStyle(ButtonStyle.Link)
                .setURL('https://sologenic.org/trade?market=DRX%2BrUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX%2F524C555344000000000000000000000000000000%2BrMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'),
            new ButtonBuilder()
                .setLabel('🌐 Official Website')
                .setStyle(ButtonStyle.Link)
                .setURL('https://drxdefi.app/'),
            new ButtonBuilder()
                .setLabel('📞 Report Scam')
                .setCustomId('security_report_scam')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({ 
        embeds: [embed], 
        components: [actionRow],
        ephemeral: true 
    });
}

async function createReportTicket(interaction) {
    const channelName = `report-${interaction.user.username.toLowerCase()}`;
    const modRole = interaction.guild.roles.cache.find(role => role.name === "Moderator");

    try {
        const reportChannel = await interaction.guild.channels.create({
            name: channelName,
            type: 0,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: interaction.user.id,
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
                { name: 'Reporter', value: interaction.user.tag },
                { name: 'Instructions', value: 'Please describe:\n1. What you are reporting\n2. Any evidence (screenshots/links)\n3. Additional details' },
                { name: 'Commands', value: '`!close` - Close this ticket when finished' }
            )
            .setTimestamp();

        await reportChannel.send({ embeds: [embed] });
        await interaction.reply({ 
            content: `Your report ticket has been created in ${reportChannel}. Please provide your report details there.`,
            ephemeral: true 
        });

        const filter = m => m.content.toLowerCase() === '!close';
        const collector = reportChannel.createMessageCollector({ filter });

        collector.on('collect', async m => {
            const logsChannel = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
            if (logsChannel) {
                const messages = await reportChannel.messages.fetch();
                const reportContent = messages.map(msg => `${msg.author.tag}: ${msg.content}`).join('\n');
          
                const logEmbed = new EmbedBuilder()
                    .setTitle('📝 Report Ticket Closed')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Ticket Creator', value: interaction.user.tag },
                        { name: 'Closed By', value: m.author.tag },
                        { name: 'Content', value: reportContent.slice(0, 1024) }
                    )
                    .setTimestamp();

                await logsChannel.send({ embeds: [logEmbed] });
            }

            await reportChannel.send('Closing ticket in 5 seconds...');
            setTimeout(() => reportChannel.delete(), 5000);
        });
    } catch (error) {
        console.error('Error creating report:', error);
        await interaction.reply({ 
            content: 'There was an error creating your report ticket. Please contact a moderator.',
            ephemeral: true 
        });
    }
}

async function handleSuggestion(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setTitle('💡 New Suggestion')
            .setColor('#00ff00')
            .setDescription('Please type your suggestion in suggestions channel.\nFormat: `!suggest <your suggestion>`')
            .addFields(
                { name: 'Example', value: '!suggest Add more trading features' },
                { name: 'Note', value: 'Your suggestion will be reviewed by moderators' }
            )
            .setTimestamp();

        await interaction.reply({ 
            embeds: [embed],
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error handling suggestion:', error);
        await interaction.reply({ 
            content: 'There was an error processing your suggestion. Please try again.',
            ephemeral: true 
        });
    }
}

async function handleFunButtons(interaction) {
    const funCommands = {
        moon_check: async () => {
            const embed = new EmbedBuilder()
                .setTitle('🚀 To The Moon!')
                .setColor('#00ff00')
                .setDescription('🚀 DRX TO THE MOON! 🌕')
                .setTimestamp();
            return embed;
        },
        draxmh_check: async () => {
            const frames = [
                `
    💫 DRAXMH POWER 💫
    [̲̅$̲̅(̲̅D̲̅R̲̅X)̲̅$̲̅]
    🌟 TO THE MOON 🌟
                `,
                `
    🚀 DRAXMH POWER 🚀
    【D】【R】【X】
    ⭐ TO THE MOON ⭐
                `,
                `
    ✨ DRAXMH POWER ✨
    ▄▀▄▀▄ DRX ▄▀▄▀▄
    💫 TO THE MOON 💫
                `
            ];

            const embed = new EmbedBuilder()
                .setTitle('💫 DRAXMH POWER')
                .setColor('#00ff00')
                .setDescription(`\`\`\`${frames[Math.floor(Math.random() * frames.length)]}\`\`\``)
                .setTimestamp();
            return embed;
        }
    };

    try {
        const command = funCommands[interaction.customId];
        if (command) {
            const embed = await command();
            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Auto-delete after 15 seconds
            setTimeout(async () => {
                if (interaction.replied) {
                    await interaction.deleteReply().catch(console.error);
                }
            }, 15000);
        }
    } catch (error) {
        console.error('Fun button error:', error);
        await interaction.reply({ 
            content: 'Command executed successfully!', 
            ephemeral: true 
        });
    }
}

export { 
    handleTradingButtons, 
    handleInformationButtons, 
    handleSecurityButtons, 
    handleFunButtons 
};
