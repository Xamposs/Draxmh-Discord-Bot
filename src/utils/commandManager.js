const disabledCommands = new Map();

export const toggleCommand = (commandName, state, guildId) => {
    const key = `${guildId}-${commandName}`;
    if (state === 'off') {
        disabledCommands.set(key, true);
    } else {
        disabledCommands.delete(key);
    }
};

export const isCommandEnabled = (commandName, guildId) => {
    const key = `${guildId}-${commandName}`;
    return !disabledCommands.has(key);
};

export const getCommandStatus = (commandName, guildId) => {
    const key = `${guildId}-${commandName}`;
    return !disabledCommands.has(key) ? 'enabled' : 'disabled';
};

// Export the disabledCommands Map as commandToggles for cleanup purposes
export const commandToggles = disabledCommands;
