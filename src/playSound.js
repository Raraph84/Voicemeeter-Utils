const { app } = require("electron");

let timeout = null;
module.exports.playSound = (config, voicemeeter, path) => {

    const states = getRecorderStates(voicemeeter);
    setRecorderStates(voicemeeter, voicemeeter.voicemeeterConfig.buses.map((bus, i) => config.muteUnmuteSoundBuses.includes(i)));

    voicemeeter.setRawParameterString("Recorder.Load", path);

    if (timeout) {
        timeout.refresh();
    } else {
        timeout = setTimeout(() => {
            voicemeeter.ejectVoicemeeterCassette();
            setRecorderStates(voicemeeter, states);
            timeout = null;
        }, 1000);
    }
};

module.exports.stop = () => {
    if (timeout) {
        setTimeout(() => app.quit(), 1500);
        return true;
    }
    return false;
};

const getRecorderStates = (voicemeeter) => {
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

const setRecorderStates = (voicemeeter, states) => {
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
