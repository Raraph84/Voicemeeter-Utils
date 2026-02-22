let interval = null;

module.exports.start = (config, voicemeeter) => {

    voicemeeter.updateDeviceList();
    let oldVoicemeeterInputDevices = voicemeeter.inputDevices;
    let oldVoicemeeterOutputDevices = voicemeeter.outputDevices;
    interval = setInterval(() => {

        voicemeeter.updateDeviceList();
        const newVoicemeeterInputDevices = voicemeeter.inputDevices;
        const newVoicemeeterOutputDevices = voicemeeter.outputDevices;

        if (JSON.stringify(newVoicemeeterInputDevices) !== JSON.stringify(oldVoicemeeterInputDevices) || JSON.stringify(newVoicemeeterOutputDevices) !== JSON.stringify(oldVoicemeeterOutputDevices)) {
            oldVoicemeeterInputDevices = newVoicemeeterInputDevices;
            oldVoicemeeterOutputDevices = newVoicemeeterOutputDevices;
            voicemeeter.restartVoicemeeterAudioEngine();
        }

    }, config.devicePluggedReloadInterval);
};

module.exports.stop = () => {
    clearInterval(interval);
};
