let interval = null;

module.exports.start = (config, voicemeeter) => {

    const lastOutgoingStreamsEnabled = config.vbanOutgoingStreamsToggler.map(() => false);
    interval = setInterval(() => {

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
};

module.exports.stop = () => {
    clearInterval(interval);
};
