import { EmbedBuilder } from 'discord.js';
import { XummService } from '../services/xummService.js';

const xummService = new XummService();

const connectCommand = {
    name: 'connect',
    description: 'Connect your XRPL wallet',
    async execute(message) {
        try {
            const signInRequest = await xummService.createSignInRequest(message.author.id);
            
            const embed = new EmbedBuilder()
                .setTitle('🔗 Connect XRPL Wallet')
                .setColor('#00ff00')
                .setDescription('Scan the QR code or click the link below to connect your wallet')
                .addFields(
                    { name: '🌐 Connect via Browser', value: signInRequest.link }
                )
                .setImage(signInRequest.qrCode)
                .setTimestamp();

            const reply = await message.reply({ embeds: [embed] });

            const checkInterval = setInterval(async () => {
                const result = await xummService.verifySignIn(signInRequest.payloadId);
                if (result.success) {
                    clearInterval(checkInterval);
                    
                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ Wallet Connected!')
                        .setColor('#00ff00')
                        .addFields(
                            { name: 'Wallet Address', value: result.address },
                            { name: 'Status', value: 'Successfully connected to Discord' }
                        );
                        
                    await message.channel.send({ 
                        content: `<@${message.author.id}>`,
                        embeds: [successEmbed] 
                    });
                }
            }, 5000);

            setTimeout(() => {
                clearInterval(checkInterval);
            }, 300000); // 5 minutes timeout

        } catch (error) {
            console.error('Wallet connection error:', error);
            await message.reply('Error connecting wallet. Please try again.');
        }
    }
};

export default connectCommand;