const express = require("express");
const path = require("path");
const config = require("./config");
const { buildPrompt } = require("./promptBuilder");
const { generateWithOllama, checkOllama, checkModel } = require("./ollama");
const { getDoctors, getSettings, saveSettings, getHistory, saveReview, deleteHistory } = require("./storage");
const app = express();

app.use(express.json({ limit: "1mb" }));

const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

app.use(express.static(FRONTEND_DIR));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            FRONTEND_DIR,
            "index.html"
        )
    );
});

app.get("/settings", async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (error) {
        console.error("Settings error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load settings."
        });
    }
});

app.post("/settings", async (req, res) => {
    try {
        const currentSettings = await getSettings();

        const newSettings = {
            ...currentSettings,
            ...req.body
        };

        const saved = await saveSettings(newSettings);

        res.json({
            success: true,
            settings: saved
        });
    } catch (error) {
        console.error("Save settings error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to save settings."
        });
    }
});

app.get("/doctors", async (req, res) => {
    try {
        const doctors = await getDoctors();
        res.json(doctors);
    } catch (error) {
        console.error("Doctors error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load doctors."
        });
    }
});

app.get("/history", async (req, res) => {
    try {
        const history = await getHistory();
        res.json(history);
    } catch (error) {
        console.error("History error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load history."
        });
    }
});

app.delete("/history/:id", async (req, res) => {
    try {
        const deleted = await deleteHistory(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "History item not found."
            });
        }

        res.json({
            success: true
        });
    } catch (error) {
        console.error("Delete history error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to delete history item."
        });
    }
});

app.post("/generate-review", async (req, res) => {
    const startTime = Date.now();

    try {
        const {
            doctorName,
            language,
            categories,
            includeDoctor
        } = req.body;

        const settings = await getSettings();

        const hospitalName = String(
            settings.hospitalName || ""
        ).trim();

        if (!hospitalName) {
            return res.status(400).json({
                success: false,
                message: "Please set the hospital name in Settings."
            });
        }

        const selectedLanguage = language || "English";

        if (!["English", "Marathi", "Hindi"].includes(selectedLanguage)) {
            return res.status(400).json({
                success: false,
                message: "Unsupported language."
            });
        }

        const shortPercentage = Number(settings.shortPercentage);
        const mediumPercentage = Number(settings.mediumPercentage);

        if (
            !Number.isFinite(shortPercentage) ||
            !Number.isFinite(mediumPercentage) ||
            shortPercentage < 0 ||
            mediumPercentage < 0 ||
            shortPercentage + mediumPercentage !== 100
        ) {
            return res.status(500).json({
                success: false,
                message: "Review length percentages are not configured correctly."
            });
        }

        const lengthRandom = Math.random() * 100;
        const selectedLength =
            lengthRandom < shortPercentage
                ? "short"
                : "medium";

        const doctorNamePercentage = settings.doctorNamePercentage;

        const percentageValue = Number(doctorNamePercentage);
        const doctorPercentage = Number.isFinite(percentageValue)
            ? Math.max(0, Math.min(100, percentageValue))
            : 100;
        const doctorAvailable = Boolean(
            doctorName &&
            String(doctorName).trim()
        );
        const requestedDoctor = Boolean(includeDoctor);
        const includeDoctorForThisReview =
            doctorAvailable &&
            requestedDoctor &&
            doctorPercentage > 0 &&
            (
                doctorPercentage >= 100 ||
                Math.random() * 100 < doctorPercentage
            );

        const recentReviews = await getHistory();

        const prompt = await buildPrompt({
            hospitalName,
            doctorName: doctorName || "",
            language: selectedLanguage,
            length: selectedLength,
            categories: categories || ["Overall experience"],
            includeDoctor: includeDoctorForThisReview,
            recentReviews
        });

        console.log(
            `Generating ${selectedLength} ${selectedLanguage} review with Gemini...`
        );

        const generationStart = Date.now();
        const finalReview = await generateWithOllama(prompt);
        const generationTime = Date.now() - generationStart;

        console.log(
            `Gemini generation: ${generationTime} ms`
        );

        if (!finalReview || !finalReview.trim()) {
            throw new Error("Gemini returned an empty review.");
        }

        console.log("Final review:", finalReview);

        const savedReview = await saveReview({
            hospitalName,
            doctorName: includeDoctorForThisReview
                ? doctorName || ""
                : "",
            language: selectedLanguage,
            length: selectedLength,
            categories: categories || [],
            review: finalReview.trim()
        });

        const totalTime = Date.now() - startTime;

        console.log(
            `Review generated in ${totalTime} ms`
        );

        res.json({
            success: true,
            review: finalReview.trim(),
            language: selectedLanguage,
            length: selectedLength,
            doctorIncluded: includeDoctorForThisReview,
            doctorNamePercentage: doctorPercentage,
            historyId: savedReview.id,
            generationTimeMs: totalTime
        });
    } catch (error) {
        console.error("Review generation error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Unable to generate review."
        });
    }
});

app.get("/health", async (req, res) => {
    try {
        const geminiAvailable = await checkOllama();
        const modelAvailable = await checkModel();

        res.json({
            success: true,
            server: {
                host: config.server.host,
                port: config.server.port
            },
            gemini: {
                available: geminiAvailable,
                modelAvailable
            }
        });
    } catch (error) {
        console.error("Health check error:", error);

        res.status(500).json({
            success: false,
            message: "Health check failed."
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found."
    });
});

app.use((error, req, res, next) => {
    console.error("Unhandled server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

app.listen(
    config.server.port,
    config.server.host,
    () => {
        console.log("");
        console.log("==========================================");
        console.log("        Reviewly Server Started");
        console.log("==========================================");
        console.log(
            `Server: http://localhost:${config.server.port}`
        );
        console.log(
            "Gemini: configured"
        );
        console.log("==========================================");
        console.log("");
    }
);