const fs = require("fs").promises;
const config = require("./config");
const { createClient } = require("@libsql/client");

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl || !authToken) {
    throw new Error("Turso database configuration is missing.");
}

const db = createClient({
    url: databaseUrl,
    authToken
});

const defaultSettings = {
    hospitalName: "",
    availableDoctors: [],
    reviewTopics: [
        "Hypertension",
        "Diabetes",
        "Staff",
        "IPD Facility",
        "General"
    ],
    shortPercentage: 100,
    mediumPercentage: 0,
    doctorNamePercentage: 100
};

let initialized = false;

async function initializeDatabase() {
    if (initialized) {
        return;
    }

    await db.batch([
        {
            sql: `
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY,
                    data TEXT NOT NULL
                )
            `
        },
        {
            sql: `
                CREATE TABLE IF NOT EXISTS history (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    data TEXT NOT NULL
                )
            `
        }
    ], "write");

    await migrateExistingData();
    initialized = true;
}

async function migrateExistingData() {
    const settingsResult = await db.execute(
        "SELECT COUNT(*) AS count FROM settings"
    );

    const historyResult = await db.execute(
        "SELECT COUNT(*) AS count FROM history"
    );

    const settingsCount = Number(
        settingsResult.rows[0]?.count || 0
    );

    const historyCount = Number(
        historyResult.rows[0]?.count || 0
    );

    if (settingsCount === 0) {
        try {
            const data = await fs.readFile(
                config.paths.settings,
                "utf8"
            );

            const settings = JSON.parse(data);

            await db.execute({
                sql: "INSERT INTO settings (id, data) VALUES (?, ?)",
                args: [
                    1,
                    JSON.stringify(settings)
                ]
            });
        } catch {
            await db.execute({
                sql: "INSERT INTO settings (id, data) VALUES (?, ?)",
                args: [
                    1,
                    JSON.stringify(defaultSettings)
                ]
            });
        }
    }

    if (historyCount === 0) {
        try {
            const data = await fs.readFile(
                config.paths.history,
                "utf8"
            );

            const history = JSON.parse(data);

            if (Array.isArray(history)) {
                for (const item of history) {
                    if (!item?.id) {
                        continue;
                    }

                    await db.execute({
                        sql: `
                            INSERT OR IGNORE INTO history
                            (id, timestamp, data)
                            VALUES (?, ?, ?)
                        `,
                        args: [
                            String(item.id),
                            item.timestamp || new Date().toISOString(),
                            JSON.stringify(item)
                        ]
                    });
                }
            }
        } catch {}
    }
}

function normalizeSettings(settings) {
    if (!Array.isArray(settings.reviewTopics)) {
        settings.reviewTopics = [
            "Hypertension",
            "Diabetes",
            "Staff",
            "IPD Facility",
            "General"
        ];
    }

    if (!Array.isArray(settings.availableDoctors)) {
        settings.availableDoctors = [];
    }

    settings.shortPercentage = Math.max(
        0,
        Math.min(100, Number(settings.shortPercentage))
    );

    settings.mediumPercentage = Math.max(
        0,
        Math.min(100, Number(settings.mediumPercentage))
    );

    settings.doctorNamePercentage = Math.max(
        0,
        Math.min(100, Number(settings.doctorNamePercentage))
    );

    if (
        !Number.isFinite(settings.shortPercentage) ||
        !Number.isFinite(settings.mediumPercentage) ||
        !Number.isFinite(settings.doctorNamePercentage)
    ) {
        throw new Error("Review settings contain invalid percentage values.");
    }

    if (
        settings.shortPercentage +
        settings.mediumPercentage !==
        100
    ) {
        throw new Error(
            "Short and medium review percentages must total 100%."
        );
    }

    delete settings.detailedPercentage;
    delete settings.ollamaModel;
    delete settings.ollamaUrl;
    delete settings.serverPort;

    return settings;
}

async function getSettings() {
    await initializeDatabase();

    const result = await db.execute(
        "SELECT data FROM settings WHERE id = 1"
    );

    if (!result.rows.length) {
        await db.execute({
            sql: "INSERT INTO settings (id, data) VALUES (?, ?)",
            args: [
                1,
                JSON.stringify(defaultSettings)
            ]
        });

        return {
            ...defaultSettings
        };
    }

    let settings;

    try {
        settings = JSON.parse(
            result.rows[0].data
        );
    } catch {
        settings = {
            ...defaultSettings
        };
    }

    const original = JSON.stringify(settings);

    settings = normalizeSettings(settings);

    if (JSON.stringify(settings) !== original) {
        await saveSettings(settings);
    }

    return settings;
}

async function saveSettings(settings) {
    await initializeDatabase();

    settings = normalizeSettings(settings);

    await db.execute({
        sql: `
            INSERT INTO settings (id, data)
            VALUES (?, ?)
            ON CONFLICT(id)
            DO UPDATE SET data = excluded.data
        `,
        args: [
            1,
            JSON.stringify(settings)
        ]
    });

    return settings;
}

async function getDoctors() {
    const settings = await getSettings();

    return Array.isArray(settings.availableDoctors)
        ? settings.availableDoctors
        : [];
}

async function getHistory() {
    await initializeDatabase();

    const result = await db.execute(
        `
            SELECT data
            FROM history
            ORDER BY timestamp DESC
        `
    );

    return result.rows.map(row => {
        try {
            return JSON.parse(row.data);
        } catch {
            return null;
        }
    }).filter(Boolean);
}

async function saveReview(reviewData) {
    await initializeDatabase();

    const entry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...reviewData
    };

    await db.execute({
        sql: `
            INSERT INTO history
            (id, timestamp, data)
            VALUES (?, ?, ?)
        `,
        args: [
            entry.id,
            entry.timestamp,
            JSON.stringify(entry)
        ]
    });

    return entry;
}

async function deleteHistory(id) {
    await initializeDatabase();

    const result = await db.execute({
        sql: "DELETE FROM history WHERE id = ?",
        args: [
            String(id)
        ]
    });

    return Number(result.rowsAffected || 0) > 0;
}

module.exports = {
    getDoctors,
    getSettings,
    saveSettings,
    getHistory,
    saveReview,
    deleteHistory
};