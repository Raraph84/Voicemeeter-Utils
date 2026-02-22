const { join } = require("path");
const { app } = require("electron");

let oldMicMute = null;

module.exports.start = (config, voicemeeter, tray) => {
    oldMicMute = voicemeeter.getStripMute(config.micStrip);
    tray.setImage(join(__dirname, "assets", oldMicMute ? "muted.png" : "unmuted.png"));
};

module.exports.voicemeeterParameterDirty = (config, voicemeeter, tray) => {

    const micMute = voicemeeter.getStripMute(config.micStrip);
    if (micMute !== oldMicMute) {
        oldMicMute = micMute;
        require("./playSound").playSound(config, voicemeeter, join(app.isPackaged ? process.resourcesPath : __dirname, "assets", micMute ? "mute.mp3" : "unmute.mp3"));
        tray.setImage(join(__dirname, "assets", micMute ? "muted.png" : "unmuted.png"));
    }
};
