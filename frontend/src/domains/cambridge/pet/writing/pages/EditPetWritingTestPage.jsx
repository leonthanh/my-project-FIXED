import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import { useNavigate, useParams } from "react-router-dom";
import InlineIcon from "../../../../../shared/components/InlineIcon.jsx";
import { apiPath, authFetch, hostPath, redirectToLogin } from "../../../../../shared/utils/api";
import useQuillImageUpload from "../../../../../shared/hooks/useQuillImageUpload";
import PetWritingEditorShell from "./PetWritingEditorShell.jsx";
import {
	buildPetPart1Html,
	buildPetQuestion2Html,
	buildPetQuestion3Html,
	defaultPetPart1Fields,
	defaultPetQuestion2Fields,
	defaultPetQuestion3Fields,
	parsePetPart1Fields,
	parsePetQuestion2Fields,
	parsePetQuestion3Fields,
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

const EditPetWritingTestPage = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [part1Fields, setPart1Fields] = useState({ ...defaultPetPart1Fields });
	const [question2Fields, setQuestion2Fields] = useState({ ...defaultPetQuestion2Fields });
	const [question3Fields, setQuestion3Fields] = useState({ ...defaultPetQuestion3Fields });
	const [task1, setTask1] = useState("");
	const [part2Question2, setPart2Question2] = useState("");
	const [part2Question3, setPart2Question3] = useState("");
	const [classCode, setClassCode] = useState("");
	const [teacherName, setTeacherName] = useState("");
	const [image, setImage] = useState(null);
	const [selectedImagePreview, setSelectedImagePreview] = useState("");
	const [existingImage, setExistingImage] = useState("");
	const [removeTask1Image, setRemoveTask1Image] = useState(false);
	const [message, setMessage] = useState("");
	const [messageTone, setMessageTone] = useState("success");
	const [requiresLogin, setRequiresLogin] = useState(false);
	const [activeSection, setActiveSection] = useState("part1");
	const [editorMode, setEditorMode] = useState("template");
	const [loading, setLoading] = useState(true);

	const task1Quill = useQuillImageUpload();
	const part2Q2Quill = useQuillImageUpload();
	const part2Q3Quill = useQuillImageUpload();

	const task1Html = buildPetPart1Html(part1Fields);
	const part2Question2Html = buildPetQuestion2Html(question2Fields);
	const part2Question3Html = buildPetQuestion3Html(question3Fields);
	const shouldRemoveLegacyImage = editorMode === "template" ? Boolean(existingImage) : removeTask1Image;
	const currentPreviewImage =
		selectedImagePreview || (!shouldRemoveLegacyImage && existingImage ? hostPath(existingImage) : "");

	const updateFields = (setter, field, value) => {
		setter((current) => ({
			...current,
			[field]: value,
		}));
	};

	const updateMessage = (tone, text) => {
		setMessageTone(tone);
		setMessage(text);
	};

	useEffect(() => {
		if (!image) {
			setSelectedImagePreview("");
			return undefined;
		}

		const objectUrl = URL.createObjectURL(image);
		setSelectedImagePreview(objectUrl);

		return () => URL.revokeObjectURL(objectUrl);
	}, [image]);

	useEffect(() => {
		let isCancelled = false;

		const fetchTest = async () => {
			try {
				const res = await fetch(apiPath(`writing-tests/${id}`));
				if (!res.ok) throw new Error("Không tìm thấy đề thi");
				const data = await res.json();
				if (isCancelled) {
					return;
				}

				const nextTask1 = data.task1 || "";
				const nextQuestion2 = data.part2Question2 || "";
				const nextQuestion3 = data.part2Question3 || "";
				const nextExistingImage = data.task1Image || "";
				const parsedPart1 = parsePetPart1Fields(nextTask1);
				const parsedQuestion2 = parsePetQuestion2Fields(nextQuestion2);
				const parsedQuestion3 = parsePetQuestion3Fields(nextQuestion3);
				const hasAnyLegacyContent = Boolean(
					String(nextTask1).trim() || String(nextQuestion2).trim() || String(nextQuestion3).trim()
				);

				setTask1(data.task1 || "");
				setPart2Question2(data.part2Question2 || "");
				setPart2Question3(data.part2Question3 || "");
				setClassCode(data.classCode || "");
				setTeacherName(data.teacherName || "");
				setExistingImage(nextExistingImage);

				if (!hasAnyLegacyContent || (parsedPart1 && parsedQuestion2 && parsedQuestion3)) {
					setEditorMode("template");
					setPart1Fields(parsedPart1 || { ...defaultPetPart1Fields });
					setQuestion2Fields(parsedQuestion2 || { ...defaultPetQuestion2Fields });
					setQuestion3Fields(parsedQuestion3 || { ...defaultPetQuestion3Fields });
					setRemoveTask1Image(Boolean(nextExistingImage));
				} else {
					setEditorMode("manual");
					setPart1Fields({ ...defaultPetPart1Fields });
					setQuestion2Fields({ ...defaultPetQuestion2Fields });
					setQuestion3Fields({ ...defaultPetQuestion3Fields });
					setRemoveTask1Image(false);
				}
			} catch (err) {
				console.error("Lỗi khi tải đề PET Writing:", err);
				updateMessage("error", "Không thể tải đề. Vui lòng thử lại.");
			} finally {
				if (!isCancelled) {
					setLoading(false);
				}
			}
		};

		fetchTest();

		return () => {
			isCancelled = true;
		};
	}, [id]);

	const saveDraft = () => {
		try {
			const draft = {
				editorMode,
				part1Fields,
				question2Fields,
				question3Fields,
				task1,
				part2Question2,
				part2Question3,
				classCode,
				teacherName,
				removeTask1Image,
			};
			localStorage.setItem(`petWritingTestEditDraft-${id}`, JSON.stringify(draft));
		} catch (e) {
			console.error("Error saving PET writing draft", e);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (editorMode === "template") {
			if (!hasRequiredTemplateContent(part1Fields, question2Fields, question3Fields)) {
				updateMessage("error", "Vui lòng nhập đủ nội dung cho email Part 1 và hai lựa chọn Part 2.");
				return;
			}
		} else if (!task1.trim() || !part2Question2.trim() || !part2Question3.trim()) {
			updateMessage("error", "Vui lòng nhập đầy đủ Part 1 và Part 2 (Q2/Q3).");
			return;
		}

		try {
			let res;
			if (editorMode === "template") {
				res = await authFetch(apiPath(`writing-tests/${id}`), {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						task1: task1Html,
						task2: "",
						part2Question2: part2Question2Html,
						part2Question3: part2Question3Html,
						classCode,
						teacherName,
						testType: "pet-writing",
						removeTask1Image: shouldRemoveLegacyImage,
					}),
				});
			} else if (image) {
				const formData = new FormData();
				formData.append("task1", task1);
				formData.append("task2", "");
				formData.append("part2Question2", part2Question2);
				formData.append("part2Question3", part2Question3);
				formData.append("classCode", classCode);
				formData.append("teacherName", teacherName);
				formData.append("testType", "pet-writing");
				formData.append("image", image);
				if (shouldRemoveLegacyImage) {
					formData.append("removeTask1Image", "true");
				}

				res = await authFetch(apiPath(`writing-tests/${id}/with-image`), {
					method: "PUT",
					body: formData,
				});
			} else {
				res = await authFetch(apiPath(`writing-tests/${id}`), {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						task1,
						task2: "",
						part2Question2,
						part2Question3,
						classCode,
						teacherName,
						testType: "pet-writing",
						removeTask1Image: shouldRemoveLegacyImage,
					}),
				});
			}

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
				updateMessage("error", data.message || "Lỗi khi cập nhật đề");
				return;
			}

			updateMessage("success", data.message || "Đã cập nhật đề PET Writing");
			setImage(null);
			setSelectedImagePreview("");
			setRemoveTask1Image(false);
			if (editorMode === "template" || shouldRemoveLegacyImage) {
				setExistingImage(data.test?.task1Image || "");
			} else if (data.test?.task1Image) {
				setExistingImage(data.test.task1Image);
			}
			setTimeout(() => navigate("/cambridge"), 1200);
		} catch (err) {
			console.error(err);
			updateMessage("error", "Lỗi khi cập nhật đề");
		}
	};

	const sections = [
		{
			id: "part1",
			title: "Part 1 Email",
			pill: editorMode === "manual" ? "Legacy" : "Email",
			badge: "Part 1",
			caption: editorMode === "manual" ? "Rich text + anh cu" : "Khung email co note line",
			note:
				editorMode === "manual"
					? "Editor giu noi dung cu an toan trong che do thu cong."
					: "Nhap noi dung email truc tiep, khong can upload anh.",
		},
		{
			id: "q2",
			title: "Question 2",
			pill: editorMode === "manual" ? "Legacy" : "Article",
			badge: "Part 2",
			caption: editorMode === "manual" ? "Rich text prompt" : "Announcement box",
			note:
				editorMode === "manual"
					? "Noi dung cu duoc giu nguyen de tranh mat du lieu."
					: "Khung thong bao de ra de viet bai article.",
		},
		{
			id: "q3",
			title: "Question 3",
			pill: editorMode === "manual" ? "Legacy" : "Story",
			badge: "Part 2",
			caption: editorMode === "manual" ? "Rich text prompt" : "Story starter",
			note:
				editorMode === "manual"
					? "Story prompt cu duoc sua trong rich text editor."
					: "Noi bat cau mo dau de hoc sinh viet story.",
		},
	];

	const previewSections =
		editorMode === "template"
			? [
					{ id: "part1", title: "Part 1", html: task1Html },
					{ id: "q2", title: "Part 2 - Question 2", html: part2Question2Html },
					{ id: "q3", title: "Part 2 - Question 3", html: part2Question3Html },
				]
			: [
					{ id: "part1", title: "Part 1", html: task1, imageSrc: currentPreviewImage, imageAlt: "Part 1 visual" },
					{ id: "q2", title: "Part 2 - Question 2", html: part2Question2 },
					{ id: "q3", title: "Part 2 - Question 3", html: part2Question3 },
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

	const legacyModeBanner = (
		<div className="pet-writing-editor-mode-banner">
			<div>
				<strong>
					<InlineIcon name="average" size={16} />
					<span>Dang giu che do thu cong cho de cu</span>
				</strong>
				<p>
					Noi dung hien tai khong duoc tao bang khung PET moi, nen editor giu rich text va anh legacy de
					tranh mat du lieu. Ban van co shell moi, sidebar moi va preview day du.
				</p>
			</div>
		</div>
	);

	const templateImageNotice = existingImage ? (
		<div className="pet-writing-editor-mode-banner">
			<div>
				<strong>
					<InlineIcon name="document" size={16} />
					<span>Anh cu se duoc go khi luu</span>
				</strong>
				<p>
					De nay dang co anh Part 1 tu phien ban cu. Khi ban luu o che do khung text-first, he thong se go anh
					cu va chi giu HTML nhe hon.
				</p>
			</div>
		</div>
	) : null;

	const renderTemplateSectionContent = (sectionId) => {
		if (sectionId === "part1") {
			return (
				<div className="pet-writing-editor-form-grid">
					<div className="pet-writing-editor-stack">
						{templateImageNotice}
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
								<FormControl label="From" value={part1Fields.from} onChange={(value) => updateFields(setPart1Fields, "from", value)} placeholder="Miss Jones" />
								<FormControl label="To" value={part1Fields.to} onChange={(value) => updateFields(setPart1Fields, "to", value)} placeholder="All students" />
								<FormControl label="Subject" value={part1Fields.subject} onChange={(value) => updateFields(setPart1Fields, "subject", value)} placeholder="Visitor to English class" fullWidth />
								<FormControl label="Loi chao" value={part1Fields.greeting} onChange={(value) => updateFields(setPart1Fields, "greeting", value)} placeholder="Dear Students," fullWidth />
							</div>
						</SectionCard>

						<SectionCard iconName="fill" title="Noi dung email" note="Moi doan se nam san trong khung email, ban chi viec nhap text.">
							<div className="pet-writing-editor-fieldset-grid">
								<FormControl label="Doan 1" value={part1Fields.body1} onChange={(value) => updateFields(setPart1Fields, "body1", value)} textarea rows={4} fullWidth />
								<FormControl label="Doan 2" value={part1Fields.body2} onChange={(value) => updateFields(setPart1Fields, "body2", value)} textarea rows={4} fullWidth />
								<FormControl label="Doan 3" value={part1Fields.body3} onChange={(value) => updateFields(setPart1Fields, "body3", value)} textarea rows={4} fullWidth />
								<FormControl label="Doan 4" value={part1Fields.body4} onChange={(value) => updateFields(setPart1Fields, "body4", value)} textarea rows={4} fullWidth />
								<FormControl label="Dong ket" value={part1Fields.closing} onChange={(value) => updateFields(setPart1Fields, "closing", value)} textarea rows={3} fullWidth />
								<FormControl label="Chu ky" value={part1Fields.signature} onChange={(value) => updateFields(setPart1Fields, "signature", value)} placeholder="Miss Jones" fullWidth />
							</div>
						</SectionCard>

						<SectionCard iconName="average" title="Note line ben ngoai" note="Bon o ghi chu se nam san hai ben khung email de giong de thi giay.">
							<div className="pet-writing-editor-fieldset-grid">
								<FormControl label="Note 1" value={part1Fields.note1} onChange={(value) => updateFields(setPart1Fields, "note1", value)} placeholder="Great!" />
								<FormControl label="Note 2" value={part1Fields.note2} onChange={(value) => updateFields(setPart1Fields, "note2", value)} placeholder="I think ..." />
								<FormControl label="Note 3" value={part1Fields.note3} onChange={(value) => updateFields(setPart1Fields, "note3", value)} placeholder="Tell Miss Jones" />
								<FormControl label="Note 4" value={part1Fields.note4} onChange={(value) => updateFields(setPart1Fields, "note4", value)} placeholder="Suggest ..." />
								<FormControl label="Huong dan cuoi" value={part1Fields.answerInstruction} onChange={(value) => updateFields(setPart1Fields, "answerInstruction", value)} placeholder="Write your email using all the notes." textarea rows={2} fullWidth />
							</div>
						</SectionCard>
					</div>

					<PreviewCard title="Preview khung email" note="Khung ben phai la HTML se duoc luu va render thang o runtime, nen khong can upload anh." html={task1Html} />
				</div>
			);
		}

		if (sectionId === "q2") {
			return (
				<div className="pet-writing-editor-form-grid">
					<div className="pet-writing-editor-stack">
						<SectionCard iconName="document" title="Announcement box" note="Question 2 duoc lam san dang thong bao de nhap nhanh noi dung article.">
							<div className="pet-writing-editor-fieldset-grid">
								<FormControl label="Dong dan" value={question2Fields.promptLead} onChange={(value) => updateFields(setQuestion2Fields, "promptLead", value)} textarea rows={3} fullWidth />
								<FormControl label="Nhan tren khung" value={question2Fields.badge} onChange={(value) => updateFields(setQuestion2Fields, "badge", value)} placeholder="Articles wanted" />
								<FormControl label="Tieu de lon" value={question2Fields.title} onChange={(value) => updateFields(setQuestion2Fields, "title", value)} placeholder="Computer games" />
								<FormControl label="Dong hoi 1" value={question2Fields.line1} onChange={(value) => updateFields(setQuestion2Fields, "line1", value)} textarea rows={3} fullWidth />
								<FormControl label="Dong hoi 2" value={question2Fields.line2} onChange={(value) => updateFields(setQuestion2Fields, "line2", value)} textarea rows={3} fullWidth />
								<FormControl label="Dong cuoi khung" value={question2Fields.footer} onChange={(value) => updateFields(setQuestion2Fields, "footer", value)} textarea rows={3} fullWidth />
								<FormControl label="Huong dan viet" value={question2Fields.answerInstruction} onChange={(value) => updateFields(setQuestion2Fields, "answerInstruction", value)} placeholder="Write your article." fullWidth />
							</div>
						</SectionCard>
					</div>

					<PreviewCard title="Preview Question 2" note="Hoc sinh se thay mot thong bao dang card thay vi anh chup de." html={part2Question2Html} />
				</div>
			);
		}

		return (
			<div className="pet-writing-editor-form-grid">
				<div className="pet-writing-editor-stack">
					<SectionCard iconName="writing" title="Story starter" note="Question 3 dung mot cau mo dau noi bat, giong de PET nhung gon va de sua hon.">
						<div className="pet-writing-editor-fieldset-grid">
							<FormControl label="Dong dan" value={question3Fields.promptLead} onChange={(value) => updateFields(setQuestion3Fields, "promptLead", value)} textarea rows={3} fullWidth />
							<FormControl label="Dong bo tro" value={question3Fields.promptSupport} onChange={(value) => updateFields(setQuestion3Fields, "promptSupport", value)} textarea rows={3} fullWidth />
							<FormControl label="Cau mo dau" value={question3Fields.storyStarter} onChange={(value) => updateFields(setQuestion3Fields, "storyStarter", value)} textarea rows={5} fullWidth />
							<FormControl label="Huong dan viet" value={question3Fields.answerInstruction} onChange={(value) => updateFields(setQuestion3Fields, "answerInstruction", value)} placeholder="Write your story." fullWidth />
						</div>
					</SectionCard>
				</div>

				<PreviewCard title="Preview Question 3" note="Cau mo dau duoc tach thanh the rieng de hoc sinh doc nhanh va nhap bai vao phan story." html={part2Question3Html} />
			</div>
		);
	};

	const renderManualSectionContent = (sectionId) => {
		if (sectionId === "part1") {
			return (
				<div className="pet-writing-editor-form-grid">
					<div className="pet-writing-editor-stack">
						{legacyModeBanner}
						<SectionCard iconName="writing" title="Part 1 prompt" note="Editor rich text duoc giu lai cho de cu de tranh mat noi dung dang da soan.">
							<div className="pet-writing-editor-quill">
								<ReactQuill
									ref={task1Quill.quillRef}
									theme="snow"
									value={task1}
									onChange={setTask1}
									placeholder="Nhap noi dung Part 1"
									modules={task1Quill.modules}
								/>
							</div>

							<label className="pet-writing-editor-control is-full">
								<span className="pet-writing-editor-control-label">Thay anh Part 1 (neu can)</span>
								<input
									className="pet-writing-editor-file-input"
									type="file"
									accept="image/*"
									onChange={(event) => {
										const nextFile = event.target.files?.[0] || null;
										setImage(nextFile);
										if (nextFile) {
											setRemoveTask1Image(false);
										}
									}}
								/>
							</label>

							{currentPreviewImage ? (
								<div className="pet-writing-editor-legacy-image">
									<div>
										<div className="pet-writing-editor-control-label">Anh Part 1</div>
										<p className="pet-writing-editor-section-note">
											{selectedImagePreview
												? "Anh moi se duoc upload khi ban luu."
												: "Anh hien tai dang di kem de cu."}
										</p>
									</div>
									<img src={currentPreviewImage} alt="Current prompt" />
									<div className="pet-writing-editor-stack">
										{!selectedImagePreview && !removeTask1Image ? (
											<button
												type="button"
												className="pet-writing-editor-danger-btn"
												onClick={() => setRemoveTask1Image(true)}
											>
												Go anh hien tai
											</button>
										) : null}
										{selectedImagePreview ? (
											<button type="button" className="pet-writing-editor-secondary-btn" onClick={() => setImage(null)}>
												Bo anh moi
											</button>
										) : null}
									</div>
								</div>
							) : null}

							{existingImage && removeTask1Image && !selectedImagePreview ? (
								<div className="pet-writing-editor-mode-banner">
									<div>
										<strong>
											<InlineIcon name="document" size={16} />
											<span>Anh cu se duoc go</span>
										</strong>
										<p>Neu ban luu ma khong tai anh moi, task 1 se khong con anh dinh kem.</p>
									</div>
									<button type="button" className="pet-writing-editor-secondary-btn" onClick={() => setRemoveTask1Image(false)}>
										Giu lai anh
									</button>
								</div>
							) : null}
						</SectionCard>
					</div>

					<PreviewCard title="Preview Part 1" note="Preview dung noi dung rich text hien tai, kem anh neu van duoc giu lai." html={task1} />
				</div>
			);
		}

		if (sectionId === "q2") {
			return (
				<div className="pet-writing-editor-form-grid">
					<div className="pet-writing-editor-stack">
						{legacyModeBanner}
						<SectionCard iconName="document" title="Question 2" note="Che do rich text giu nguyen noi dung cu de an toan khi sua.">
							<div className="pet-writing-editor-quill">
								<ReactQuill
									ref={part2Q2Quill.quillRef}
									theme="snow"
									value={part2Question2}
									onChange={setPart2Question2}
									placeholder="Nhap noi dung cau hoi so 2"
									modules={part2Q2Quill.modules}
								/>
							</div>
						</SectionCard>
					</div>

					<PreviewCard title="Preview Question 2" note="Preview se render dung HTML question 2 hien co." html={part2Question2} />
				</div>
			);
		}

		return (
			<div className="pet-writing-editor-form-grid">
				<div className="pet-writing-editor-stack">
					{legacyModeBanner}
					<SectionCard iconName="writing" title="Question 3" note="Story prompt cu duoc chinh sua trong rich text editor de giu nguyen bo cuc hien co.">
						<div className="pet-writing-editor-quill">
							<ReactQuill
								ref={part2Q3Quill.quillRef}
								theme="snow"
								value={part2Question3}
								onChange={setPart2Question3}
								placeholder="Nhap noi dung cau hoi so 3"
								modules={part2Q3Quill.modules}
							/>
						</div>
					</SectionCard>
				</div>

				<PreviewCard title="Preview Question 3" note="Preview se render dung HTML question 3 hien co." html={part2Question3} />
			</div>
		);
	};

	const renderSectionContent = (sectionId) =>
		editorMode === "template" ? renderTemplateSectionContent(sectionId) : renderManualSectionContent(sectionId);

	return (
		<PetWritingEditorShell
			loading={loading}
			loadingMessage="Dang tai de PET Writing..."
			notice={loginNotice}
			pageTitle="Edit PET Writing"
			pageDescription="Shell moi cho PET Writing giup sua de co cau truc ro hon. De cu duoc giu safe trong manual mode, de moi dung khung text-first nhe hon."
			summaryText={editorMode === "template" ? "Template mode: text-first PET prompt" : "Legacy mode: giu nguyen noi dung cu"}
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
			submitLabel="Luu cap nhat"
			submitIcon="save"
			onSubmit={handleSubmit}
		/>
	);
};

export default EditPetWritingTestPage;