import React, { useState } from "react";
import ReactQuill from "react-quill";
import InlineIcon from "../../../../../shared/components/InlineIcon.jsx";
import { apiPath, authFetch, redirectToLogin } from "../../../../../shared/utils/api";
import PetEmailAnchorPreview from "./PetEmailAnchorPreview.jsx";
import PetWritingEditorShell from "./PetWritingEditorShell.jsx";
import {
	buildPetPart1Html,
	buildPetQuestion2Html,
	buildPetQuestion3Html,
	defaultPetPart1Fields,
	defaultPetPart1NoteBoxes,
	defaultPetPart1NoteAnchors,
	defaultPetQuestion2Fields,
	defaultPetQuestion3Fields,
} from "./petWritingTemplateUtils.js";

const part1QuillModules = {
	toolbar: [
		[{ header: [2, 3, false] }],
		["bold", "italic", "underline"],
		[{ list: "ordered" }, { list: "bullet" }],
		[{ align: [] }],
		["link"],
		["clean"],
	],
};

const stripRichText = (html = "") => {
	if (typeof DOMParser === "undefined") {
		return String(html).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
	}

	const document = new DOMParser().parseFromString(html, "text/html");
	return (document.body.textContent || "").replace(/\s+/g, " ").trim();
};

const SectionCard = ({ iconName, title, note, children }) => (
	<section className="pet-writing-editor-card">
		<div className="pet-writing-editor-stack">
			<div>
				<div className="pet-writing-editor-section-label">
					<InlineIcon name={iconName} size={14} />
					<span>{title}</span>
				</div>
				{note ? <p className="pet-writing-editor-section-note">{note}</p> : null}
			</div>
			{children}
		</div>
	</section>
);

const FormControl = ({
	label,
	value,
	onChange,
	placeholder,
	textarea = false,
	rows = 4,
	fullWidth = false,
}) => (
	<label className={`pet-writing-editor-control ${fullWidth ? "is-full" : ""}`}>
		<span className="pet-writing-editor-control-label">{label}</span>
		{textarea ? (
			<textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
		) : (
			<input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
		)}
	</label>
);

const PreviewCard = ({ title, note, html, children }) => (
	<aside className="pet-writing-editor-preview-card">
		<div className="pet-writing-editor-section-label">
			<InlineIcon name="eye" size={14} />
			<span>{title}</span>
		</div>
		{note ? <p className="pet-writing-editor-preview-caption">{note}</p> : null}
		{children || <div className="pet-writing-editor-rendered-html" dangerouslySetInnerHTML={{ __html: html }} />}
	</aside>
);

const hasRequiredTemplateContent = (part1Fields, question2Fields, question3Fields) => {
	return Boolean(
		String(part1Fields.promptIntro || "").trim() &&
			stripRichText(part1Fields.emailBodyHtml).trim() &&
			String(question2Fields.title || "").trim() &&
			String(question2Fields.line1 || "").trim() &&
			String(question3Fields.storyStarter || "").trim()
	);
};

const CreatePetWritingTestPage = () => {
	const [part1Fields, setPart1Fields] = useState({ ...defaultPetPart1Fields });
	const [question2Fields, setQuestion2Fields] = useState({ ...defaultPetQuestion2Fields });
	const [question3Fields, setQuestion3Fields] = useState({ ...defaultPetQuestion3Fields });
	const [classCode, setClassCode] = useState("");
	const [teacherName, setTeacherName] = useState("");
	const [message, setMessage] = useState("");
	const [messageTone, setMessageTone] = useState("success");
	const [requiresLogin, setRequiresLogin] = useState(false);
	const [activeSection, setActiveSection] = useState("part1");

	const task1Html = buildPetPart1Html(part1Fields);
	const part2Question2Html = buildPetQuestion2Html(question2Fields);
	const part2Question3Html = buildPetQuestion3Html(question3Fields);

	const updateFields = (setter, field, value) => {
		setter((current) => ({
			...current,
			[field]: value,
		}));
	};

	const updatePart1Anchors = (updater) => {
		setPart1Fields((current) => ({
			...current,
			noteAnchors: updater(current.noteAnchors || defaultPetPart1NoteAnchors),
		}));
	};

	const updatePart1NoteBoxes = (updater) => {
		setPart1Fields((current) => ({
			...current,
			noteBoxes: updater(current.noteBoxes || defaultPetPart1NoteBoxes),
		}));
	};

	const saveDraft = () => {
		try {
			const draft = {
				part1Fields,
				question2Fields,
				question3Fields,
				classCode,
				teacherName,
			};
			localStorage.setItem("petWritingTestDraft", JSON.stringify(draft));
		} catch (e) {
			console.error("Error saving PET writing draft", e);
		}
	};

	const updateMessage = (tone, text) => {
		setMessageTone(tone);
		setMessage(text);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!hasRequiredTemplateContent(part1Fields, question2Fields, question3Fields)) {
			updateMessage("error", "Vui lòng nhập đủ nội dung cho email Part 1 và hai lựa chọn Part 2.");
			return;
		}

		try {
			const res = await authFetch(apiPath("writing-tests"), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					task1: task1Html,
					task2: "",
					part2Question2: part2Question2Html,
					part2Question3: part2Question3Html,
					classCode,
					teacherName,
					testType: "pet-writing",
				}),
			});

			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				if (res.status === 401) {
					try {
						saveDraft();
					} catch (e) {}
					updateMessage(
						"error",
						"Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại. Bản nháp đã được lưu."
					);
					setRequiresLogin(true);
					return;
				}
				updateMessage("error", data.message || "Lỗi khi tạo đề");
				return;
			}

			updateMessage("success", data.message || "Đã tạo đề PET Writing");

			setPart1Fields({ ...defaultPetPart1Fields });
			setQuestion2Fields({ ...defaultPetQuestion2Fields });
			setQuestion3Fields({ ...defaultPetQuestion3Fields });
			setClassCode("");
			setTeacherName("");
			setActiveSection("part1");
			setTimeout(() => window.location.reload(), 2000);
		} catch (err) {
			console.error(err);
			updateMessage("error", "Lỗi khi tạo đề");
		}
	};

	const sections = [
		{
			id: "part1",
			title: "Part 1 Email",
			pill: "Email",
			badge: "Part 1",
			caption: "Khung email có note line",
			note: "Body email dùng ReactQuill, kéo được cả note box ngoài và chấm neo trong email.",
		},
		{
			id: "q2",
			title: "Question 2",
			pill: "Article",
			badge: "Part 2",
			caption: "Announcement box",
			note: "Khung thông báo để ra đề viết bài article.",
		},
		{
			id: "q3",
			title: "Question 3",
			pill: "Story",
			badge: "Part 2",
			caption: "Story starter",
			note: "Nổi bật câu mở đầu để học sinh viết story.",
		},
	];

	const previewSections = [
		{ id: "part1", title: "Part 1", html: task1Html },
		{ id: "q2", title: "Part 2 - Question 2", html: part2Question2Html },
		{ id: "q3", title: "Part 2 - Question 3", html: part2Question3Html },
	];

	const loginNotice = requiresLogin ? (
		<div className="pet-writing-editor-mode-banner">
			<div>
				<strong>
					<InlineIcon name="average" size={16} />
					<span>Bạn cần đăng nhập lại để hoàn tất thao tác.</span>
				</strong>
				<p>Bản nháp đang được lưu tạm. Sau khi đăng nhập, trang hiện tại sẽ được mở lại.</p>
			</div>
			<button
				type="button"
				className="pet-writing-editor-primary-btn"
				onClick={() => {
					redirectToLogin({ rememberPath: true, replace: true });
				}}
			>
				Đăng nhập lại
			</button>
		</div>
	) : null;

	const renderSectionContent = (sectionId) => {
		if (sectionId === "part1") {
			return (
				<div className="pet-writing-editor-form-grid">
					<div className="pet-writing-editor-stack">
						<SectionCard
							iconName="document"
							title="Khung đề bài"
							note="Phần hướng dẫn có cấu trúc giống đề PET giấy, nhưng vẫn để text nhẹ để sửa nhanh."
						>
							<FormControl
								label="Dòng giới thiệu"
								value={part1Fields.promptIntro}
								onChange={(value) => updateFields(setPart1Fields, "promptIntro", value)}
								placeholder="Read this email and the notes you have made."
								textarea
								rows={3}
								fullWidth
							/>
						</SectionCard>

						<SectionCard iconName="writing" title="Header email" note="Chỉ giữ các thông tin header, phần nội dung sẽ gõ trực tiếp trong editor bên dưới.">
							<div className="pet-writing-editor-fieldset-grid">
								<FormControl
									label="From"
									value={part1Fields.from}
									onChange={(value) => updateFields(setPart1Fields, "from", value)}
									placeholder="Miss Jones"
								/>
								<FormControl
									label="To"
									value={part1Fields.to}
									onChange={(value) => updateFields(setPart1Fields, "to", value)}
									placeholder="All students"
								/>
								<FormControl
									label="Subject"
									value={part1Fields.subject}
									onChange={(value) => updateFields(setPart1Fields, "subject", value)}
									placeholder="Visitor to English class"
									fullWidth
								/>
							</div>
						</SectionCard>

						<SectionCard iconName="fill" title="Nội dung email" note="Không chia đoạn sẵn nữa. Giáo viên gõ thẳng vào email bằng ReactQuill, muốn xuống dòng hay in đậm đều được.">
							<div className="pet-writing-editor-quill">
								<ReactQuill
									theme="snow"
									value={part1Fields.emailBodyHtml}
									onChange={(value) => updateFields(setPart1Fields, "emailBodyHtml", value)}
									placeholder="Nhập nội dung email tại đây..."
									modules={part1QuillModules}
								/>
							</div>
						</SectionCard>

						<SectionCard iconName="average" title="Note line bên ngoài" note="Nhập note text ở đây, sau đó kéo note box hoặc chấm neo trong preview bên phải để canh line.">
							<div className="pet-writing-editor-fieldset-grid">
								<FormControl
									label="Note 1"
									value={part1Fields.note1}
									onChange={(value) => updateFields(setPart1Fields, "note1", value)}
									placeholder="Great!"
								/>
								<FormControl
									label="Note 2"
									value={part1Fields.note2}
									onChange={(value) => updateFields(setPart1Fields, "note2", value)}
									placeholder="I think ..."
								/>
								<FormControl
									label="Note 3"
									value={part1Fields.note3}
									onChange={(value) => updateFields(setPart1Fields, "note3", value)}
									placeholder="Tell Miss Jones"
								/>
								<FormControl
									label="Note 4"
									value={part1Fields.note4}
									onChange={(value) => updateFields(setPart1Fields, "note4", value)}
									placeholder="Suggest ..."
								/>
								<FormControl
									label="Hướng dẫn cuối"
									value={part1Fields.answerInstruction}
									onChange={(value) => updateFields(setPart1Fields, "answerInstruction", value)}
									placeholder="Write your email using all the notes."
									textarea
									rows={2}
									fullWidth
								/>
							</div>
							<div className="pet-writing-editor-anchor-actions">
								<p className="pet-writing-editor-anchor-hint">Mẹo: giữ và kéo trực tiếp ở khung note màu cam để đổi vị trí note bên ngoài. Các line luôn bám sát vào mép note box.</p>
								<button
									type="button"
									className="pet-writing-editor-secondary-btn"
									onClick={() => {
										setPart1Fields((current) => ({
											...current,
											noteBoxes: defaultPetPart1NoteBoxes,
											noteAnchors: defaultPetPart1NoteAnchors,
										}));
									}}
								>
									Đặt lại vị trí
								</button>
							</div>
						</SectionCard>
					</div>

					<PreviewCard
						title="Preview khung email"
						note="Preview này cho phép kéo note box và chấm neo trực tiếp. Khi lưu, vị trí line sẽ đi theo vào đề thi thật."
					>
						<PetEmailAnchorPreview fields={part1Fields} onAnchorsChange={updatePart1Anchors} onNoteBoxesChange={updatePart1NoteBoxes} />
					</PreviewCard>
				</div>
			);
		}

		if (sectionId === "q2") {
			return (
				<div className="pet-writing-editor-form-grid">
					<div className="pet-writing-editor-stack">
						<SectionCard iconName="document" title="Announcement box" note="Question 2 được làm sẵn dạng thông báo để nhập nhanh nội dung article.">
							<div className="pet-writing-editor-fieldset-grid">
								<FormControl
									label="Dòng dẫn"
									value={question2Fields.promptLead}
									onChange={(value) => updateFields(setQuestion2Fields, "promptLead", value)}
									textarea
									rows={3}
									fullWidth
								/>
								<FormControl
									label="Nhãn trên khung"
									value={question2Fields.badge}
									onChange={(value) => updateFields(setQuestion2Fields, "badge", value)}
									placeholder="Articles wanted"
								/>
								<FormControl
									label="Tiêu đề lớn"
									value={question2Fields.title}
									onChange={(value) => updateFields(setQuestion2Fields, "title", value)}
									placeholder="Computer games"
								/>
								<FormControl
									label="Dòng hỏi 1"
									value={question2Fields.line1}
									onChange={(value) => updateFields(setQuestion2Fields, "line1", value)}
									textarea
									rows={3}
									fullWidth
								/>
								<FormControl
									label="Dòng hỏi 2"
									value={question2Fields.line2}
									onChange={(value) => updateFields(setQuestion2Fields, "line2", value)}
									textarea
									rows={3}
									fullWidth
								/>
								<FormControl
									label="Dòng cuối khung"
									value={question2Fields.footer}
									onChange={(value) => updateFields(setQuestion2Fields, "footer", value)}
									textarea
									rows={3}
									fullWidth
								/>
								<FormControl
									label="Hướng dẫn viết"
									value={question2Fields.answerInstruction}
									onChange={(value) => updateFields(setQuestion2Fields, "answerInstruction", value)}
									placeholder="Write your article."
									fullWidth
								/>
							</div>
						</SectionCard>
					</div>

					<PreviewCard
						title="Preview Question 2"
						note="Học sinh sẽ thấy một thông báo dạng card thay vì ảnh chụp đề."
						html={part2Question2Html}
					/>
				</div>
			);
		}

		return (
			<div className="pet-writing-editor-form-grid">
				<div className="pet-writing-editor-stack">
					<SectionCard iconName="writing" title="Story starter" note="Question 3 dùng một câu mở đầu nổi bật, giống đề PET nhưng gọn và dễ sửa hơn.">
						<div className="pet-writing-editor-fieldset-grid">
							<FormControl
								label="Dòng dẫn"
								value={question3Fields.promptLead}
								onChange={(value) => updateFields(setQuestion3Fields, "promptLead", value)}
								textarea
								rows={3}
								fullWidth
							/>
							<FormControl
								label="Dòng bổ trợ"
								value={question3Fields.promptSupport}
								onChange={(value) => updateFields(setQuestion3Fields, "promptSupport", value)}
								textarea
								rows={3}
								fullWidth
							/>
							<FormControl
								label="Câu mở đầu"
								value={question3Fields.storyStarter}
								onChange={(value) => updateFields(setQuestion3Fields, "storyStarter", value)}
								textarea
								rows={5}
								fullWidth
							/>
							<FormControl
								label="Hướng dẫn viết"
								value={question3Fields.answerInstruction}
								onChange={(value) => updateFields(setQuestion3Fields, "answerInstruction", value)}
								placeholder="Write your story."
								fullWidth
							/>
						</div>
					</SectionCard>
				</div>

				<PreviewCard
					title="Preview Question 3"
					note="Câu mở đầu được tách thành thẻ riêng để học sinh đọc nhanh và nhập bài vào phần story."
					html={part2Question3Html}
				/>
			</div>
		);
	};

	return (
		<PetWritingEditorShell
			notice={loginNotice}
			pageTitle="Create PET Writing"
			pageDescription="Shell mới cho PET Writing ưu tiên khung text-first: Part 1 có email frame và note line, Part 2 có announcement box và story starter card."
			summaryText="3 khu vực prompt nhẹ hơn ảnh upload"
			classCode={classCode}
			onClassCodeChange={setClassCode}
			teacherName={teacherName}
			onTeacherNameChange={setTeacherName}
			message={message}
			messageTone={messageTone}
			sections={sections}
			activeSection={activeSection}
			onSectionChange={setActiveSection}
			renderSectionContent={renderSectionContent}
			previewSections={previewSections}
			submitLabel="Tạo đề"
			submitIcon="create"
			onSubmit={handleSubmit}
		/>
	);
};

export default CreatePetWritingTestPage;