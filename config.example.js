module.exports = {
    devicePluggedReloadInterval: 5000,
    micStrip: 0,
    muteUnmuteSoundBuses: [0, 1],
    vbanOutgoingStreamsToggler: [0, 1],

    // Switch mic strip to usedInput when sound is used
    // Example: Use NVIDIA Broadcast only when the mic strip is used to reduce GPU usage
    usedMicInput: {
        micStrip: 0,
        // Input type 1 is WDM
        unusedInput: (input) => input.name === "Microphone (Yeti Classic)" && input.type === 1,
        usedInput: (input) => input.name === "Microphone (NVIDIA Broadcast)" && input.type === 1,
        stripUsedCheckInterval: 1000
    },

    // Sync the mute state of a strip to Discord
    discordMuteSync: {
        micStrip: 0,
        discordClientId: "YOUR CLIENT ID",
        discordClientSecret: "YOUR CLIENT SECRET",
        discordRedirectUri: "http://localhost"
    }
};
