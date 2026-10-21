const historyList = document.getElementById("historyList");
const emptyHistory = document.getElementById("emptyHistory");
const historyLoading = document.getElementById("historyLoading");
const historyCount = document.getElementById("historyCount");
const languageFilter = document.getElementById("languageFilter");

let allHistory = [];

async function loadHistory() {
    try {
        historyLoading.style.display = "block";
        historyLoading.textContent = "Loading history...";
        emptyHistory.style.display = "none";

        const response = await fetch("/history");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load review history.");
        }

        allHistory = Array.isArray(data) ? data : [];
        displayHistory();
    } catch (error) {
        console.error("History error:", error);
        historyLoading.textContent = "Unable to load review history.";
        historyLoading.style.display = "block";
    } finally {
        if (allHistory.length > 0) {
            historyLoading.style.display = "none";
        } else if (
            historyLoading.textContent !== "Unable to load review history."
        ) {
            historyLoading.style.display = "none";
        }
    }
}

function displayHistory() {
    const selectedLanguage = languageFilter
        ? languageFilter.value
        : "English";

    const filteredHistory = allHistory.filter(review => {
        return (
            String(review.language || "English").toLowerCase() ===
            selectedLanguage.toLowerCase()
        );
    });

    historyList.innerHTML = "";

    const count = filteredHistory.length;

    historyCount.textContent =
        `${count} ${count === 1 ? "review" : "reviews"}`;

    if (count === 0) {
        emptyHistory.style.display = "block";
        return;
    }

    emptyHistory.style.display = "none";

    filteredHistory.forEach(review => {
        historyList.appendChild(createHistoryItem(review));
    });
}

function createHistoryItem(review) {
    const item = document.createElement("div");
    item.className = "history-item";

    const date = formatDate(review.timestamp);
    const hospital = review.hospitalName || "Hospital";
    const language = review.language || "English";
    const length = review.length || "short";
    const doctor = review.doctorName || "";
    const text = review.review || "";

    item.innerHTML = `
        <div class="history-item-top">
            <strong>${escapeHtml(hospital)}</strong>
            <span class="history-item-date">${escapeHtml(date)}</span>
        </div>

        <div class="history-item-meta">
            <span class="history-tag">${escapeHtml(language)}</span>
            <span class="history-tag">${escapeHtml(length)}</span>
            ${doctor
                ? `<span class="history-tag">${escapeHtml(doctor)}</span>`
                : ""}
        </div>

        <div class="history-review">${escapeHtml(text)}</div>

        <div class="history-actions">
            <button class="history-copy" type="button">Copy</button>
            <button class="history-whatsapp" type="button">
                Send on WhatsApp
            </button>
            <button class="history-delete" type="button">Delete</button>
        </div>

        <div class="history-whatsapp-form" hidden>
            <label>Patient WhatsApp number</label>

            <div class="phone-input-group">
                <span class="country-code">🇮🇳 +91</span>
                <input
                    class="history-phone-number"
                    type="tel"
                    inputmode="numeric"
                    autocomplete="tel-national"
                    maxlength="10"
                    placeholder="Enter 10-digit number"
                    aria-label="Patient 10-digit Indian mobile number"
                >
            </div>

            <button class="history-send-whatsapp" type="button">
                Open WhatsApp Message
            </button>

            <p
                class="history-whatsapp-status"
                role="status"
                aria-live="polite"
            ></p>
        </div>
    `;

    // Copy review
    const copyButton = item.querySelector(".history-copy");

    copyButton.addEventListener("click", () => {
        copyReview(text, copyButton);
    });

    // Delete review
    const deleteButton = item.querySelector(".history-delete");

    deleteButton.addEventListener("click", () => {
        deleteReview(review.id);
    });

    // WhatsApp controls
    const whatsappButton = item.querySelector(".history-whatsapp");
    const whatsappForm = item.querySelector(".history-whatsapp-form");
    const phoneInput = item.querySelector(".history-phone-number");
    const sendWhatsAppButton = item.querySelector(
        ".history-send-whatsapp"
    );
    const whatsappStatus = item.querySelector(".history-whatsapp-status");

    whatsappButton.addEventListener("click", () => {
        whatsappForm.hidden = !whatsappForm.hidden;

        if (!whatsappForm.hidden) {
            phoneInput.focus();
        }
    });

    // Accept digits only, up to 10 digits.
    phoneInput.addEventListener("input", () => {
        phoneInput.value = phoneInput.value
            .replace(/\D/g, "")
            .slice(0, 10);
    });

    sendWhatsAppButton.addEventListener("click", () => {
        const number = phoneInput.value.trim();

        if (!text.trim()) {
            whatsappStatus.textContent =
                "This saved review has no text.";
            return;
        }

        if (!/^[6-9]\d{9}$/.test(number)) {
            whatsappStatus.textContent =
                "Enter a valid 10-digit Indian mobile number.";

            phoneInput.focus();
            return;
        }

        // WhatsApp message contains only the review text.
        const message = text.trim();

        const whatsappUrl =
            "https://wa.me/91" +
            number +
            "?text=" +
            encodeURIComponent(message);

        const whatsappWindow = window.open(
            whatsappUrl,
            "_blank"
        );

        if (whatsappWindow) {
            whatsappStatus.textContent =
                "WhatsApp opened with the review ready to send.";
        } else {
            whatsappStatus.textContent =
                "Allow pop-ups to open WhatsApp.";
        }
    });

    return item;
}

async function copyReview(text, button) {
    if (!text) {
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const temporary = document.createElement("textarea");

        temporary.value = text;
        document.body.appendChild(temporary);
        temporary.select();
        document.execCommand("copy");
        temporary.remove();
    }

    const original = button.textContent;
    button.textContent = "Copied ✓";

    setTimeout(() => {
        button.textContent = original;
    }, 1500);
}

async function deleteReview(id) {
    const confirmed = confirm("Delete this saved review?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `/history/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to delete review."
            );
        }

        allHistory = allHistory.filter(
            review => String(review.id) !== String(id)
        );

        displayHistory();
    } catch (error) {
        console.error("Delete history error:", error);
        alert(error.message || "Unable to delete review.");
    }
}

function formatDate(timestamp) {
    if (!timestamp) {
        return "";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
}

if (languageFilter) {
    languageFilter.addEventListener("change", displayHistory);
}

loadHistory();