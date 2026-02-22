const { join } = require("path");
const { app, Tray, Menu } = require("electron");
const voicemeeter = require("voicemeeter-remote");
const config = require("../config");

app.on("ready", async () => {

    const tray = new Tray(join(__dirname, "assets", "unmuted.png"));
    const updateContextMenu = () => tray.setContextMenu(Menu.buildFromTemplate([
        ...(config.devicePluggedReloadInterval ? [{
            label: (config.devicePluggedReloadEnabled ? "Disable" : "Enable") + " Device Plugged Reload",
            click: () => {
                config.devicePluggedReloadEnabled = !config.devicePluggedReloadEnabled;
                updateContextMenu();
            }
        }] : []),
        ...(config.discordMuteSync ? [{
            label: (config.discordMuteSync.enabled ? "Disable" : "Enable") + " Discord Mute Sync",
            click: () => {
                config.discordMuteSync.enabled = !config.discordMuteSync.enabled;
                updateContextMenu();
            }
        }] : []),
        { label: "Close", click: () => app.quit() }
    ]));
    updateContextMenu();
    tray.on("click", () => tray.popUpContextMenu());

    await voicemeeter.init();
    voicemeeter.login();

    voicemeeter.isParametersDirty();
    require("./muteIndicator").start(config, voicemeeter, tray);
    require("./usedMicInput").start(config, voicemeeter);
    require("./discordMuteSync").start(config, voicemeeter);

    const voicemeeterParameterDirtyInterval = setInterval(() => {
        if (!voicemeeter.isParametersDirty()) return;
        require("./muteIndicator").voicemeeterParameterDirty(config, voicemeeter, tray);
        require("./usedMicInput").voicemeeterParameterDirty(config, voicemeeter);
        require("./discordMuteSync").voicemeeterParameterDirty(config, voicemeeter);
    }, 1000 / 15);

    require("./inputsAutoReload").start(config, voicemeeter);
    require("./remoteMute").start(config, voicemeeter);
    require("./vbanAutoDisable").start(config, voicemeeter);

    let quitting = false;
    app.on("will-quit", (event) => {
        if (quitting) return;
        event.preventDefault();
        if (require("./playSound").stop()) return;
        quitting = true;
        clearInterval(voicemeeterParameterDirtyInterval);
        require("./inputsAutoReload").stop();
        require("./vbanAutoDisable").stop();
        require("./remoteMute").stop();
        require("./usedMicInput").stop(config);
        require("./discordMuteSync").stop(config);
        tray.destroy();
        voicemeeter.logout();
        setTimeout(() => app.quit(), 500);
    });
});
