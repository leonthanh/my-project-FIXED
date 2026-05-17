const PART1_TEMPLATE_ID = "pet-email-v1";
const QUESTION2_TEMPLATE_ID = "pet-article-v1";
const QUESTION3_TEMPLATE_ID = "pet-story-v1";

export const PET_PART1_NOTE_POSITIONS = Object.freeze({
	note1: Object.freeze({
		defaultBoxX: 7,
		defaultBoxY: 46,
		maxWidth: 88,
		textAlign: "right",
		boxBounds: Object.freeze({ minX: 5, maxX: 18, minY: 18, maxY: 86 }),
		anchorBounds: Object.freeze({ minX: 22, maxX: 78, minY: 18, maxY: 86 }),
	}),
	note2: Object.freeze({
		defaultBoxX: 93,
		defaultBoxY: 28,
		maxWidth: 100,
		textAlign: "left",
		boxBounds: Object.freeze({ minX: 82, maxX: 96, minY: 14, maxY: 44 }),
		anchorBounds: Object.freeze({ minX: 22, maxX: 78, minY: 18, maxY: 86 }),
	}),
	note3: Object.freeze({
		defaultBoxX: 93,
		defaultBoxY: 54,
		maxWidth: 110,
		textAlign: "left",
		boxBounds: Object.freeze({ minX: 82, maxX: 96, minY: 34, maxY: 68 }),
		anchorBounds: Object.freeze({ minX: 22, maxX: 78, minY: 18, maxY: 86 }),
	}),
	note4: Object.freeze({
		defaultBoxX: 93,
		defaultBoxY: 79,
		maxWidth: 102,
		textAlign: "left",
		boxBounds: Object.freeze({ minX: 82, maxX: 96, minY: 56, maxY: 90 }),
		anchorBounds: Object.freeze({ minX: 22, maxX: 78, minY: 18, maxY: 86 }),
	}),
});

export const defaultPetPart1NoteBoxes = Object.freeze({
	note1: Object.freeze({ x: PET_PART1_NOTE_POSITIONS.note1.defaultBoxX, y: PET_PART1_NOTE_POSITIONS.note1.defaultBoxY }),
	note2: Object.freeze({ x: PET_PART1_NOTE_POSITIONS.note2.defaultBoxX, y: PET_PART1_NOTE_POSITIONS.note2.defaultBoxY }),
	note3: Object.freeze({ x: PET_PART1_NOTE_POSITIONS.note3.defaultBoxX, y: PET_PART1_NOTE_POSITIONS.note3.defaultBoxY }),
	note4: Object.freeze({ x: PET_PART1_NOTE_POSITIONS.note4.defaultBoxX, y: PET_PART1_NOTE_POSITIONS.note4.defaultBoxY }),
});

export const defaultPetPart1NoteAnchors = Object.freeze({
	note1: Object.freeze({ x: 29, y: 45 }),
	note2: Object.freeze({ x: 73, y: 31 }),
	note3: Object.freeze({ x: 72, y: 53 }),
	note4: Object.freeze({ x: 62, y: 74 }),
});

export const defaultPetPart1Fields = Object.freeze({
	promptIntro: "Read this email and the notes you have made.",
	from: "Miss Jones",
	to: "All students",
	subject: "Visitor to English class",
	emailBodyHtml:
		"<p>I want to invite a special guest to our English class next month.</p><p>Should we ask a scientist or an actor to visit us? Tell me which person would be more interesting for the class.</p><p>I also want everyone to prepare one question for our visitor. What would you like to ask?</p><p>Finally, can you suggest something fun we could do for the visitor after the talk?</p>",
	note1: "Great!",
	note2: "I think ...",
	note3: "Tell Miss Jones",
	note4: "Suggest ...",
	noteBoxes: defaultPetPart1NoteBoxes,
	noteAnchors: defaultPetPart1NoteAnchors,
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

const mailIconSvg = `
	<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="display:block;flex:none;">
		<rect x="3" y="5" width="18" height="14" rx="2"></rect>
		<path d="m4 7 8 6 8-6"></path>
	</svg>
`;

const PET_PART1_LEFT_NOTE_BOX_BOUNDS = Object.freeze({ minX: 5, maxX: 18 });
const PET_PART1_RIGHT_NOTE_BOX_BOUNDS = Object.freeze({ minX: 82, maxX: 96 });
const PET_PART1_NOTE_BOX_Y_BOUNDS = Object.freeze({ minY: 14, maxY: 90 });

const clampPercent = (value, min, max) => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) {
		return min;
	}

	return Math.min(max, Math.max(min, numeric));
};

export const isPetPart1NoteOnLeftSide = (value) => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) {
		return true;
	}

	return numeric <= 50;
};

const clampPetPart1NoteBoxX = (value, fallbackValue) => {
	const fallbackNumeric = Number(fallbackValue);
	const nextValue = Number.isFinite(Number(value)) ? Number(value) : fallbackNumeric;
	const bounds = isPetPart1NoteOnLeftSide(nextValue)
		? PET_PART1_LEFT_NOTE_BOX_BOUNDS
		: PET_PART1_RIGHT_NOTE_BOX_BOUNDS;

	return clampPercent(nextValue, bounds.minX, bounds.maxX);
};

export const normalizePetPart1NoteAnchors = (anchors = {}) => {
	const source = anchors && typeof anchors === "object" ? anchors : {};

	return {
		note1: {
			x: clampPercent(source.note1?.x ?? defaultPetPart1NoteAnchors.note1.x, PET_PART1_NOTE_POSITIONS.note1.anchorBounds.minX, PET_PART1_NOTE_POSITIONS.note1.anchorBounds.maxX),
			y: clampPercent(source.note1?.y ?? defaultPetPart1NoteAnchors.note1.y, PET_PART1_NOTE_POSITIONS.note1.anchorBounds.minY, PET_PART1_NOTE_POSITIONS.note1.anchorBounds.maxY),
		},
		note2: {
			x: clampPercent(source.note2?.x ?? defaultPetPart1NoteAnchors.note2.x, PET_PART1_NOTE_POSITIONS.note2.anchorBounds.minX, PET_PART1_NOTE_POSITIONS.note2.anchorBounds.maxX),
			y: clampPercent(source.note2?.y ?? defaultPetPart1NoteAnchors.note2.y, PET_PART1_NOTE_POSITIONS.note2.anchorBounds.minY, PET_PART1_NOTE_POSITIONS.note2.anchorBounds.maxY),
		},
		note3: {
			x: clampPercent(source.note3?.x ?? defaultPetPart1NoteAnchors.note3.x, PET_PART1_NOTE_POSITIONS.note3.anchorBounds.minX, PET_PART1_NOTE_POSITIONS.note3.anchorBounds.maxX),
			y: clampPercent(source.note3?.y ?? defaultPetPart1NoteAnchors.note3.y, PET_PART1_NOTE_POSITIONS.note3.anchorBounds.minY, PET_PART1_NOTE_POSITIONS.note3.anchorBounds.maxY),
		},
		note4: {
			x: clampPercent(source.note4?.x ?? defaultPetPart1NoteAnchors.note4.x, PET_PART1_NOTE_POSITIONS.note4.anchorBounds.minX, PET_PART1_NOTE_POSITIONS.note4.anchorBounds.maxX),
			y: clampPercent(source.note4?.y ?? defaultPetPart1NoteAnchors.note4.y, PET_PART1_NOTE_POSITIONS.note4.anchorBounds.minY, PET_PART1_NOTE_POSITIONS.note4.anchorBounds.maxY),
		},
	};
};

export const normalizePetPart1NoteBoxes = (boxes = {}) => {
	const source = boxes && typeof boxes === "object" ? boxes : {};

	return {
		note1: {
			x: clampPetPart1NoteBoxX(source.note1?.x, defaultPetPart1NoteBoxes.note1.x),
			y: clampPercent(source.note1?.y ?? defaultPetPart1NoteBoxes.note1.y, PET_PART1_NOTE_BOX_Y_BOUNDS.minY, PET_PART1_NOTE_BOX_Y_BOUNDS.maxY),
		},
		note2: {
			x: clampPetPart1NoteBoxX(source.note2?.x, defaultPetPart1NoteBoxes.note2.x),
			y: clampPercent(source.note2?.y ?? defaultPetPart1NoteBoxes.note2.y, PET_PART1_NOTE_BOX_Y_BOUNDS.minY, PET_PART1_NOTE_BOX_Y_BOUNDS.maxY),
		},
		note3: {
			x: clampPetPart1NoteBoxX(source.note3?.x, defaultPetPart1NoteBoxes.note3.x),
			y: clampPercent(source.note3?.y ?? defaultPetPart1NoteBoxes.note3.y, PET_PART1_NOTE_BOX_Y_BOUNDS.minY, PET_PART1_NOTE_BOX_Y_BOUNDS.maxY),
		},
		note4: {
			x: clampPetPart1NoteBoxX(source.note4?.x, defaultPetPart1NoteBoxes.note4.x),
			y: clampPercent(source.note4?.y ?? defaultPetPart1NoteBoxes.note4.y, PET_PART1_NOTE_BOX_Y_BOUNDS.minY, PET_PART1_NOTE_BOX_Y_BOUNDS.maxY),
		},
	};
};

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

const convertLegacyPart1BodyToHtml = (fields = {}) => {
	const parts = [fields.greeting, fields.body1, fields.body2, fields.body3, fields.body4, fields.closing, fields.signature]
		.filter((value) => String(value || "").trim())
		.map((value, index, collection) => {
			const isLast = index === collection.length - 1;
			const text = renderText(value);
			return isLast && String(fields.signature || "").trim() === String(value || "").trim()
				? `<p><strong>${text}</strong></p>`
				: `<p>${text}</p>`;
		});

	return parts.join("") || defaultPetPart1Fields.emailBodyHtml;
};

export const normalizePetPart1Fields = (fields = {}) => {
	const merged = { ...defaultPetPart1Fields, ...fields };
	const emailBodyHtml = String(fields.emailBodyHtml || "").trim()
		? fields.emailBodyHtml
		: convertLegacyPart1BodyToHtml(fields);

	return {
		...merged,
		emailBodyHtml,
		noteBoxes: normalizePetPart1NoteBoxes(fields.noteBoxes || merged.noteBoxes),
		noteAnchors: normalizePetPart1NoteAnchors(fields.noteAnchors || merged.noteAnchors),
	};
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

		if (templateId === PART1_TEMPLATE_ID) {
			return normalizePetPart1Fields(fields);
		}

		return { ...defaults, ...fields };
	} catch (error) {
		console.error("Unable to parse PET writing template HTML", error);
		return null;
	}
};

const renderCallout = (noteKey, text, noteBoxes, anchors) => {
	if (!String(text || "").trim()) {
		return "";
	}

	const notePosition = PET_PART1_NOTE_POSITIONS[noteKey];
	const noteBox = noteBoxes[noteKey] || defaultPetPart1NoteBoxes[noteKey];
	const anchor = anchors[noteKey] || defaultPetPart1NoteAnchors[noteKey];
	const justify = isPetPart1NoteOnLeftSide(noteBox.x) ? "right" : "left";

	return `
		<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			<line x1="${noteBox.x}" y1="${noteBox.y}" x2="${anchor.x}" y2="${anchor.y}" stroke="#94a3b8" stroke-width="0.45" stroke-linecap="round" />
		</svg>
		<div style="position:absolute;left:${noteBox.x}%;top:${noteBox.y}%;transform:translate(${justify === "right" ? "-100%" : "0"}, -50%);max-width:${notePosition.maxWidth}px;padding:8px 10px;border-radius:14px;border:1px solid #fdba74;background:#fff7ed;color:#9a3412;font-size:12px;font-weight:700;line-height:1.45;text-align:${justify};box-shadow:0 10px 22px rgba(154, 52, 18, 0.08);">${renderText(text)}</div>
	`;
};

export const buildPetPart1Html = (fields) => {
	const merged = normalizePetPart1Fields(fields);
	const encodedFields = encodeTemplateFields(merged);

	return `
		<div data-pet-template="${PART1_TEMPLATE_ID}" data-template-fields="${encodedFields}" style="font-family:Arial, Helvetica, sans-serif;color:#0f172a;line-height:1.65;">
			<div style="display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Part 1</div>
			<p style="margin:14px 0 4px;font-size:15px;color:#334155;"><strong>You must answer this question.</strong></p>
			<p style="margin:0 0 18px;font-size:15px;color:#475569;">Write your answer in about 100 words on the answer sheet.</p>
			<div style="margin-bottom:16px;font-size:24px;font-weight:800;color:#0f172a;">Question 1</div>
			<p style="margin:0 0 18px;font-size:15px;color:#334155;">${renderText(merged.promptIntro)}</p>
			<div style="position:relative;margin:0 auto 20px;max-width:700px;padding:10px 112px 12px 92px;">
				<div style="overflow:hidden;border:2px solid #0f172a;border-radius:20px;background:#ffffff;box-shadow:0 18px 34px rgba(15, 23, 42, 0.12);">
					<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">${mailIconSvg}<span>EMAIL</span></div>
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
						<div style="font-size:15px;line-height:1.8;color:#1f2937;">${merged.emailBodyHtml || "<p><br></p>"}</div>
					</div>
				</div>
				${renderCallout("note1", merged.note1, merged.noteBoxes, merged.noteAnchors)}
				${renderCallout("note2", merged.note2, merged.noteBoxes, merged.noteAnchors)}
				${renderCallout("note3", merged.note3, merged.noteBoxes, merged.noteAnchors)}
				${renderCallout("note4", merged.note4, merged.noteBoxes, merged.noteAnchors)}
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