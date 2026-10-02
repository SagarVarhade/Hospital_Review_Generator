document.addEventListener("DOMContentLoaded", () => {
    const generateBtn = document.getElementById("generateBtn");
    const generateAgainBtn = document.getElementById("generateAgainBtn");
    const copyBtn = document.getElementById("copyBtn");
    const loading = document.getElementById("loading");
    const errorMessage = document.getElementById("errorMessage");
    const resultSection = document.getElementById("resultSection");
    const generatedReview = document.getElementById("generatedReview");
    const filterGrid = document.getElementById("filterGrid");
    const addFilterBtn = document.getElementById("addFilterBtn");
    const addTopicForm = document.getElementById("addTopicForm");
    const newTopicInput = document.getElementById("newTopicInput");
    const confirmAddTopicBtn = document.getElementById("confirmAddTopicBtn");
    const cancelAddTopicBtn = document.getElementById("cancelAddTopicBtn");
    const selectedFilterCount = document.getElementById("selectedFilterCount");

    let settings = {
        hospitalName: "",
        doctorName: "",
        availableDoctors: [],
        doctorNamePercentage: 25,
        reviewTopics: []
    };

    async function loadSettings() {
        try {
            const response = await fetch("/settings");

            if (!response.ok) {
                throw new Error("Unable to load settings.");
            }

            const data = await response.json();

            const availableDoctors = Array.isArray(data.availableDoctors)
                ? data.availableDoctors
                : [];

            const configuredDoctor = String(data.doctorName || "").trim();

            const firstDoctor = availableDoctors.length > 0
                ? availableDoctors[0]
                : "";

            const selectedDoctor = configuredDoctor ||
                (
                    typeof firstDoctor === "string"
                        ? firstDoctor
                        : String(firstDoctor?.name || "")
                ).trim();

            const percentage = Number(data.doctorNamePercentage);

            const reviewTopics = Array.isArray(data.reviewTopics)
                ? data.reviewTopics
                    .map(topic => String(topic || "").trim())
                    .filter(Boolean)
                : [];

            settings = {
                hospitalName: String(data.hospitalName || "").trim(),
                doctorName: selectedDoctor,
                availableDoctors,
                doctorNamePercentage: Number.isFinite(percentage)
                    ? Math.max(0, Math.min(100, percentage))
                    : 25,
                reviewTopics
            };

            renderSavedTopics();

            console.log("Reviewly settings:", settings);
        } catch (error) {
            console.error("Settings loading error:", error);
        }
    }

    function updateFilterCount() {
        if (!selectedFilterCount) {
            return;
        }

        const count = document.querySelectorAll(
            'input[name="reviewFilter"]:checked'
        ).length;

        selectedFilterCount.textContent = count === 0
            ? "0 selected"
            : `${count} selected`;
    }

    function attachFilterListener(input) {
        if (!input) {
            return;
        }

        input.addEventListener("change", updateFilterCount);
    }

    function attachExistingTopicListeners() {
        document
            .querySelectorAll('input[name="reviewFilter"]')
            .forEach(attachFilterListener);
    }

    function getSelectedTopics() {
        return Array.from(
            document.querySelectorAll('input[name="reviewFilter"]:checked')
        ).map(input => input.value);
    }

    function getSelectedLanguage() {
        const selected = document.querySelector(
            'input[name="reviewLanguage"]:checked'
        );

        return selected ? selected.value : "English";
    }

    function showError(message) {
        if (!errorMessage) {
            return;
        }

        errorMessage.textContent = message || "Something went wrong.";
        errorMessage.style.display = "block";
    }

    function clearError() {
        if (!errorMessage) {
            return;
        }

        errorMessage.textContent = "";
        errorMessage.style.display = "none";
    }

    function setLoading(isLoading) {
        if (loading) {
            loading.style.display = isLoading ? "flex" : "none";
        }

        if (generateBtn) {
            generateBtn.disabled = isLoading;
        }

        if (generateAgainBtn) {
            generateAgainBtn.disabled = isLoading;
        }
    }

    function openAddTopicForm() {
        if (!addTopicForm) {
            return;
        }

        addTopicForm.style.display = "flex";

        if (newTopicInput) {
            newTopicInput.value = "";
            newTopicInput.focus();
        }
    }

    function closeAddTopicForm() {
        if (!addTopicForm) {
            return;
        }

        addTopicForm.style.display = "none";

        if (newTopicInput) {
            newTopicInput.value = "";
        }
    }

    function createTopicChip(topic, checked = false) {
        if (!filterGrid || !topic) {
            return null;
        }

        const existing = Array.from(
            document.querySelectorAll('input[name="reviewFilter"]')
        ).find(input =>
            input.value.trim().toLowerCase() === topic.trim().toLowerCase()
        );

        if (existing) {
            if (checked) {
                existing.checked = true;
            }
            return existing;
        }

        const label = document.createElement("label");
        label.className = "topic-chip new-topic";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = "reviewFilter";
        input.value = topic;
        input.checked = checked;

        const check = document.createElement("span");
        check.className = "chip-check";
        check.textContent = "✓";

        const text = document.createElement("span");
        text.textContent = topic;

        label.appendChild(input);
        label.appendChild(check);
        label.appendChild(text);

        if (addFilterBtn) {
            filterGrid.insertBefore(label, addFilterBtn);
        } else {
            filterGrid.appendChild(label);
        }

        attachFilterListener(input);

        return input;
    }

    function renderSavedTopics() {
        if (!Array.isArray(settings.reviewTopics)) {
            return;
        }

        settings.reviewTopics.forEach(topic => {
            createTopicChip(topic, false);
        });

        updateFilterCount();
    }

    async function saveReviewTopics() {
        const topics = Array.from(
            document.querySelectorAll('input[name="reviewFilter"]')
        )
            .map(input => input.value.trim())
            .filter(Boolean);

        const uniqueTopics = [];

        topics.forEach(topic => {
            const exists = uniqueTopics.some(
                item => item.toLowerCase() === topic.toLowerCase()
            );

            if (!exists) {
                uniqueTopics.push(topic);
            }
        });

        const response = await fetch("/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                reviewTopics: uniqueTopics
            })
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("Unable to save topic settings.");
        }

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to save topic settings."
            );
        }

        settings.reviewTopics = Array.isArray(data.settings?.reviewTopics)
            ? data.settings.reviewTopics
            : uniqueTopics;
    }

    async function addNewTopic() {
        if (!filterGrid || !newTopicInput) {
            return;
        }

        const cleanName = newTopicInput.value.trim();

        if (!cleanName) {
            newTopicInput.focus();
            return;
        }

        const existingTopics = Array.from(
            document.querySelectorAll('input[name="reviewFilter"]')
        );

        const existingInput = existingTopics.find(
            input =>
                input.value.trim().toLowerCase() === cleanName.toLowerCase()
        );

        if (existingInput) {
            const savedTopicExists = Array.isArray(settings.reviewTopics) &&
                settings.reviewTopics.some(
                    topic =>
                        String(topic).trim().toLowerCase() ===
                        cleanName.toLowerCase()
                );

            if (!savedTopicExists) {
                try {
                    await saveReviewTopics();
                    existingInput.checked = true;
                    updateFilterCount();
                    closeAddTopicForm();
                    return;
                } catch (error) {
                    console.error("Topic save error:", error);
                    showError(error.message || "Unable to save topic.");
                    return;
                }
            }

            showError("This topic already exists.");
            newTopicInput.focus();
            return;
        }

        clearError();

        createTopicChip(cleanName, true);

        try {
            await saveReviewTopics();
            updateFilterCount();
            closeAddTopicForm();
        } catch (error) {
            console.error("Topic save error:", error);
            showError(error.message || "Unable to save topic.");
        }
    }

    async function generateReview() {
        clearError();
        setLoading(true);

        try {
            if (!settings.hospitalName || !settings.doctorName) {
                await loadSettings();
            }

            if (!settings.hospitalName) {
                throw new Error(
                    "Please set the hospital name in Settings first."
                );
            }

            const language = getSelectedLanguage();
            const categories = getSelectedTopics();

            const finalCategories = categories.length > 0
                ? categories
                : ["General"];

            const doctorName = String(
                settings.doctorName || ""
            ).trim();

            const doctorNamePercentage = Number(
                settings.doctorNamePercentage
            );

            const requestBody = {
                hospitalName: settings.hospitalName,
                doctorName,
                doctorNamePercentage: Number.isFinite(
                    doctorNamePercentage
                )
                    ? Math.max(0, Math.min(100, doctorNamePercentage))
                    : 25,
                language,
                length: "short",
                categories: finalCategories,
                includeDoctor: Boolean(doctorName)
            };

            console.log("Generating review with:", requestBody);

            const response = await fetch("/generate-review", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    "Server returned an invalid response."
                );
            }

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to generate review."
                );
            }

            if (!data.review) {
                throw new Error(
                    "The server returned an empty review."
                );
            }

            if (generatedReview) {
                generatedReview.value = data.review;
            }

            if (resultSection) {
                resultSection.style.display = "block";

                resultSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            console.log(
                "Doctor included:",
                data.doctorIncluded
            );

            console.log(
                "Doctor percentage:",
                data.doctorNamePercentage
            );
        } catch (error) {
            console.error("Generation error:", error);
            showError(
                error.message || "Unable to generate review."
            );
        } finally {
            setLoading(false);
        }
    }

    async function copyReview() {
        const text = generatedReview
            ? generatedReview.value.trim()
            : "";

        if (!text) {
            showError("There is no review to copy.");
            return;
        }

        try {
            await navigator.clipboard.writeText(text);

            const originalText = copyBtn
                ? copyBtn.textContent
                : "⧉ Copy Review";

            if (copyBtn) {
                copyBtn.textContent = "✓ Copied";
            }

            setTimeout(() => {
                if (copyBtn) {
                    copyBtn.textContent = originalText;
                }
            }, 1500);
        } catch (error) {
            console.error("Copy error:", error);

            if (generatedReview) {
                generatedReview.focus();
                generatedReview.select();
                document.execCommand("copy");
            }

            if (copyBtn) {
                copyBtn.textContent = "✓ Copied";
            }

            setTimeout(() => {
                if (copyBtn) {
                    copyBtn.textContent = "⧉ Copy Review";
                }
            }, 1500);
        }
    }

    if (generateBtn) {
        generateBtn.addEventListener(
            "click",
            generateReview
        );
    }

    if (generateAgainBtn) {
        generateAgainBtn.addEventListener(
            "click",
            generateReview
        );
    }

    if (copyBtn) {
        copyBtn.addEventListener(
            "click",
            copyReview
        );
    }

    if (addFilterBtn) {
        addFilterBtn.addEventListener(
            "click",
            openAddTopicForm
        );
    }

    if (confirmAddTopicBtn) {
        confirmAddTopicBtn.addEventListener(
            "click",
            addNewTopic
        );
    }

    if (cancelAddTopicBtn) {
        cancelAddTopicBtn.addEventListener(
            "click",
            closeAddTopicForm
        );
    }

    if (newTopicInput) {
        newTopicInput.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    addNewTopic();
                }

                if (event.key === "Escape") {
                    event.preventDefault();
                    closeAddTopicForm();
                }
            }
        );
    }

    attachExistingTopicListeners();
    updateFilterCount();
    loadSettings();
});