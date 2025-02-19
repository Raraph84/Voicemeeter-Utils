const { join } = require("path");
const { spawn } = require("child_process");
const { app } = require("electron");
const EventEmitter = require("events");

const exe = join(app.isPackaged ? process.resourcesPath : __dirname, "assets", "volume.exe");

/**
 * @returns {Promise<number>} 
 */
const getVolume = () => new Promise((resolve, reject) => {

    const proc = spawn(exe, ["getvolume"]);

    let data = "";
    proc.stdout.on("data", (chunk) => data += chunk);

    proc.on("error", reject);
    proc.on("close", (code) => {
        if (code === 0 && data.startsWith("volume "))
            resolve(parseFloat(data.trim().split(" ")[1]));
        else
            reject(new Error(`Volume process exited with code ${code}`));
    });
});

/**
 * @returns {Promise<boolean>} 
 */
const getMuted = () => new Promise((resolve, reject) => {

    const proc = spawn(exe, ["getmuted"]);

    let data = "";
    proc.stdout.on("data", (chunk) => data += chunk);

    proc.on("error", reject);
    proc.on("close", (code) => {
        if (code === 0 && data.startsWith("muted "))
            resolve(data.trim().split(" ")[1] === "true");
        else
            reject(new Error(`Volume process exited with code ${code}`));
    });
});

/**
 * @param {number} volume 
 * @returns {Promise<void>} 
 */
const setVolume = (volume) => new Promise((resolve, reject) => {

    const proc = spawn(exe, ["setvolume", volume.toString()]);
    proc.on("error", reject);
    proc.on("close", (code) => {
        if (code === 0)
            resolve();
        else
            reject(new Error(`Volume process exited with code ${code}`));
    });
});

/**
 * @param {boolean} muted 
 * @returns {Promise<void>} 
 */
const setMuted = (muted) => new Promise((resolve, reject) => {

    const proc = spawn(exe, ["setmuted", muted.toString()]);
    proc.on("error", reject);
    proc.on("close", (code) => {
        if (code === 0)
            resolve();
        else
            reject(new Error(`Volume process exited with code ${code}`));
    });
});

class VolumePool extends EventEmitter {

    /** @type {import("child_process").ChildProcessWithoutNullStreams} */
    #proc = null;

    /**
     * @param {number} interval 
     */
    start(interval) {

        this.#proc = spawn(exe, ["pool", interval.toString()]);

        let data = "";
        this.#proc.stdout.on("data", (chunk) => {
            data += chunk;
            while (data.includes("\n")) {
                const index = data.indexOf("\n");
                const line = data.slice(0, index).trim();
                data = data.slice(index + 1);
                if (line.startsWith("volume ")) this.emit("volume", parseFloat(line.split(" ")[1]));
                if (line.startsWith("muted ")) this.emit("muted", line.split(" ")[1] === "true");
            }
        });

        this.#proc.on("error", (err) => this.emit("error", err));
        this.#proc.on("close", (code) => this.emit("close", code));
    }

    /**
     * @param {number} volume 
     */
    setVolume(volume) {
        if (this.#proc) {
            this.#proc.stdin.write(`volume ${volume.toString()}\n`);
        }
    }

    /**
     * @param {boolean} muted 
     */
    setMuted(muted) {
        if (this.#proc) {
            this.#proc.stdin.write(`muted ${muted.toString()}\n`);
        }
    }

    stop() {
        if (this.#proc) {
            this.#proc.kill();
            this.#proc = null;
        }
    }
}

module.exports = { getVolume, getMuted, setVolume, setMuted, VolumePool };
