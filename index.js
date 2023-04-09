const { Voicemeeter, StripProperties } = require("voicemeeter-connector");
const { speaker: audio } = require("win-audio");
const { getConfig } = require("raraph84-lib");
const Config = getConfig(__dirname);

Voicemeeter.init().then(async (voiceMeeter) => {

    voiceMeeter.connect();

    let oldVMVolume = voiceMeeter.getStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Gain);
    let oldVMMute = voiceMeeter.getStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Mute);

    let oldWindowsVolume = audio.get();
    let oldWindowsMute = audio.isMuted();

    const interval = setInterval(async () => {

        const newVMVolume = voiceMeeter.getStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Gain);
        const newVMMute = voiceMeeter.getStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Mute);

        if (newVMVolume !== oldVMVolume) {
            oldVMVolume = newVMVolume;
            const volume = Math.min(Math.round((newVMVolume + 60) / 60 * 100), 100);
            oldWindowsVolume = volume;
            audio.set(volume);
        }

        if (newVMMute !== oldVMMute) {
            oldVMMute = newVMMute;
            const mute = newVMMute === 1;
            oldWindowsMute = mute;
            if (mute) audio.mute();
            else audio.unmute();
        }

        const newWindowsVolume = audio.get();
        const newWindowsMute = audio.isMuted();

        if (newWindowsVolume !== oldWindowsVolume) {
            oldWindowsVolume = newWindowsVolume;
            const volume = Math.round(-60 + newWindowsVolume / 100 * 60);
            oldVMVolume = volume;
            voiceMeeter.setStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Gain, volume);
        }

        if (newWindowsMute !== oldWindowsMute) {
            oldWindowsMute = newWindowsMute;
            const mute = newWindowsMute ? 1 : 0;
            oldVMMute = mute;
            voiceMeeter.setStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Mute, mute);
        }

    }, 1000 / 33);

    process.on("SIGINT", () => {
        clearInterval(interval);
        voiceMeeter.disconnect();
        process.exit();
    });
});
