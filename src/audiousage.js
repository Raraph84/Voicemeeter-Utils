const { join } = require("path");
const { execFile } = require("child_process");
const { EventEmitter } = require("stream");

const exe = join(__dirname, "audiousage.exe");

/**
 * @returns {Promise<{ id: string; name: string; usages: string[] }[]>} 
 */
const getUsages = () => new Promise((resolve, reject) => {

    const proc = execFile(exe, ["get"]);

    let data = "";
    proc.stdout.on("data", (chunk) => data += chunk);

    proc.on("error", reject);
    proc.on("close", (code) => {

        if (code !== 0) {
            reject(new Error(`Volume process exited with code ${code}`));
            return;
        }

        const devices = [];
        for (const line of data.trim().split("\n")) {
            if (!line.startsWith("- ")) {
                const split = line.split(" ");
                devices.push({
                    id: split[0],
                    name: split.slice(1).join(" ").trim(),
                    usages: []
                });
            } else
                devices[devices.length - 1].usages.push(line.slice(2));
        }

        resolve(devices);
    });
});

class AudioUsagePool extends EventEmitter {

    /** @type {import("child_process").ChildProcessWithoutNullStreams} */
    #proc = null;

    /**
     * @param {number} interval 
     */
    start(interval) {

        this.#proc = execFile(exe, ["pool", interval.toString()]);

        let devices = [];
        let data = "";
        this.#proc.stdout.on("data", (chunk) => {
            data += chunk;
            while (data.includes("\n")) {
                const index = data.indexOf("\n");
                const line = data.slice(0, index).trim();
                data = data.slice(index + 1);

                if (line === "--") {
                    this.emit("update", devices);
                    devices = [];
                } else if (!line.startsWith("- ")) {
                    const split = line.split(" ");
                    devices.push({
                        id: split[0],
                        name: split.slice(1).join(" ").trim(),
                        usages: []
                    });
                } else
                    devices[devices.length - 1].usages.push(line.slice(2));
            }
        });

        this.#proc.on("error", (err) => this.emit("error", err));
        this.#proc.on("close", (code) => this.emit("close", code));
    }

    stop() {
        if (this.#proc) {
            this.#proc.kill();
            this.#proc = null;
        }
    }
}

module.exports = { getUsages, AudioUsagePool };
