import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import { useNavigate, useParams } from "react-router-dom";
import InlineIcon from "../../../../../shared/components/InlineIcon.jsx";
import { apiPath, authFetch, hostPath, redirectToLogin } from "../../../../../shared/utils/api";
import useQuillImageUpload from "../../../../../shared/hooks/useQuillImageUpload";
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
	parsePetPart1Fields,
	parsePetQuestion2Fields,
	parsePetQuestion3Fields,
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
			caption: editorMode === "manual" ? "Rich text + ảnh cũ" : "Khung email có note line",
			note:
				editorMode === "manual"
					? "Editor giữ nội dung cũ an toàn trong chế độ thủ công."
					: "Body email dùng ReactQuill, kéo được cả note box ngoài và chấm neo trong email.",
		},
		{
			id: "q2",
			title: "Question 2",
			pill: editorMode === "manual" ? "Legacy" : "Article",
			badge: "Part 2",
			caption: editorMode === "manual" ? "Rich text prompt" : "Announcement box",
			note:
				editorMode === "manual"
					? "Nội dung cũ được giữ nguyên để tránh mất dữ liệu."
					: "Khung thông báo để ra đề viết bài article.",
		},
		{
			id: "q3",
			title: "Question 3",
			pill: editorMode === "manual" ? "Legacy" : "Story",
			badge: "Part 2",
			caption: editorMode === "manual" ? "Rich text prompt" : "Story starter",
			note:
				editorMode === "manual"
					? "Story prompt cũ được sửa trong rich text editor."
					: "Nổi bật câu mở đầu để học sinh viết story.",
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

	const legacyModeBanner = (
		<div className="pet-writing-editor-mode-banner">
			<div>
				<strong>
					<InlineIcon name="average" size={16} />
					<span>Đang giữ chế độ thủ công cho đề cũ</span>
				</strong>
				<p>
					Nội dung hiện tại không được tạo bằng khung PET mới, nên editor giữ rich text và ảnh legacy để
					tránh mất dữ liệu. Bạn vẫn có shell mới, sidebar mới và preview đầy đủ.
				</p>
			</div>
		</div>
	);

	const templateImageNotice = existingImage ? (
		<div className="pet-writing-editor-mode-banner">
			<div>
				<strong>
					<InlineIcon name="document" size={16} />
					<span>Ảnh cũ sẽ được gỡ khi lưu</span>
				</strong>
				<p>
					Đề này đang có ảnh Part 1 từ phiên bản cũ. Khi bạn lưu ở chế độ khung text-first, hệ thống sẽ gỡ ảnh
					cũ và chỉ giữ HTML nhẹ hơn.
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
								<FormControl label="From" value={part1Fields.from} onChange={(value) => updateFields(setPart1Fields, "from", value)} placeholder="Miss Jones" />
								<FormControl label="To" value={part1Fields.to} onChange={(value) => updateFields(setPart1Fields, "to", value)} placeholder="All students" />
								<FormControl label="Subject" value={part1Fields.subject} onChange={(value) => updateFields(setPart1Fields, "subject", value)} placeholder="Visitor to English class" fullWidth />
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
								<FormControl label="Note 1" value={part1Fields.note1} onChange={(value) => updateFields(setPart1Fields, "note1", value)} placeholder="Great!" />
								<FormControl label="Note 2" value={part1Fields.note2} onChange={(value) => updateFields(setPart1Fields, "note2", value)} placeholder="I think ..." />
								<FormControl label="Note 3" value={part1Fields.note3} onChange={(value) => updateFields(setPart1Fields, "note3", value)} placeholder="Tell Miss Jones" />
								<FormControl label="Note 4" value={part1Fields.note4} onChange={(value) => updateFields(setPart1Fields, "note4", value)} placeholder="Suggest ..." />
								<FormControl label="Hướng dẫn cuối" value={part1Fields.answerInstruction} onChange={(value) => updateFields(setPart1Fields, "answerInstruction", value)} placeholder="Write your email using all the notes." textarea rows={2} fullWidth />
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

					<PreviewCard title="Preview khung email" note="Preview này cho phép kéo note box và chấm neo trực tiếp. Khi lưu, vị trí line sẽ đi theo vào đề thi thật.">
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
								<FormControl label="Dòng dẫn" value={question2Fields.promptLead} onChange={(value) => updateFields(setQuestion2Fields, "promptLead", value)} textarea rows={3} fullWidth />
								<FormControl label="Nhãn trên khung" value={question2Fields.badge} onChange={(value) => updateFields(setQuestion2Fields, "badge", value)} placeholder="Articles wanted" />
								<FormControl label="Tiêu đề lớn" value={question2Fields.title} onChange={(value) => updateFields(setQuestion2Fields, "title", value)} placeholder="Computer games" />
								<FormControl label="Dòng hỏi 1" value={question2Fields.line1} onChange={(value) => updateFields(setQuestion2Fields, "line1", value)} textarea rows={3} fullWidth />
								<FormControl label="Dòng hỏi 2" value={question2Fields.line2} onChange={(value) => updateFields(setQuestion2Fields, "line2", value)} textarea rows={3} fullWidth />
								<FormControl label="Dòng cuối khung" value={question2Fields.footer} onChange={(value) => updateFields(setQuestion2Fields, "footer", value)} textarea rows={3} fullWidth />
								<FormControl label="Hướng dẫn viết" value={question2Fields.answerInstruction} onChange={(value) => updateFields(setQuestion2Fields, "answerInstruction", value)} placeholder="Write your article." fullWidth />
							</div>
						</SectionCard>
					</div>

					<PreviewCard title="Preview Question 2" note="Học sinh sẽ thấy một thông báo dạng card thay vì ảnh chụp đề." html={part2Question2Html} />
				</div>
			);
		}

		return (
			<div className="pet-writing-editor-form-grid">
				<div className="pet-writing-editor-stack">
					<SectionCard iconName="writing" title="Story starter" note="Question 3 dùng một câu mở đầu nổi bật, giống đề PET nhưng gọn và dễ sửa hơn.">
						<div className="pet-writing-editor-fieldset-grid">
							<FormControl label="Dòng dẫn" value={question3Fields.promptLead} onChange={(value) => updateFields(setQuestion3Fields, "promptLead", value)} textarea rows={3} fullWidth />
							<FormControl label="Dòng bổ trợ" value={question3Fields.promptSupport} onChange={(value) => updateFields(setQuestion3Fields, "promptSupport", value)} textarea rows={3} fullWidth />
							<FormControl label="Câu mở đầu" value={question3Fields.storyStarter} onChange={(value) => updateFields(setQuestion3Fields, "storyStarter", value)} textarea rows={5} fullWidth />
							<FormControl label="Hướng dẫn viết" value={question3Fields.answerInstruction} onChange={(value) => updateFields(setQuestion3Fields, "answerInstruction", value)} placeholder="Write your story." fullWidth />
						</div>
					</SectionCard>
				</div>

				<PreviewCard title="Preview Question 3" note="Câu mở đầu được tách thành thẻ riêng để học sinh đọc nhanh và nhập bài vào phần story." html={part2Question3Html} />
			</div>
		);
	};

	const renderManualSectionContent = (sectionId) => {
		if (sectionId === "part1") {
			return (
				<div className="pet-writing-editor-form-grid">
					<div className="pet-writing-editor-stack">
						{legacyModeBanner}
						<SectionCard iconName="writing" title="Part 1 prompt" note="Editor rich text được giữ lại cho đề cũ để tránh mất nội dung đang soạn.">
							<div className="pet-writing-editor-quill">
								<ReactQuill
									ref={task1Quill.quillRef}
									theme="snow"
									value={task1}
									onChange={setTask1}
									placeholder="Nhập nội dung Part 1"
									modules={task1Quill.modules}
								/>
							</div>

							<label className="pet-writing-editor-control is-full">
								<span className="pet-writing-editor-control-label">Thay ảnh Part 1 (nếu cần)</span>
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
										<div className="pet-writing-editor-control-label">Ảnh Part 1</div>
										<p className="pet-writing-editor-section-note">
											{selectedImagePreview
												? "Ảnh mới sẽ được upload khi bạn lưu."
												: "Ảnh hiện tại đang đi kèm đề cũ."}
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
												Gỡ ảnh hiện tại
											</button>
										) : null}
										{selectedImagePreview ? (
											<button type="button" className="pet-writing-editor-secondary-btn" onClick={() => setImage(null)}>
												Bỏ ảnh mới
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
											<span>Ảnh cũ sẽ được gỡ</span>
										</strong>
										<p>Nếu bạn lưu mà không tải ảnh mới, task 1 sẽ không còn ảnh đính kèm.</p>
									</div>
									<button type="button" className="pet-writing-editor-secondary-btn" onClick={() => setRemoveTask1Image(false)}>
										Giữ lại ảnh
									</button>
								</div>
							) : null}
						</SectionCard>
					</div>

					<PreviewCard title="Preview Part 1" note="Preview dùng nội dung rich text hiện tại, kèm ảnh nếu vẫn được giữ lại." html={task1} />
				</div>
			);
		}

		if (sectionId === "q2") {
			return (
				<div className="pet-writing-editor-form-grid">
					<div className="pet-writing-editor-stack">
						{legacyModeBanner}
						<SectionCard iconName="document" title="Question 2" note="Chế độ rich text giữ nguyên nội dung cũ để an toàn khi sửa.">
							<div className="pet-writing-editor-quill">
								<ReactQuill
									ref={part2Q2Quill.quillRef}
									theme="snow"
									value={part2Question2}
									onChange={setPart2Question2}
									placeholder="Nhập nội dung câu hỏi số 2"
									modules={part2Q2Quill.modules}
								/>
							</div>
						</SectionCard>
					</div>

					<PreviewCard title="Preview Question 2" note="Preview sẽ render đúng HTML question 2 hiện có." html={part2Question2} />
				</div>
			);
		}

		return (
			<div className="pet-writing-editor-form-grid">
				<div className="pet-writing-editor-stack">
					{legacyModeBanner}
					<SectionCard iconName="writing" title="Question 3" note="Story prompt cũ được chỉnh sửa trong rich text editor để giữ nguyên bố cục hiện có.">
						<div className="pet-writing-editor-quill">
							<ReactQuill
								ref={part2Q3Quill.quillRef}
								theme="snow"
								value={part2Question3}
								onChange={setPart2Question3}
								placeholder="Nhập nội dung câu hỏi số 3"
								modules={part2Q3Quill.modules}
							/>
						</div>
					</SectionCard>
				</div>

				<PreviewCard title="Preview Question 3" note="Preview sẽ render đúng HTML question 3 hiện có." html={part2Question3} />
			</div>
		);
	};

	const renderSectionContent = (sectionId) =>
		editorMode === "template" ? renderTemplateSectionContent(sectionId) : renderManualSectionContent(sectionId);

	return (
		<PetWritingEditorShell
			loading={loading}
			loadingMessage="Đang tải đề PET Writing..."
			notice={loginNotice}
			pageTitle="Edit PET Writing"
			pageDescription="Shell mới cho PET Writing giúp sửa đề có cấu trúc rõ hơn. Đề cũ được giữ safe trong manual mode, đề mới dùng khung text-first nhẹ hơn."
			summaryText={editorMode === "template" ? "Template mode: text-first PET prompt" : "Legacy mode: giữ nguyên nội dung cũ"}
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
			submitLabel="Lưu cập nhật"
			submitIcon="save"
			onSubmit={handleSubmit}
		/>
	);
};

export default EditPetWritingTestPage;