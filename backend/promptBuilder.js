function buildTopicRules(topics) {
    const rules = [];
    for (const topic of topics) {
        const t = topic.toLowerCase();
        if (t === "diabetes") {
            rules.push(`DIABETES:
- Focus only on diabetes-related consultation, explanation, or general diabetes care.
- Use simple everyday wording.
- Keep the meaning general and editable.
- Do NOT mention staff, cleanliness, facilities, reception, waiting area, billing, rooms, medicines, sugar readings, diagnosis, treatment results, recovery, or cure.`);
        } else if (t === "hypertension") {
            rules.push(`HYPERTENSION:
- Focus only on blood pressure or hypertension-related consultation, explanation, or general care.
- Use simple everyday wording.
- Keep the meaning general and editable.
- Do NOT mention staff, cleanliness, facilities, reception, waiting area, billing, rooms, medicines, BP readings, diagnosis, treatment results, recovery, or cure.`);
        } else if (t === "staff") {
            rules.push(`STAFF:
- Focus only on general staff behaviour.
- You may use simple words such as polite, helpful, supportive, friendly, or cooperative.
- Do NOT mention diabetes, hypertension, medical treatment, medicines, facilities, cleanliness, billing, reception, or waiting time unless another selected topic requires it.`);
        } else if (t === "ipd facility") {
            rules.push(`IPD FACILITY:
- Focus only on the general IPD facility or environment.
- Use simple everyday wording.
- Keep the description general.
- Do NOT invent rooms, beds, equipment, services, staff actions, treatment, admission details, or patient experiences.`);
        } else if (t === "general") {
            rules.push(`GENERAL:
- Keep the review generally about the hospital.
- Use simple everyday wording.
- Do not introduce specific medical conditions, medicines, treatments, facilities, or patient outcomes.`);
        } else {
            rules.push(`${topic.toUpperCase()}:
- Focus only on this selected topic.
- Use simple everyday wording.
- Keep the description general and editable.
- Do not introduce unrelated hospital topics or invented specific facts.`);
        }
    }
    return rules.join("\n");
}
function buildLanguageRules(language) {
    if (language === "Marathi") {
        return `MARATHI OUTPUT RULES:
- Write the final review directly in natural Marathi using only English alphabet letters.
- Do NOT use Devanagari script.
- Do NOT write English sentences and call them Marathi.
- Use simple everyday Marathi commonly used in Maharashtra.
- Prefer natural spoken wording over formal Marathi.
- Keep spelling readable in Roman Marathi.
- Avoid literary, bureaucratic, technical, or overly formal vocabulary.
- Do not translate word-for-word from English.
- The final output must look like a person naturally writing Marathi in English letters.`;
    }
    if (language === "Hindi") {
        return `HINDI OUTPUT RULES:
- Write the final review directly in natural Hindi using only English alphabet letters.
- Do NOT use Devanagari script.
- Do NOT write English sentences and call them Hindi.
- Use simple everyday Hindi.
- Prefer natural spoken wording over formal Hindi.
- Keep spelling readable in Roman Hindi.
- Avoid literary, bureaucratic, technical, or overly formal vocabulary.
- Do not translate word-for-word from English.
- The final output must look like a person naturally writing Hindi in English letters.`;
    }
    return `ENGLISH OUTPUT RULES:
- Write natural everyday English.
- Use simple words that people commonly use.
- Avoid formal, literary, technical, bureaucratic, or complicated vocabulary.`;
}
function buildVariationRules(recentReviews, variationSeed) {
    const reviews = Array.isArray(recentReviews)
        ? recentReviews
            .map(item => typeof item === "string" ? item : item?.review)
            .filter(Boolean)
            .slice(0, 8)
        : [];
    const historyPart = reviews.length > 0
        ? `RECENT REVIEWS TO AVOID COPYING:
${reviews.map((review, index) => `${index + 1}. ${review}`).join("\n")}
- Do not copy wording, sentence openings, sentence structure, or distinctive phrases from these reviews.
- Produce clearly different wording while keeping the same selected topic and constraints.`
        : `RECENT REVIEW HISTORY:
- No previous review text was supplied.
- Still create fresh wording and do not rely on a fixed template.`;
    return `DYNAMIC VARIATION:
- Every generation must use fresh wording.
- Do not use a fixed review template.
- Change the sentence opening, sentence structure, and natural word choices from one generation to another.
- Do not repeatedly begin with the same phrase.
- Do not repeatedly use the same sequence of ideas.
- Keep the meaning connected to the selected topic.
- Variation must come from natural language generation, not invented facts.
- Runtime variation seed: ${variationSeed}
${historyPart}`;
}
async function buildPrompt({
    hospitalName,
    doctorName,
    language,
    length,
    categories,
    includeDoctor,
    recentReviews = []
}) {
    const topics = Array.isArray(categories) && categories.length > 0
        ? categories.filter(Boolean)
        : ["General"];
    const topicText = topics.join(", ");
    const topicRules = buildTopicRules(topics);
    const languageRules = buildLanguageRules(language || "English");
    const variationSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const variationRules = buildVariationRules(recentReviews, variationSeed);
    const doctorPart = doctorName && includeDoctor
        ? `MANDATORY DOCTOR RULE:
- You MUST include the exact doctor name "${doctorName}" exactly once.
- The doctor name must appear naturally in the review.
- Do not repeat the doctor name.
- Do not add qualifications, specialties, achievements, behaviour, treatment details, or any other information about the doctor unless it is explicitly provided.`
        : `DOCTOR RULE:
- Do not mention any doctor.`;
    return `Create ONE short hospital review draft.
STRICT OUTPUT:
- Write either ONE long complete sentence OR TWO short complete sentences.
- Never write more than 2 sentences.
- Keep the review approximately 15-30 words.
- Use simple, natural, everyday wording.
- Make it sound like a normal person wrote it.
- Avoid formal or artificial wording.
- Return ONLY the review text.
- No heading, bullets, quotes, explanation, labels, or extra text.
SELECTED TOPICS:
${topicText}
STRICT TOPIC CONTROL:
- Write ONLY about the selected topic or topics.
- If only ONE topic is selected, write ONLY about that topic.
- If multiple topics are selected, naturally combine ONLY those selected topics.
- Do NOT automatically add staff, cleanliness, facilities, doctors, reception, waiting area, billing, or general hospital experience.
- Do NOT use a generic hospital-review template.
- Do NOT add another topic simply because it sounds natural.
- Every sentence must remain directly related to the selected topic.
NATURAL LANGUAGE:
- Use common words that people normally use in everyday conversation.
- Prefer simple words over formal synonyms.
- Keep sentences short and easy to understand.
- Avoid repetitive phrases.
- Avoid unnatural promotional language.
- Avoid exaggerated praise.
- Do not make the review sound like an advertisement.
- Do not use unnecessarily formal medical language.
- Do not use complicated grammar.
${languageRules}
${variationRules}
NO FICTIONAL PATIENT EXPERIENCE:
- Do NOT create a fictional patient story.
- Do NOT write fictional first-person experiences.
- Do NOT write phrases such as "I visited", "I had", "my experience", "I was treated", "during my visit", "I felt", or similar invented patient experiences.
- Keep the wording general and editable.
NO INVENTED FACTS:
- Do not invent medicines.
- Do not invent treatments.
- Do not invent diagnoses.
- Do not invent medical results.
- Do not invent recovery or cure.
- Do not invent fees.
- Do not invent waiting times.
- Do not invent conversations.
- Do not invent facilities or equipment.
- Do not invent patient details.
- Do not invent doctor qualifications or medical claims.
${topicRules}
${doctorPart}
HOSPITAL:
${hospitalName || "Hospital"}
LANGUAGE:
${language || "English"}
REVIEW LENGTH:
${length || "short"}
FINAL CHECK BEFORE OUTPUT:
- Maximum 2 sentences.
- Either 1 long sentence or 2 short sentences.
- Approximately 15-30 words.
- Only selected topics.
- Use the requested language directly.
- Marathi and Hindi must use only Roman/English letters.
- Use fresh wording for this generation.
- Do not copy previous wording when previous reviews are supplied.
- Doctor name included exactly once when mandatory.
- No doctor mentioned when doctor is not selected for inclusion.
- No fictional patient story.
- No unrelated topics.
- No invented facts.
- No formal or complicated wording.
- Return only the review.`;
}
module.exports = {
    buildPrompt
};