const { join, dirname } = require("path");
const { createServer } = require("net");
const { app, Tray, Menu } = require("electron");
const voicemeeter = require("voicemeeter-remote");
const volume = require("./volume");
const config = require(join(dirname(__dirname), "config.json"));

app.on("ready", async () => {

    const tray = new Tray(join(__dirname, "unmuted.png"));
    tray.setContextMenu(Menu.buildFromTemplate([{ label: "Close", click: () => app.quit() }]));
    tray.on("click", () => tray.popUpContextMenu());

    await voicemeeter.init();
    voicemeeter.login();

    voicemeeter.isParametersDirty();
    let oldMicMute = voicemeeter.getStripMute(config.micStrip);
    tray.setImage(join(__dirname, oldMicMute ? "muted.png" : "unmuted.png"));

    let oldVMVolume = voicemeeter.getStripGain(config.windowsSyncStrip);
    let oldVMMuted = voicemeeter.getStripMute(config.windowsSyncStrip);

    let oldWindowsVolume = await volume.getVolume();
    let oldWindowsMuted = await volume.getMuted();

    const pool = new volume.VolumePool();
    pool.on("volume", (newWindowsVolume) => {

        if (newWindowsVolume === oldWindowsVolume) return;
        oldWindowsVolume = newWindowsVolume;

        const volume = Math.round(-60 + newWindowsVolume / 100 * 60);
        oldVMVolume = volume;
        voicemeeter.setStripGain(config.windowsSyncStrip, volume);
    });
    pool.on("muted", (newWindowsMuted) => {

        if (newWindowsMuted === oldWindowsMuted) return;
        oldWindowsMuted = newWindowsMuted;

        const muted = newWindowsMuted ? 1 : 0;
        oldVMMuted = muted;
        voicemeeter.setStripMute(config.windowsSyncStrip, muted);
    });
    pool.start(1000 / 15);

    setInterval(() => {

        if (!voicemeeter.isParametersDirty()) return;

        const micMute = voicemeeter.getStripMute(config.micStrip);
        if (micMute !== oldMicMute) {
            oldMicMute = micMute;
            playSound(join(app.isPackaged ? process.resourcesPath : __dirname, micMute ? "mute.mp3" : "unmute.mp3"));
            tray.setImage(join(__dirname, micMute ? "muted.png" : "unmuted.png"));
        }

        const newVMVolume = voicemeeter.getStripGain(config.windowsSyncStrip);
        const newVMMuted = voicemeeter.getStripMute(config.windowsSyncStrip);

        if (newVMVolume !== oldVMVolume) {
            oldVMVolume = newVMVolume;
            const volume = Math.min(Math.round((newVMVolume + 60) / 60 * 100), 100);
            oldWindowsVolume = volume;
            pool.setVolume(volume);
        }

        if (newVMMuted !== oldVMMuted) {
            oldVMMuted = newVMMuted;
            const muted = newVMMuted === 1;
            oldWindowsMuted = muted;
            pool.setMuted(muted);
        }

    }, 1000 / 15);

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
        if (playSoundTimeout) {
            setTimeout(() => app.quit(), 1500);
            return;
        }
        tray.destroy();
        server.close();
        pool.stop();
        clearInterval(deviceConnectInterval);
        voicemeeter.logout();
        setTimeout(() => app.quit(), 500);
    });
});
