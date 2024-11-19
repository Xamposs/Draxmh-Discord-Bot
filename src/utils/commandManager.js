const disabledCommands = new Map();

function toggleCommand(commandName, state, guildId) {
    const key = `${guildId}-${commandName}`;
    if (state === 'off') {
        disabledCommands.set(key, true);
    } else {
        disabledCommands.delete(key);
    }
}

function isCommandEnabled(commandName, guildId) {
    const key = `${guildId}-${commandName}`;
    return !disabledCommands.has(key);
}

module.exports = { toggleCommand, isCommandEnabled };
