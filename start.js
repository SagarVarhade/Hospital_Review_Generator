const { spawn } = require("child_process");
const path = require("path");

const ROOT = __dirname;
const processes = [];

function startProcess(name, command, args, options = {}) {
    console.log(`\nStarting ${name}...`);
    const child = spawn(command, args, {
        cwd: ROOT,
        stdio: "inherit",
        windowsHide: false,
        ...options
    });
    child.on("error", error => {
        console.error(`\n${name} failed to start:`);
        console.error(error.message);
    });
    child.on("exit", code => {
        console.log(`\n${name} stopped. Exit code: ${code}`);
    });
    processes.push(child);
    return child;
}

function startReviewly() {
    startProcess(
        "Reviewly Node Server",
        process.execPath,
        [path.join(ROOT, "backend", "server.js")]
    );
}

function shutdown() {
    console.log(`
=========================================
        STOPPING REVIEWLY
=========================================
`);
    for (const child of processes) {
        try {
            child.kill();
        } catch {}
    }
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`
=========================================
        REVIEWLY STARTING
=========================================
`);

startReviewly();