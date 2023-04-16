const { exec } = require("child_process");
const { app, Tray, Menu, nativeImage } = require("electron");
const { Voicemeeter, StripProperties } = require("voicemeeter-connector");
const { speaker } = require("win-audio");
const { getConfig } = require("raraph84-lib");
const Config = getConfig(__dirname);

app.on("ready", async () => {

    const tray = new Tray(nativeImage.createFromPath("src/icon.ico"));
    tray.setContextMenu(Menu.buildFromTemplate([{ label: "Fermer", click: () => app.quit() }]));
    tray.on("click", () => tray.popUpContextMenu());

    const voicemeeter = await Voicemeeter.init();
    voicemeeter.connect();
    voicemeeter.updateDeviceList();

    let oldVMVolume = voicemeeter.getStripParameter(Config.voicemeeterWindowsStrip, StripProperties.Gain);
    let oldVMMute = voicemeeter.getStripParameter(Config.voicemeeterWindowsStrip, StripProperties.Mute);

    let oldWindowsVolume = speaker.get();
    let oldWindowsMute = speaker.isMuted();

    voicemeeter.attachChangeEvent(() => {

        const newVMVolume = voicemeeter.getStripParameter(Config.voicemeeterWindowsStrip, StripProperties.Gain);
        const newVMMute = voicemeeter.getStripParameter(Config.voicemeeterWindowsStrip, StripProperties.Mute);

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
    });

    const volumeSyncInterval = setInterval(async () => {

        const newWindowsVolume = speaker.get();
        const newWindowsMute = speaker.isMuted();

        if (newWindowsVolume !== oldWindowsVolume) {
            oldWindowsVolume = newWindowsVolume;
            const volume = Math.round(-60 + newWindowsVolume / 100 * 60);
            oldVMVolume = volume;
            voicemeeter.setStripParameter(Config.voicemeeterWindowsStrip, StripProperties.Gain, volume);
        }

        if (newWindowsMute !== oldWindowsMute) {
            oldWindowsMute = newWindowsMute;
            const mute = newWindowsMute ? 1 : 0;
            oldVMMute = mute;
            voicemeeter.setStripParameter(Config.voicemeeterWindowsStrip, StripProperties.Mute, mute);
        }

    }, Config.windowsSyncInterval);

    let oldVoicemeeterInputDevices = voicemeeter.$inputDevices;
    let oldVoicemeeterOutputDevices = voicemeeter.$outputDevices;
    const deviceConnectInterval = setInterval(() => {

        voicemeeter.updateDeviceList();
        const newVoicemeeterInputDevices = voicemeeter.$inputDevices;
        const newVoicemeeterOutputDevices = voicemeeter.$outputDevices;

        const inputPlugged = newVoicemeeterInputDevices.some((newDevice) => !oldVoicemeeterInputDevices.some((oldDevice) => oldDevice.hardwareId === newDevice.hardwareId));
        const outputPlugged = newVoicemeeterOutputDevices.some((newDevice) => !oldVoicemeeterOutputDevices.some((oldDevice) => oldDevice.hardwareId === newDevice.hardwareId));

        if (inputPlugged || outputPlugged)
            exec("\"C:\\Program Files (x86)\\VB\\Voicemeeter\\voicemeeterpro\" -r", () => { });

        oldVoicemeeterInputDevices = newVoicemeeterInputDevices;
        oldVoicemeeterOutputDevices = newVoicemeeterOutputDevices;

    }, Config.devicePluggedReloadInterval);

    app.on("quit", () => {
        clearInterval(volumeSyncInterval);
        clearInterval(deviceConnectInterval);
        voicemeeter.disconnect();
    });
});
