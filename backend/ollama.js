const config = require("./config");
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const MAX_RETRIES = 3;

async function generateWithOllama(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("Gemini API key is not configured.");
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, config.ollama.timeout);

        try {
            const response = await fetch(
                `${GEMINI_URL}/${GEMINI_MODEL}:generateContent`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt
                                    }
                                ]
                            }
                        ],
                        generationConfig: {
                            temperature: 0.5,
                            maxOutputTokens: 80
                        }
                    }),
                    signal: controller.signal
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const message =
                    data?.error?.message ||
                    `Gemini returned HTTP ${response.status}`;

                const retryable =
                    response.status === 429 ||
                    response.status === 500 ||
                    response.status === 502 ||
                    response.status === 503 ||
                    response.status === 504 ||
                    message.toLowerCase().includes("high demand") ||
                    message.toLowerCase().includes("temporarily unavailable");

                if (retryable && attempt < MAX_RETRIES) {
                    const delay = 1000 * Math.pow(2, attempt);
                    console.log(
                        `Gemini temporarily unavailable. Retrying in ${delay / 1000}s...`
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                throw new Error(message);
            }

            const text =
                data?.candidates?.[0]?.content?.parts
                    ?.map(part => part.text || "")
                    .join("")
                    .trim();

            if (!text) {
                throw new Error("Gemini returned an empty response.");
            }

            return text;
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "Gemini request timed out. Please try again."
                );
            }

            if (attempt < MAX_RETRIES) {
                const message = String(error.message || "").toLowerCase();

                const retryable =
                    message.includes("fetch failed") ||
                    message.includes("network") ||
                    message.includes("high demand") ||
                    message.includes("temporarily unavailable");

                if (retryable) {
                    const delay = 1000 * Math.pow(2, attempt);
                    console.log(
                        `Gemini request failed temporarily. Retrying in ${delay / 1000}s...`
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }

            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    throw new Error("Gemini request failed after multiple attempts.");
}

async function checkOllama() {
    return Boolean(process.env.GEMINI_API_KEY);
}

async function checkModel() {
    return Boolean(
        process.env.GEMINI_API_KEY &&
        GEMINI_MODEL
    );
}

module.exports = {
    generateWithOllama,
    checkOllama,
    checkModel
};