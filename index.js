const { join } = require("path");
const { createServer } = require("net");
const { app, Tray, Menu } = require("electron");
const voicemeeter = require("voicemeeter-remote");
const config = require("./config.json");

app.on("ready", async () => {

    const tray = new Tray(join(__dirname, "src", "unmuted.png"));
    tray.setContextMenu(Menu.buildFromTemplate([{ label: "Close", click: () => app.quit() }]));
    tray.on("click", () => tray.popUpContextMenu());

    await voicemeeter.init();
    voicemeeter.login();

    voicemeeter.isParametersDirty();
    let oldMicMute = voicemeeter.getStripMute(config.micStrip);
    tray.setImage(join(__dirname, "src", oldMicMute ? "muted.png" : "unmuted.png"));

    /*let oldVMVolume = voicemeeter.getStripGain(Config.voicemeeterWindowsStrip);
    let oldVMMute = voicemeeter.getStripMute(Config.voicemeeterWindowsStrip);

    let oldWindowsVolume = speaker.get();
    let oldWindowsMute = speaker.isMuted();*/

    setInterval(() => {

        if (!voicemeeter.isParametersDirty()) return;

        const micMute = voicemeeter.getStripMute(config.micStrip);
        if (micMute !== oldMicMute) {
            oldMicMute = micMute;
            microphoneToggled(micMute);
        }

        /*const newVMVolume = voicemeeter.getStripGain(Config.voicemeeterWindowsStrip);
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
        }*/

    }, 1000 / 33);

    /*const volumeSyncInterval = setInterval(() => {

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

    }, Config.windowsSyncInterval);*/

    voicemeeter.updateDeviceList();
    let oldVoicemeeterInputDevices = voicemeeter.inputDevices;
    let oldVoicemeeterOutputDevices = voicemeeter.outputDevices;
    const deviceConnectInterval = setInterval(() => {

        voicemeeter.updateDeviceList();
        const newVoicemeeterInputDevices = voicemeeter.inputDevices;
        const newVoicemeeterOutputDevices = voicemeeter.outputDevices;

        if (JSON.stringify(newVoicemeeterInputDevices) !== JSON.stringify(oldVoicemeeterInputDevices) || JSON.stringify(newVoicemeeterOutputDevices) !== JSON.stringify(oldVoicemeeterOutputDevices)) {
            oldVoicemeeterInputDevices = newVoicemeeterInputDevices;
            oldVoicemeeterOutputDevices = newVoicemeeterOutputDevices;
            voicemeeter.restartVoicemeeterAudioEngine();
        }

    }, config.devicePluggedReloadInterval);

    const getRecorderStates = () => {
        const states = [];
        const virtualBuses = voicemeeter.voicemeeterConfig.buses.filter((bus) => bus.isVirtual).length;
        for (let i = 0; i < voicemeeter.voicemeeterConfig.buses.length - virtualBuses; i++) {
            const bus = "A" + (i + 1);
            states.push(voicemeeter.getRawParameterFloat("Recorder." + bus) === 1);
        }
        for (let i = 0; i < virtualBuses; i++) {
            const bus = "B" + (i + 1);
            states.push(voicemeeter.getRawParameterFloat("Recorder." + bus) === 1);
        }
        return states;
    }

    const setRecorderStates = (states) => {
        const virtualBuses = voicemeeter.voicemeeterConfig.buses.filter((bus) => bus.isVirtual).length;
        for (let i = 0; i < voicemeeter.voicemeeterConfig.buses.length - virtualBuses; i++) {
            const bus = "A" + (i + 1);
            voicemeeter.setRawParameterFloat("Recorder." + bus, states[i] ? 1 : 0);
        }
        for (let i = 0; i < virtualBuses; i++) {
            const bus = "B" + (i + 1);
            voicemeeter.setRawParameterFloat("Recorder." + bus, states[voicemeeter.voicemeeterConfig.buses.length - virtualBuses + i] ? 1 : 0);
        }
    }

    let playSoundTimeout = null;
    const playSound = (path) => {

        const states = getRecorderStates();
        setRecorderStates(voicemeeter.voicemeeterConfig.buses.map((bus, i) => config.muteUnmuteSoundBuses.includes(i)));

        voicemeeter.setRawParameterString("Recorder.Load", path);

        if (playSoundTimeout) {
            playSoundTimeout.refresh();
        } else {
            playSoundTimeout = setTimeout(() => {
                voicemeeter.ejectVoicemeeterCassette();
                setRecorderStates(states);
                playSoundTimeout = null;
            }, 1000);
        }
    }

    const microphoneToggled = (muted) => {
        playSound(join(__dirname, "src", muted ? "mute.mp3" : "unmute.mp3"));
        tray.setImage(join(__dirname, "src", muted ? "muted.png" : "unmuted.png"));
    }

    const server = createServer((socket) => {
        let data = "";
        socket.on("data", (chunk) => {
            data += chunk;
            if (data === "togglemic") {
                voicemeeter.setStripMute(config.micStrip, !voicemeeter.getStripMute(config.micStrip));
                socket.end();
            }
        });
    });

    server.listen(8983, "127.0.0.1");

    app.on("will-quit", (event) => {
        event.preventDefault();
        server.close();
        // clearInterval(volumeSyncInterval);
        clearInterval(deviceConnectInterval);
        if (playSoundTimeout) {
            setTimeout(() => app.quit(), 1500);
            return;
        }
        voicemeeter.logout();
        setTimeout(() => app.quit(), 500);
    });
});
