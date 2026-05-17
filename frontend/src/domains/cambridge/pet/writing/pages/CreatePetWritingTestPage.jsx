import React, { useState } from "react";
import InlineIcon from "../../../../../shared/components/InlineIcon.jsx";
import { apiPath, authFetch, redirectToLogin } from "../../../../../shared/utils/api";
import PetWritingEditorShell from "./PetWritingEditorShell.jsx";
import {
	buildPetPart1Html,
	buildPetQuestion2Html,
	buildPetQuestion3Html,
	defaultPetPart1Fields,
	defaultPetQuestion2Fields,
	defaultPetQuestion3Fields,
} from "./petWritingTemplateUtils.js";

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

const PreviewCard = ({ title, note, html }) => (
	<aside className="pet-writing-editor-preview-card">
		<div className="pet-writing-editor-section-label">
			<InlineIcon name="eye" size={14} />
			<span>{title}</span>
		</div>
		{note ? <p className="pet-writing-editor-preview-caption">{note}</p> : null}
		<div className="pet-writing-editor-rendered-html" dangerouslySetInnerHTML={{ __html: html }} />
	</aside>
);

const hasRequiredTemplateContent = (part1Fields, question2Fields, question3Fields) => {
	const hasPart1Body = [part1Fields.body1, part1Fields.body2, part1Fields.body3, part1Fields.body4].some((value) =>
		String(value || "").trim()
	);

	return Boolean(
		String(part1Fields.promptIntro || "").trim() &&
			String(part1Fields.greeting || "").trim() &&
			hasPart1Body &&
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
			caption: "Khung email co note line",
			note: "Nhap noi dung email truc tiep, khong can upload anh.",
		},
		{
			id: "q2",
			title: "Question 2",
			pill: "Article",
			badge: "Part 2",
			caption: "Announcement box",
			note: "Khung thong bao de ra de viet bai article.",
		},
		{
			id: "q3",
			title: "Question 3",
			pill: "Story",
			badge: "Part 2",
			caption: "Story starter",
			note: "Noi bat cau mo dau de hoc sinh viet story.",
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
					<span>Ban can dang nhap lai de hoan tat thao tac.</span>
				</strong>
				<p>Ban nhap dang duoc luu tam. Sau khi dang nhap, trang hien tai se duoc mo lai.</p>
			</div>
			<button
				type="button"
				className="pet-writing-editor-primary-btn"
				onClick={() => {
					redirectToLogin({ rememberPath: true, replace: true });
				}}
			>
				Dang nhap lai
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
							title="Khung de bai"
							note="Phan huong dan co cau truc giong de PET giay, nhung van de text nhe de sua nhanh."
						>
							<FormControl
								label="Dong gioi thieu"
								value={part1Fields.promptIntro}
								onChange={(value) => updateFields(setPart1Fields, "promptIntro", value)}
								placeholder="Read this email and the notes you have made."
								textarea
								rows={3}
								fullWidth
							/>
						</SectionCard>

						<SectionCard iconName="writing" title="Header email" note="Cac dong From, To, Subject va loi chao se tu dua vao khung email.">
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
								<FormControl
									label="Loi chao"
									value={part1Fields.greeting}
									onChange={(value) => updateFields(setPart1Fields, "greeting", value)}
									placeholder="Dear Students,"
									fullWidth
								/>
							</div>
						</SectionCard>

						<SectionCard iconName="fill" title="Noi dung email" note="Moi doan se nam san trong khung email, ban chi viec nhap text. ">
							<div className="pet-writing-editor-fieldset-grid">
								<FormControl
									label="Doan 1"
									value={part1Fields.body1}
									onChange={(value) => updateFields(setPart1Fields, "body1", value)}
									textarea
									rows={4}
									fullWidth
								/>
								<FormControl
									label="Doan 2"
									value={part1Fields.body2}
									onChange={(value) => updateFields(setPart1Fields, "body2", value)}
									textarea
									rows={4}
									fullWidth
								/>
								<FormControl
									label="Doan 3"
									value={part1Fields.body3}
									onChange={(value) => updateFields(setPart1Fields, "body3", value)}
									textarea
									rows={4}
									fullWidth
								/>
								<FormControl
									label="Doan 4"
									value={part1Fields.body4}
									onChange={(value) => updateFields(setPart1Fields, "body4", value)}
									textarea
									rows={4}
									fullWidth
								/>
								<FormControl
									label="Dong ket"
									value={part1Fields.closing}
									onChange={(value) => updateFields(setPart1Fields, "closing", value)}
									textarea
									rows={3}
									fullWidth
								/>
								<FormControl
									label="Chu ky"
									value={part1Fields.signature}
									onChange={(value) => updateFields(setPart1Fields, "signature", value)}
									placeholder="Miss Jones"
									fullWidth
								/>
							</div>
						</SectionCard>

						<SectionCard iconName="average" title="Note line ben ngoai" note="Bon o ghi chu se nam san hai ben khung email de giong de thi giay.">
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
									label="Huong dan cuoi"
									value={part1Fields.answerInstruction}
									onChange={(value) => updateFields(setPart1Fields, "answerInstruction", value)}
									placeholder="Write your email using all the notes."
									textarea
									rows={2}
									fullWidth
								/>
							</div>
						</SectionCard>
					</div>

					<PreviewCard
						title="Preview khung email"
						note="Khung ben phai la HTML se duoc luu va render thang o runtime, nen khong can upload anh."
						html={task1Html}
					/>
				</div>
			);
		}

		if (sectionId === "q2") {
			return (
				<div className="pet-writing-editor-form-grid">
					<div className="pet-writing-editor-stack">
						<SectionCard iconName="document" title="Announcement box" note="Question 2 duoc lam san dang thong bao de nhap nhanh noi dung article.">
							<div className="pet-writing-editor-fieldset-grid">
								<FormControl
									label="Dong dan"
									value={question2Fields.promptLead}
									onChange={(value) => updateFields(setQuestion2Fields, "promptLead", value)}
									textarea
									rows={3}
									fullWidth
								/>
								<FormControl
									label="Nhan tren khung"
									value={question2Fields.badge}
									onChange={(value) => updateFields(setQuestion2Fields, "badge", value)}
									placeholder="Articles wanted"
								/>
								<FormControl
									label="Tieu de lon"
									value={question2Fields.title}
									onChange={(value) => updateFields(setQuestion2Fields, "title", value)}
									placeholder="Computer games"
								/>
								<FormControl
									label="Dong hoi 1"
									value={question2Fields.line1}
									onChange={(value) => updateFields(setQuestion2Fields, "line1", value)}
									textarea
									rows={3}
									fullWidth
								/>
								<FormControl
									label="Dong hoi 2"
									value={question2Fields.line2}
									onChange={(value) => updateFields(setQuestion2Fields, "line2", value)}
									textarea
									rows={3}
									fullWidth
								/>
								<FormControl
									label="Dong cuoi khung"
									value={question2Fields.footer}
									onChange={(value) => updateFields(setQuestion2Fields, "footer", value)}
									textarea
									rows={3}
									fullWidth
								/>
								<FormControl
									label="Huong dan viet"
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
						note="Hoc sinh se thay mot thong bao dang card thay vi anh chup de."
						html={part2Question2Html}
					/>
				</div>
			);
		}

		return (
			<div className="pet-writing-editor-form-grid">
				<div className="pet-writing-editor-stack">
					<SectionCard iconName="writing" title="Story starter" note="Question 3 dung mot cau mo dau noi bat, giong de PET nhung gon va de sua hon.">
						<div className="pet-writing-editor-fieldset-grid">
							<FormControl
								label="Dong dan"
								value={question3Fields.promptLead}
								onChange={(value) => updateFields(setQuestion3Fields, "promptLead", value)}
								textarea
								rows={3}
								fullWidth
							/>
							<FormControl
								label="Dong bo tro"
								value={question3Fields.promptSupport}
								onChange={(value) => updateFields(setQuestion3Fields, "promptSupport", value)}
								textarea
								rows={3}
								fullWidth
							/>
							<FormControl
								label="Cau mo dau"
								value={question3Fields.storyStarter}
								onChange={(value) => updateFields(setQuestion3Fields, "storyStarter", value)}
								textarea
								rows={5}
								fullWidth
							/>
							<FormControl
								label="Huong dan viet"
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
					note="Cau mo dau duoc tach thanh the rieng de hoc sinh doc nhanh va nhap bai vao phan story."
					html={part2Question3Html}
				/>
			</div>
		);
	};

	return (
		<PetWritingEditorShell
			notice={loginNotice}
			pageTitle="Create PET Writing"
			pageDescription="Shell moi cho PET Writing uu tien khung text-first: Part 1 co email frame va note line, Part 2 co announcement box va story starter card."
			summaryText="3 khu vuc prompt nhe hon anh upload"
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
			submitLabel="Tao de"
			submitIcon="create"
			onSubmit={handleSubmit}
		/>
	);
};

export default CreatePetWritingTestPage;