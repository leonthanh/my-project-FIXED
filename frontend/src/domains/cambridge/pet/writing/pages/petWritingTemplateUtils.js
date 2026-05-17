const PART1_TEMPLATE_ID = "pet-email-v1";
const QUESTION2_TEMPLATE_ID = "pet-article-v1";
const QUESTION3_TEMPLATE_ID = "pet-story-v1";

export const defaultPetPart1Fields = Object.freeze({
	promptIntro: "Read this email and the notes you have made.",
	from: "Miss Jones",
	to: "All students",
	subject: "Visitor to English class",
	greeting: "Dear Students,",
	body1: "I want to invite a special guest to our English class next month.",
	body2: "Should we ask a scientist or an actor to visit us? Tell me which person would be more interesting for the class.",
	body3: "I also want everyone to prepare one question for our visitor. What would you like to ask?",
	body4: "Finally, can you suggest something fun we could do for the visitor after the talk?",
	closing: "I am looking forward to reading your ideas.",
	signature: "Miss Jones",
	note1: "Great!",
	note2: "I think ...",
	note3: "Tell Miss Jones",
	note4: "Suggest ...",
	answerInstruction: "Write your email using all the notes.",
});

export const defaultPetQuestion2Fields = Object.freeze({
	promptLead: "You see this announcement in an English-language magazine.",
	badge: "Articles wanted",
	title: "Computer games",
	line1: "Do you and your friends enjoy playing computer games?",
	line2: "What are the good and bad things about computer games?",
	footer: "The best articles answering these questions will appear in our next magazine.",
	answerInstruction: "Write your article.",
});

export const defaultPetQuestion3Fields = Object.freeze({
	promptLead: "Your English teacher has asked you to write a story.",
	promptSupport: "Your story must begin with this sentence.",
	storyStarter: "When I opened the door, everyone in the room looked at me.",
	answerInstruction: "Write your story.",
});

const escapeHtml = (value = "") =>
	String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");

const renderText = (value = "") => escapeHtml(value).replace(/\n/g, "<br />");

const encodeTemplateFields = (fields) => encodeURIComponent(JSON.stringify(fields));

const decodeTemplateFields = (value) => {
	if (!value) {
		return null;
	}

	try {
		return JSON.parse(decodeURIComponent(value));
	} catch (error) {
		console.error("Unable to decode PET writing template fields", error);
		return null;
	}
};

const readTemplateFields = (html, templateId, defaults) => {
	if (!html || typeof DOMParser === "undefined") {
		return null;
	}

	try {
		const document = new DOMParser().parseFromString(html, "text/html");
		const root = document.body.querySelector(`[data-pet-template="${templateId}"]`);
		if (!root) {
			return null;
		}

		const fields = decodeTemplateFields(root.getAttribute("data-template-fields"));
		if (!fields || typeof fields !== "object") {
			return null;
		}

		return { ...defaults, ...fields };
	} catch (error) {
		console.error("Unable to parse PET writing template HTML", error);
		return null;
	}
};

const renderEmailParagraph = (value = "") => {
	if (!String(value || "").trim()) {
		return "";
	}

	return `<p style="margin:0 0 12px;font-size:15px;line-height:1.8;color:#1f2937;">${renderText(value)}</p>`;
};

const renderCallout = (text, boxStyle, lineStyle) => {
	if (!String(text || "").trim()) {
		return "";
	}

	return `
		<div style="position:absolute;${boxStyle}padding:8px 10px;border-radius:14px;border:1px solid #fdba74;background:#fff7ed;color:#9a3412;font-size:12px;font-weight:700;line-height:1.45;box-shadow:0 10px 22px rgba(154, 52, 18, 0.08);">${renderText(text)}</div>
		<div style="position:absolute;${lineStyle}border-top:2px solid #94a3b8;"></div>
	`;
};

export const buildPetPart1Html = (fields) => {
	const merged = { ...defaultPetPart1Fields, ...fields };
	const encodedFields = encodeTemplateFields(merged);

	return `
		<div data-pet-template="${PART1_TEMPLATE_ID}" data-template-fields="${encodedFields}" style="font-family:Arial, Helvetica, sans-serif;color:#0f172a;line-height:1.65;">
			<div style="display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Part 1</div>
			<p style="margin:14px 0 4px;font-size:15px;color:#334155;"><strong>You must answer this question.</strong></p>
			<p style="margin:0 0 18px;font-size:15px;color:#475569;">Write your answer in about 100 words on the answer sheet.</p>
			<div style="margin-bottom:16px;font-size:24px;font-weight:800;color:#0f172a;">Question 1</div>
			<p style="margin:0 0 18px;font-size:15px;color:#334155;">${renderText(merged.promptIntro)}</p>
			<div style="position:relative;margin:0 0 20px;padding:10px 112px 12px 92px;">
				<div style="overflow:hidden;border:2px solid #0f172a;border-radius:20px;background:#ffffff;box-shadow:0 18px 34px rgba(15, 23, 42, 0.12);">
					<div style="padding:10px 16px;background:linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Email</div>
					<div style="padding:18px 18px 10px;">
						<div style="display:grid;gap:10px;margin-bottom:16px;">
							<div style="display:grid;grid-template-columns:92px minmax(0, 1fr);gap:10px;font-size:14px;">
								<div style="font-weight:700;color:#334155;">From</div>
								<div style="color:#0f172a;">${renderText(merged.from)}</div>
							</div>
							<div style="display:grid;grid-template-columns:92px minmax(0, 1fr);gap:10px;font-size:14px;">
								<div style="font-weight:700;color:#334155;">To</div>
								<div style="color:#0f172a;">${renderText(merged.to)}</div>
							</div>
							<div style="display:grid;grid-template-columns:92px minmax(0, 1fr);gap:10px;font-size:14px;">
								<div style="font-weight:700;color:#334155;">Subject</div>
								<div style="color:#0f172a;">${renderText(merged.subject)}</div>
							</div>
						</div>
						<div style="height:1px;background:#cbd5e1;margin:0 0 14px;"></div>
						<p style="margin:0 0 12px;font-size:15px;line-height:1.8;color:#1f2937;">${renderText(merged.greeting)}</p>
						${renderEmailParagraph(merged.body1)}
						${renderEmailParagraph(merged.body2)}
						${renderEmailParagraph(merged.body3)}
						${renderEmailParagraph(merged.body4)}
						<p style="margin:0 0 12px;font-size:15px;line-height:1.8;color:#1f2937;">${renderText(merged.closing)}</p>
						<p style="margin:0;font-size:15px;line-height:1.8;color:#1f2937;"><strong>${renderText(merged.signature)}</strong></p>
					</div>
				</div>
				${renderCallout(merged.note1, "left:0;top:148px;max-width:82px;text-align:right;", "left:68px;top:167px;width:76px;transform:rotate(-8deg);transform-origin:left center;")}
				${renderCallout(merged.note2, "right:0;top:92px;max-width:94px;", "right:74px;top:116px;width:94px;transform:rotate(10deg);transform-origin:right center;")}
				${renderCallout(merged.note3, "right:0;top:204px;max-width:102px;", "right:82px;top:227px;width:102px;transform:rotate(2deg);transform-origin:right center;")}
				${renderCallout(merged.note4, "right:0;bottom:40px;max-width:94px;", "right:76px;bottom:70px;width:94px;transform:rotate(-8deg);transform-origin:right center;")}
			</div>
			<p style="margin:0;font-size:15px;color:#334155;"><strong>${renderText(merged.answerInstruction)}</strong></p>
		</div>
	`;
};

export const buildPetQuestion2Html = (fields) => {
	const merged = { ...defaultPetQuestion2Fields, ...fields };
	const encodedFields = encodeTemplateFields(merged);

	return `
		<div data-pet-template="${QUESTION2_TEMPLATE_ID}" data-template-fields="${encodedFields}" style="font-family:Arial, Helvetica, sans-serif;color:#0f172a;line-height:1.65;">
			<div style="display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;background:#ede9fe;color:#5b21b6;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Part 2</div>
			<p style="margin:14px 0 8px;font-size:15px;color:#475569;">Answer one of the questions 2 or 3. Write your answer in about 100 words on the answer sheet.</p>
			<div style="margin-bottom:14px;font-size:24px;font-weight:800;color:#0f172a;">Question 2</div>
			<p style="margin:0 0 18px;font-size:15px;color:#334155;">${renderText(merged.promptLead)}</p>
			<div style="overflow:hidden;border:2px solid #1d4ed8;border-radius:20px;background:#ffffff;box-shadow:0 18px 34px rgba(37, 99, 235, 0.12);">
				<div style="padding:10px 16px;background:linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">${renderText(merged.badge)}</div>
				<div style="padding:22px 20px;">
					<div style="margin:0 0 14px;font-size:29px;font-weight:800;line-height:1.1;text-align:center;color:#0f172a;">${renderText(merged.title)}</div>
					<p style="margin:0 0 10px;font-size:16px;line-height:1.75;color:#1f2937;text-align:center;">${renderText(merged.line1)}</p>
					<p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#1f2937;text-align:center;">${renderText(merged.line2)}</p>
					<div style="height:1px;background:#cbd5e1;margin:0 0 16px;"></div>
					<p style="margin:0;font-size:14px;line-height:1.7;color:#475569;text-align:center;">${renderText(merged.footer)}</p>
				</div>
			</div>
			<p style="margin:16px 0 0;font-size:15px;color:#334155;"><strong>${renderText(merged.answerInstruction)}</strong></p>
		</div>
	`;
};

export const buildPetQuestion3Html = (fields) => {
	const merged = { ...defaultPetQuestion3Fields, ...fields };
	const encodedFields = encodeTemplateFields(merged);

	return `
		<div data-pet-template="${QUESTION3_TEMPLATE_ID}" data-template-fields="${encodedFields}" style="font-family:Arial, Helvetica, sans-serif;color:#0f172a;line-height:1.65;">
			<div style="display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;background:#ede9fe;color:#5b21b6;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Part 2</div>
			<p style="margin:14px 0 8px;font-size:15px;color:#475569;">Answer one of the questions 2 or 3. Write your answer in about 100 words on the answer sheet.</p>
			<div style="margin-bottom:14px;font-size:24px;font-weight:800;color:#0f172a;">Question 3</div>
			<div style="border:1px solid #cbd5e1;border-radius:20px;background:linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);box-shadow:0 18px 34px rgba(15, 23, 42, 0.08);padding:22px 20px;">
				<p style="margin:0 0 10px;font-size:15px;color:#334155;">${renderText(merged.promptLead)}</p>
				<p style="margin:0 0 16px;font-size:15px;color:#334155;">${renderText(merged.promptSupport)}</p>
				<div style="padding:18px 20px;border-radius:18px;border:1px dashed #94a3b8;background:#ffffff;font-family:Georgia, 'Times New Roman', serif;font-size:22px;line-height:1.6;color:#0f172a;box-shadow:inset 0 1px 2px rgba(15, 23, 42, 0.04);">${renderText(merged.storyStarter)}</div>
			</div>
			<p style="margin:16px 0 0;font-size:15px;color:#334155;"><strong>${renderText(merged.answerInstruction)}</strong></p>
		</div>
	`;
};

export const parsePetPart1Fields = (html) => readTemplateFields(html, PART1_TEMPLATE_ID, defaultPetPart1Fields);

export const parsePetQuestion2Fields = (html) =>
	readTemplateFields(html, QUESTION2_TEMPLATE_ID, defaultPetQuestion2Fields);

export const parsePetQuestion3Fields = (html) =>
	readTemplateFields(html, QUESTION3_TEMPLATE_ID, defaultPetQuestion3Fields);