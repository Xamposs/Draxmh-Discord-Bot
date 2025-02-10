export const draxmhCmd = {
    name: 'draxmh',
    description: 'Shows a cool DRX animation',
    execute(message) {
        const frames = [
            `
\`\`\`
    💫 DRAXMH POWER 💫
    
    [̲̅$̲̅(̲̅D̲̅R̲̅X)̲̅$̲̅]
    
    🌟 TO THE MOON 🌟
\`\`\`
            `,
            `
\`\`\`
    🚀 DRAXMH POWER 🚀
    
    【D】【R】【X】
    
    ⭐ TO THE MOON ⭐
\`\`\`
            `,
            `
\`\`\`
    ✨ DRAXMH POWER ✨
    
    ▄▀▄▀▄ DRX ▄▀▄▀▄
    
    💫 TO THE MOON 💫
\`\`\`
            `
        ];

        let currentFrame = 0;
        message.channel.send(frames[0]).then(msg => {
            const interval = setInterval(() => {
                currentFrame = (currentFrame + 1) % frames.length;
                msg.edit(frames[currentFrame]);
            }, 1500);

            setTimeout(() => clearInterval(interval), 7500);
        });
    }
};
