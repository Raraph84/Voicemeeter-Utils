const { join, dirname } = require("path");
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
    require("./muteindicator").start(config, voicemeeter, tray);

    const voicemeeterParameterDirtyInterval = setInterval(() => {
        if (!voicemeeter.isParametersDirty()) return;
        require("./muteindicator").voicemeeterParameterDirty(config, voicemeeter, tray);
    }, 1000 / 15);

    require("./inputsautoreload").start(config, voicemeeter);
    require("./remotemute").start(config, voicemeeter);
    require("./vbanautodisable").start(config, voicemeeter);

    let quitting = false;
    app.on("will-quit", (event) => {
        if (quitting) return;
        event.preventDefault();
        if (require("./playsound").stop()) return;
        quitting = true;
        clearInterval(voicemeeterParameterDirtyInterval);
        require("./inputsautoreload").stop();
        require("./vbanautodisable").stop();
        require("./remotemute").stop();
        tray.destroy();
        voicemeeter.logout();
        setTimeout(() => app.quit(), 500);
    });
});
