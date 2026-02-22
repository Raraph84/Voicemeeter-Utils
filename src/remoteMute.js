const { createServer } = require("net");

let server = null;

module.exports.start = (config, voicemeeter) => {

    server = createServer((socket) => {
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
};

module.exports.stop = () => {
    server.close();
};
