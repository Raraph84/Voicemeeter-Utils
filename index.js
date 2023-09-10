const { join } = require("path");
const { app, Tray, Menu } = require("electron");
const voicemeeter = require("voicemeeter-remote");
const { speaker } = require("win-audio");
const { getConfig } = require("raraph84-lib");
const Config = getConfig(__dirname);

app.on("ready", async () => {

    const tray = new Tray(join(__dirname, "src", "icon.ico"));
    tray.setContextMenu(Menu.buildFromTemplate([{ label: "Fermer", click: () => app.quit() }]));
    tray.on("click", () => tray.popUpContextMenu());

    await voicemeeter.init();
    voicemeeter.login();
    voicemeeter.updateDeviceList();

    let oldVMVolume = voicemeeter.getStripGain(Config.voicemeeterWindowsStrip);
    let oldVMMute = voicemeeter.getStripMute(Config.voicemeeterWindowsStrip);

    let oldWindowsVolume = speaker.get();
    let oldWindowsMute = speaker.isMuted();

    setInterval(() => {

        if (!voicemeeter.isParametersDirty()) return;

        const newVMVolume = voicemeeter.getStripGain(Config.voicemeeterWindowsStrip);
        const newVMMute = voicemeeter.getStripMute(Config.voicemeeterWindowsStrip);

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

    }, 1000 / 33);

    const volumeSyncInterval = setInterval(() => {

        const newWindowsVolume = speaker.get();
        const newWindowsMute = speaker.isMuted();

        if (newWindowsVolume !== oldWindowsVolume) {
            oldWindowsVolume = newWindowsVolume;
            const volume = Math.round(-60 + newWindowsVolume / 100 * 60);
            oldVMVolume = volume;
            voicemeeter.setStripGain(Config.voicemeeterWindowsStrip, volume);
        }

        if (newWindowsMute !== oldWindowsMute) {
            oldWindowsMute = newWindowsMute;
            const mute = newWindowsMute ? 1 : 0;
            oldVMMute = mute;
            voicemeeter.setStripMute(Config.voicemeeterWindowsStrip, mute);
        }

    }, Config.windowsSyncInterval);

    let oldVoicemeeterInputDevices = voicemeeter.inputDevices;
    let oldVoicemeeterOutputDevices = voicemeeter.outputDevices;
    const deviceConnectInterval = setInterval(() => {

        voicemeeter.updateDeviceList();
        const newVoicemeeterInputDevices = voicemeeter.inputDevices;
        const newVoicemeeterOutputDevices = voicemeeter.outputDevices;

        const inputPlugged = newVoicemeeterInputDevices.some((newDevice) => !oldVoicemeeterInputDevices.some((oldDevice) => oldDevice.hardwareId === newDevice.hardwareId));
        const outputPlugged = newVoicemeeterOutputDevices.some((newDevice) => !oldVoicemeeterOutputDevices.some((oldDevice) => oldDevice.hardwareId === newDevice.hardwareId));

        if (inputPlugged || outputPlugged)
            voicemeeter.restartVoicemeeterAudioEngine();

        oldVoicemeeterInputDevices = newVoicemeeterInputDevices;
        oldVoicemeeterOutputDevices = newVoicemeeterOutputDevices;

    }, Config.devicePluggedReloadInterval);

    app.on("quit", () => {
        clearInterval(volumeSyncInterval);
        clearInterval(deviceConnectInterval);
        voicemeeter.logout();
    });
});
