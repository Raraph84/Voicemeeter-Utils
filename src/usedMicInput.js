const { AudioUsagePool } = require("./audioUsage");

const pool = new AudioUsagePool();

const busesUsed = {
    sent: [],
    physical: [],
    windows: [],
    stripMuted: false
};

module.exports.start = (config, voicemeeter) => {
    if (!config.usedMicInput) return;

    let physical = 0;
    let virtual = 0;
    for (const bus of voicemeeter.voicemeeterConfig.buses) {
        if (bus.isVirtual) bus.shortName = "B" + ++virtual;
        else bus.shortName = "A" + ++physical;
    }

    this.voicemeeterParameterDirty(config, voicemeeter);

    pool.on("update", (devices) => {
        busesUsed.windows = devices
            .filter((device) => device.usages.length && device.name.startsWith("Voicemeeter Out ") && device.name.endsWith(" (VB-Audio Voicemeeter VAIO)"))
            .map((device) => device.name.split(" ")[2]);
        updateUsed(config, voicemeeter);
    });

    pool.start(config.usedMicInput.stripUsedCheckInterval);
};

module.exports.voicemeeterParameterDirty = (config, voicemeeter) => {
    if (!config.usedMicInput) return;

    const sentBuses = voicemeeter.voicemeeterConfig.buses.filter((bus) => voicemeeter["getStrip" + bus.shortName](config.usedMicInput.micStrip));

    busesUsed.sent = sentBuses.filter((bus) => !voicemeeter.getBusMute(bus.id)).map((bus) => bus.shortName);
    busesUsed.physical = sentBuses.filter((bus) => !bus.isVirtual && voicemeeter.getRawParameterString(`Bus[${bus.id}].device.name`)).map((bus) => bus.shortName);
    //busesUsed.stripMuted = !!voicemeeter.getStripMute(config.usedMicInput.micStrip);

    updateUsed(config, voicemeeter);
};

module.exports.stop = (config) => {
    if (!config.usedMicInput) return;
    pool.stop();
};

let oldUsed = false;

/**
 * @param {import("voicemeeter-remote")} voicemeeter 
 */
const updateUsed = (config, voicemeeter) => {
    if (!config.usedMicInput.enabled) return;

    const used = !busesUsed.stripMuted && voicemeeter.voicemeeterConfig.buses
        .some((bus) => busesUsed.sent.includes(bus.shortName) && (busesUsed.physical.includes(bus.shortName) || busesUsed.windows.includes(bus.shortName)));

    if (used === oldUsed) return;
    oldUsed = used;

    const device = voicemeeter.inputDevices.find(used ? config.usedMicInput.usedInput : config.usedMicInput.unusedInput);

    const current = voicemeeter.getRawParameterString(`Strip[${config.usedMicInput.micStrip}].device.name`);
    if (current === device?.name ?? "") return;

    const type = { 1: "wdm", 2: "ks", 3: "mme", 4: "asio" }[device?.type ?? 1];

    voicemeeter.setRawParameterString(`Strip[${config.usedMicInput.micStrip}].device.${type}`, device?.name ?? "");
};
