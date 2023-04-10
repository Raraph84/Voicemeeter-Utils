const { app, Tray, Menu } = require("electron");
const { Voicemeeter, StripProperties } = require("voicemeeter-connector");
const { speaker } = require("win-audio");
const { getConfig } = require("raraph84-lib");
const Config = getConfig(__dirname);

app.on("ready", async () => {

    const tray = new Tray("icon.ico");
    tray.setContextMenu(Menu.buildFromTemplate([{
        label: "Fermer",
        click: () => app.quit()
    }]));

    const voicemeeter = await Voicemeeter.init();
    voicemeeter.connect();

    let oldVMVolume = voicemeeter.getStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Gain);
    let oldVMMute = voicemeeter.getStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Mute);

    let oldWindowsVolume = speaker.get();
    let oldWindowsMute = speaker.isMuted();

    const interval = setInterval(async () => {

        const newVMVolume = voicemeeter.getStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Gain);
        const newVMMute = voicemeeter.getStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Mute);

        if (newVMVolume !== oldVMVolume) {
            oldVMVolume = newVMVolume;
            const volume = Math.min(Math.round((newVMVolume + 60) / 60 * 100), 100);
            oldWindowsVolume = volume;
            speaker.set(volume);
        }

        if (newVMMute !== oldVMMute) {
            oldVMMute = newVMMute;
            const mute = newVMMute === 1;
            oldWindowsMute = mute;
            if (mute) speaker.mute();
            else speaker.unmute();
        }

        const newWindowsVolume = speaker.get();
        const newWindowsMute = speaker.isMuted();

        if (newWindowsVolume !== oldWindowsVolume) {
            oldWindowsVolume = newWindowsVolume;
            const volume = Math.round(-60 + newWindowsVolume / 100 * 60);
            oldVMVolume = volume;
            voicemeeter.setStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Gain, volume);
        }

        if (newWindowsMute !== oldWindowsMute) {
            oldWindowsMute = newWindowsMute;
            const mute = newWindowsMute ? 1 : 0;
            oldVMMute = mute;
            voicemeeter.setStripParameter(Config.voiceMeeterWindowsStrip, StripProperties.Mute, mute);
        }

    }, 1000 / 33);

    app.on("quit", () => {
        clearInterval(interval);
        voicemeeter.disconnect();
    });
});
