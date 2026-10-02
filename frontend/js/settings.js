const hospitalNameInput = document.getElementById("hospitalName");
const doctorNameInput = document.getElementById("doctorName");
const addDoctorBtn = document.getElementById("addDoctorBtn");
const doctorList = document.getElementById("doctorList");
const shortPercentage = document.getElementById("shortPercentage");
const mediumPercentage = document.getElementById("mediumPercentage");
const doctorNamePercentage = document.getElementById("doctorNamePercentage");
const percentageMessage = document.getElementById("percentageMessage");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const saveMessage = document.getElementById("saveMessage");
let doctors = [];
let reviewTopics = [];

async function loadSettings() {
    try {
        const response = await fetch("/settings");
        const settings = await response.json();

        if (!response.ok) {
            throw new Error(settings.message || "Unable to load settings.");
        }

        hospitalNameInput.value = settings.hospitalName || "";
        shortPercentage.value = settings.shortPercentage ?? 100;
        mediumPercentage.value = settings.mediumPercentage ?? 0;
        doctorNamePercentage.value = settings.doctorNamePercentage ?? 100;
        doctors = Array.isArray(settings.availableDoctors) ? settings.availableDoctors : [];
        reviewTopics = Array.isArray(settings.reviewTopics) ? settings.reviewTopics : [];

        renderDoctors();
        validatePercentages();
    } catch (error) {
        console.error("Settings loading error:", error);
        saveMessage.textContent = error.message || "Unable to load settings.";
        saveMessage.className = "save-message error";
    }
}

function renderDoctors() {
    doctorList.innerHTML = "";

    if (doctors.length === 0) {
        doctorList.innerHTML = `
            <div class="no-doctors">
                No doctors added yet.
            </div>
        `;
        return;
    }

    doctors.forEach((doctor, index) => {
        const doctorItem = document.createElement("div");
        doctorItem.className = "doctor-item";

        const name = typeof doctor === "string" ? doctor : doctor.name;

        doctorItem.innerHTML = `
            <span>${escapeHtml(name)}</span>
            <button type="button" class="remove-doctor-btn" data-index="${index}">Remove</button>
        `;

        const removeButton = doctorItem.querySelector(".remove-doctor-btn");
        removeButton.addEventListener("click", () => removeDoctor(index));

        doctorList.appendChild(doctorItem);
    });
}

async function persistDoctors() {
    try {
        const response = await fetch("/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                availableDoctors: doctors,
                reviewTopics
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to save doctors.");
        }

        doctors = Array.isArray(data.settings?.availableDoctors)
            ? data.settings.availableDoctors
            : doctors;

        reviewTopics = Array.isArray(data.settings?.reviewTopics)
            ? data.settings.reviewTopics
            : reviewTopics;

        renderDoctors();
    } catch (error) {
        console.error("Doctor save error:", error);
        alert(error.message || "Unable to save doctors.");
    }
}

async function addDoctor() {
    const name = doctorNameInput.value.trim();

    if (!name) {
        doctorNameInput.focus();
        return;
    }

    const exists = doctors.some(doctor => {
        const existingName = typeof doctor === "string" ? doctor : doctor.name;
        return String(existingName || "").toLowerCase() === name.toLowerCase();
    });

    if (exists) {
        alert("This doctor is already added.");
        return;
    }

    doctors.push({
        id: Date.now(),
        name
    });

    doctorNameInput.value = "";
    renderDoctors();

    await persistDoctors();
}

async function removeDoctor(index) {
    if (index < 0 || index >= doctors.length) {
        return;
    }

    const doctor = doctors[index];
    const name = typeof doctor === "string" ? doctor : doctor.name;
    const confirmed = confirm(`Remove ${name} from the doctor list?`);

    if (!confirmed) {
        return;
    }

    doctors.splice(index, 1);
    renderDoctors();

    await persistDoctors();
}

function validatePercentages() {
    const short = Number(shortPercentage.value);
    const medium = Number(mediumPercentage.value);
    const doctor = Number(doctorNamePercentage.value);

    if (!Number.isFinite(short) || short < 0 || short > 100) {
        return false;
    }

    if (!Number.isFinite(medium) || medium < 0 || medium > 100) {
        return false;
    }

    if (short + medium !== 100) {
        return false;
    }

    if (!Number.isFinite(doctor) || doctor < 0 || doctor > 100) {
        return false;
    }

    if (percentageMessage) {
        percentageMessage.textContent = "Percentage settings are valid.";
        percentageMessage.className = "settings-message success";
    }

    return true;
}

async function saveSettings() {
    saveMessage.textContent = "";
    saveMessage.className = "save-message";

    if (!validatePercentages()) {
        return;
    }

    const settings = {
        hospitalName: hospitalNameInput.value.trim(),
        availableDoctors: doctors,
        reviewTopics,
        shortPercentage: Number(shortPercentage.value),
        mediumPercentage: Number(mediumPercentage.value),
        doctorNamePercentage: Number(doctorNamePercentage.value)
    };

    if (!settings.hospitalName) {
        saveMessage.textContent = "Please enter the hospital name.";
        saveMessage.className = "save-message error";
        hospitalNameInput.focus();
        return;
    }

    saveSettingsBtn.disabled = true;
    saveSettingsBtn.textContent = "Saving...";

    try {
        const response = await fetch("/settings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(settings)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to save settings.");
        }

        if (data.settings) {
            if (data.settings.hospitalName !== undefined) {
                hospitalNameInput.value = data.settings.hospitalName;
            }

            if (data.settings.shortPercentage !== undefined) {
                shortPercentage.value = data.settings.shortPercentage;
            }

            if (data.settings.mediumPercentage !== undefined) {
                mediumPercentage.value = data.settings.mediumPercentage;
            }

            if (data.settings.doctorNamePercentage !== undefined) {
                doctorNamePercentage.value = data.settings.doctorNamePercentage;
            }

            if (Array.isArray(data.settings.availableDoctors)) {
                doctors = data.settings.availableDoctors;
                renderDoctors();
            }

            if (Array.isArray(data.settings.reviewTopics)) {
                reviewTopics = data.settings.reviewTopics;
            }
        }

        saveMessage.textContent = "Settings saved successfully.";
        saveMessage.className = "save-message success";
    } catch (error) {
        console.error("Settings save error:", error);
        saveMessage.textContent = error.message || "Unable to save settings.";
        saveMessage.className = "save-message error";
    } finally {
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.textContent = "Save Settings";
    }
}

if (addDoctorBtn) {
    addDoctorBtn.addEventListener("click", addDoctor);
}

if (doctorNameInput) {
    doctorNameInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            addDoctor();
        }
    });
}

if (shortPercentage) {
    shortPercentage.addEventListener("input", validatePercentages);
}

if (mediumPercentage) {
    mediumPercentage.addEventListener("input", validatePercentages);
}

if (doctorNamePercentage) {
    doctorNamePercentage.addEventListener("input", validatePercentages);
}

if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", saveSettings);
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
}

loadSettings();