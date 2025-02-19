const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const RPC = require("discord-rpc");

const tokenPath = path.join(app.getPath("userData"), "discord-rpc-token.txt");

let client = null;
let oldMute = false;

module.exports.start = async (config, voicemeeter) => {
    if (!config.discordMuteSync) return;

    this.voicemeeterParameterDirty(config, voicemeeter);

    let accessToken = null;
    if (fs.existsSync(tokenPath))
        accessToken = (await fs.promises.readFile(tokenPath, "utf8")).trim();

    const c = new RPC.Client({ transport: "ipc" });
    c.on("ready", () => {
        client = c;
        c.subscribe("VOICE_SETTINGS_UPDATE");
        fs.promises.writeFile(tokenPath, c.accessToken);
    });

    c.on("VOICE_SETTINGS_UPDATE", (voiceSettings) => {
        if (voiceSettings.deaf || voiceSettings.mute === oldMute) return;
        oldMute = voiceSettings.mute;
        console.log("Syncing mute from Discord to Voicemeeter");
        voicemeeter.setStripMute(config.discordMuteSync.micStrip, voiceSettings.mute);
    });

    c.login({
        clientId: config.discordMuteSync.discordClientId,
        clientSecret: config.discordMuteSync.discordClientSecret,
        scopes: ["rpc", "rpc.voice.read", "rpc.voice.write"],
        redirectUri: config.discordMuteSync.discordRedirectUri,
        accessToken
    });
};

module.exports.voicemeeterParameterDirty = (config, voicemeeter) => {
    if (!config.discordMuteSync) return;

    const mute = !!voicemeeter.getStripMute(config.discordMuteSync.micStrip);
    if (oldMute === mute) return;
    oldMute = mute;

    if (client) {
        console.log("Syncing mute from Voicemeeter to Discord");
        client.getVoiceSettings().then((voiceSettings) => {
            client.setVoiceSettings({ mute: voiceSettings.deaf || mute });
        });
    }
};

module.exports.stop = (config) => {
    if (!config.discordMuteSync) return;
    if (client) client.destroy();
};
