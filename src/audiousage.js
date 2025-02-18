const { join } = require("path");
const { execFile } = require("child_process");

const exe = join(__dirname, "audiousage.exe");

/**
 * @returns {Promise<{ id: string; name: string; usages: string[] }[]>} 
 */
module.exports.getUsages = () => new Promise((resolve, reject) => {

    const proc = execFile(exe);

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
