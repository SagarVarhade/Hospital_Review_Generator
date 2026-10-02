const path = require("path");
require("dotenv").config();

const ROOT_DIR = path.join(__dirname, "..");

module.exports = {
    server: {
        host: process.env.HOST || "0.0.0.0",
        port: Number(process.env.PORT) || 3000
    },

    ollama: {
        url: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
        model: process.env.OLLAMA_MODEL || "qwen2.5:1.5b",
        timeout: Number(process.env.OLLAMA_TIMEOUT) || 300000
    },

    paths: {
        root: ROOT_DIR,
        data: path.join(ROOT_DIR, "data"),
        prompts: path.join(ROOT_DIR, "prompts"),
        frontend: path.join(ROOT_DIR, "frontend"),
        settings: path.join(ROOT_DIR, "data", "settings.json"),
        doctors: path.join(ROOT_DIR, "data", "doctors.json"),
        history: path.join(ROOT_DIR, "data", "history.json"),
        prompt: path.join(ROOT_DIR, "prompts", "reviewPrompt.txt")
    }
};