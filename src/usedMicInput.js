const { AudioUsagePool } = require("./audiousage");

const pool = new AudioUsagePool();
let busesUsed = [];
let oldUsed = false;

module.exports.start = (config, voicemeeter) => {

    if (!config.usedMicInput) return;

    assignBusesShortNames(voicemeeter);
    updateUsed(config, voicemeeter);

    pool.on("update", (devices) => {
        busesUsed = devices
            .filter((device) => device.usages.length && device.name.startsWith("Voicemeeter Out ") && device.name.endsWith(" (VB-Audio Voicemeeter VAIO)"))
            .map((device) => device.name.split(" ")[2]);
        updateUsed(config, voicemeeter);
    });

    pool.start(config.usedMicInput.stripUsedCheckInterval);
};

module.exports.voicemeeterParameterDirty = (config, voicemeeter) => {
    if (!config.usedMicInput) return;
    updateUsed(config, voicemeeter);
};

module.exports.stop = (config) => {
    if (!config.usedMicInput) return;
    pool.stop();
};

/**
 * @param {import("voicemeeter-remote")} voicemeeter 
 */
const updateUsed = (config, voicemeeter) => {

    let used = false;
    for (const bus of voicemeeter.voicemeeterConfig.buses) {

        const strip = voicemeeter["getStrip" + bus.shortName](config.usedMicInput.micStrip);
        if (!strip) continue;

        if (busesUsed.includes(bus.shortName) ||
            (!strip.isVirtual && voicemeeter.getRawParameterString(`Bus[${bus.id}].device.name`))) {
            used = true;
            break;
        }
    }

    if (used === oldUsed) return;
    oldUsed = used;

    const device = voicemeeter.inputDevices.find(used ? config.usedMicInput.usedInput : config.usedMicInput.unusedInput);
    if (!device) return;

    switchToDevice(voicemeeter, config.usedMicInput.micStrip, device);
};

/**
 * @param {import("voicemeeter-remote")} voicemeeter 
 */
const switchToDevice = (voicemeeter, strip, device) => {

    const current = voicemeeter.getRawParameterString(`Strip[${strip}].device.name`);
    if (current === device.name) return;

    const type = { 1: "mme", 2: "ks", 3: "wdm", 4: "asio" }[device.type];
    voicemeeter.setRawParameterString(`Strip[${strip}].device.${type}`, device.name);
};

const assignBusesShortNames = (voicemeeter) => {
    let physical = 0;
    let virtual = 0;
    for (const bus of voicemeeter.voicemeeterConfig.buses) {
        if (bus.isVirtual) bus.shortName = "B" + ++virtual;
        else bus.shortName = "A" + ++physical;
    }
};
