const { join, dirname } = require("path");
const { createServer } = require("net");
const { app, Tray, Menu } = require("electron");
const voicemeeter = require("voicemeeter-remote");
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

    const windowsVolumeSyncInterval = setInterval(() => {

        if (!voicemeeter.isParametersDirty()) return;

        const micMute = voicemeeter.getStripMute(config.micStrip);
        if (micMute !== oldMicMute) {
            oldMicMute = micMute;
            playSound(join(app.isPackaged ? process.resourcesPath : __dirname, micMute ? "mute.mp3" : "unmute.mp3"));
            tray.setImage(join(__dirname, micMute ? "muted.png" : "unmuted.png"));
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
    };

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
    };

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
    };

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

    const lastOutgoingStreamsEnabled = config.vbanOutgoingStreamsToggler.map(() => false);
    const vbanOutgoingStreamsTogglerInterval = setInterval(() => {

        for (let i = 0; i < config.vbanOutgoingStreamsToggler.length; i++) {

            const from = voicemeeter.getRawParameterFloat("vban.outstream[" + config.vbanOutgoingStreamsToggler[i] + "].route");
            let enabled = false;
            for (let i = 0; i < 8; i++) {
                const level = voicemeeter.getLevel(3, from * 8 + i);
                if (level > 0) {
                    enabled = true;
                    break;
                }
            }

            if (enabled !== lastOutgoingStreamsEnabled[i]) {
                voicemeeter.setRawParameterFloat("vban.outstream[" + config.vbanOutgoingStreamsToggler[i] + "].on", enabled ? 1 : 0);
                lastOutgoingStreamsEnabled[i] = enabled;
            }
        }

    }, 100);

    let quitting = false;
    app.on("will-quit", (event) => {
        if (quitting) return;
        event.preventDefault();
        if (playSoundTimeout) {
            setTimeout(() => app.quit(), 1500);
            return;
        }
        quitting = true;
        clearInterval(windowsVolumeSyncInterval);
        clearInterval(deviceConnectInterval);
        clearInterval(vbanOutgoingStreamsTogglerInterval);
        tray.destroy();
        server.close();
        pool.stop();
        voicemeeter.logout();
        setTimeout(() => app.quit(), 500);
    });
});
