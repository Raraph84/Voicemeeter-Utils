const net = require("net");
const socket = new net.Socket().connect(8983, "127.0.0.1");
socket.on("connect", () => socket.write("togglemic"));
