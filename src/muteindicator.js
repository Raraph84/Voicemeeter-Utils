const { join } = require("path");
const { app } = require("electron");

let oldMicMute = null;

module.exports.start = (config, voicemeeter, tray) => {
    oldMicMute = voicemeeter.getStripMute(config.micStrip);
    tray.setImage(join(__dirname, oldMicMute ? "muted.png" : "unmuted.png"));
};

module.exports.voicemeeterParameterDirty = (config, voicemeeter,  tray) => {

    const micMute = voicemeeter.getStripMute(config.micStrip);
    if (micMute !== oldMicMute) {
        oldMicMute = micMute;
        require("./playsound").playSound(config, voicemeeter, join(app.isPackaged ? process.resourcesPath : __dirname, micMute ? "mute.mp3" : "unmute.mp3"));
        tray.setImage(join(__dirname, micMute ? "muted.png" : "unmuted.png"));
    }
};
