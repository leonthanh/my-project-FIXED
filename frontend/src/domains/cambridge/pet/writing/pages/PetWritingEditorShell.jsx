import React, { useMemo, useState } from "react";
import AdminNavbar from "../../../../../shared/components/AdminNavbar";
import InlineIcon from "../../../../../shared/components/InlineIcon.jsx";

import "../../../../../shared/styles/WritingEditorForm.css";

const resolveMessageTone = (tone) => (tone === "error" ? "error" : "success");

const PetWritingEditorShell = ({
	loading = false,
	loadingMessage = "Dang tai du lieu...",
	notice = null,
	pageTitle,
	pageDescription,
	summaryText,
	classCode,
	onClassCodeChange,
	teacherName,
	onTeacherNameChange,
	message,
	messageTone,
	sections,
	activeSection,
	onSectionChange,
	renderSectionContent,
	previewTitle = "Xem truoc de PET Writing",
	previewSections,
	submitLabel,
	submitIcon = "save",
	onSubmit,
}) => {
	const [showPreview, setShowPreview] = useState(false);

	const activeSectionConfig = useMemo(
		() => sections.find((section) => section.id === activeSection) || sections[0],
		[activeSection, sections]
	);

	if (loading) {
		return (
			<>
				<AdminNavbar />
				<div className="create-writing-container pet-writing-editor-shell">
					<div className="pet-writing-editor-loading">
						<InlineIcon name="loading" size={16} />
						<span>{loadingMessage}</span>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<AdminNavbar />
			<div className="create-writing-container pet-writing-editor-shell">
				{notice ? <div className="pet-writing-editor-notice">{notice}</div> : null}
				<form onSubmit={onSubmit}>
					<div className="pet-writing-editor-header-card">
						<div className="pet-writing-editor-header-top">
							<div>
								<h2 className="pet-writing-editor-title">
									<span className="pet-writing-editor-title-icon">
										<InlineIcon name="writing" size={18} />
									</span>
									<span>{pageTitle}</span>
								</h2>
								{pageDescription ? (
									<p className="pet-writing-editor-subtitle">{pageDescription}</p>
								) : null}
							</div>
							{summaryText ? (
								<div className="pet-writing-editor-summary-pill">
									<InlineIcon name="document" size={14} />
									<span>{summaryText}</span>
								</div>
							) : null}
						</div>

						<div className="pet-writing-editor-meta-grid">
							<label className="pet-writing-editor-field">
								<span className="pet-writing-editor-field-label">Ma lop</span>
								<input
									type="text"
									placeholder="VD: 317S3"
									value={classCode}
									onChange={(event) => onClassCodeChange(event.target.value)}
								/>
							</label>
							<label className="pet-writing-editor-field">
								<span className="pet-writing-editor-field-label">Giao vien</span>
								<input
									type="text"
									placeholder="Ten giao vien ra de"
									value={teacherName}
									onChange={(event) => onTeacherNameChange(event.target.value)}
								/>
							</label>
						</div>

						{message ? (
							<div className={`pet-writing-editor-message is-${resolveMessageTone(messageTone)}`}>
								{message}
							</div>
						) : null}
					</div>

					<div className="pet-writing-editor-workspace">
						<aside className="pet-writing-editor-sidebar">
							<div className="pet-writing-editor-sidebar-header">Cau truc de</div>
							<div className="pet-writing-editor-sidebar-list">
								{sections.map((section) => {
									const isActive = section.id === activeSectionConfig.id;
									return (
										<button
											key={section.id}
											type="button"
											className={`pet-writing-editor-sidebar-card ${isActive ? "is-active" : ""}`}
											onClick={() => onSectionChange(section.id)}
										>
											<div className="pet-writing-editor-sidebar-card-top">
												<span className="pet-writing-editor-sidebar-card-title">{section.title}</span>
												{section.pill ? (
													<span className="pet-writing-editor-sidebar-card-pill">{section.pill}</span>
												) : null}
											</div>
											{section.caption ? (
												<p className="pet-writing-editor-sidebar-card-caption">{section.caption}</p>
											) : null}
										</button>
									);
								})}
							</div>
						</aside>

						<div className="pet-writing-editor-main">
							<section className="pet-writing-editor-panel">
								<header className="pet-writing-editor-panel-header">
									<div>
										<span className="pet-writing-editor-panel-badge">{activeSectionConfig.badge || "PET Writing"}</span>
										<h3 className="pet-writing-editor-panel-heading">{activeSectionConfig.title}</h3>
									</div>
									{activeSectionConfig.note ? (
										<div className="pet-writing-editor-panel-note">{activeSectionConfig.note}</div>
									) : null}
								</header>
								<div className="pet-writing-editor-panel-body">{renderSectionContent(activeSectionConfig.id)}</div>
							</section>

							<div className="pet-writing-editor-actions">
								<button
									type="button"
									className="pet-writing-editor-secondary-btn"
									onClick={() => setShowPreview(true)}
								>
									<InlineIcon name="eye" size={14} />
									<span>Preview</span>
								</button>
								<button type="submit" className="pet-writing-editor-primary-btn">
									<InlineIcon name={submitIcon} size={14} />
									<span>{submitLabel}</span>
								</button>
							</div>
						</div>
					</div>
				</form>

				{showPreview ? (
					<div className="pet-writing-editor-preview-backdrop" onClick={() => setShowPreview(false)}>
						<div
							className="pet-writing-editor-preview-modal"
							onClick={(event) => event.stopPropagation()}
						>
							<div className="pet-writing-editor-preview-header">
								<h3>
									<InlineIcon name="document" size={18} />
									<span>{previewTitle}</span>
								</h3>
								<button
									type="button"
									className="pet-writing-editor-preview-close"
									onClick={() => setShowPreview(false)}
								>
									Dong
								</button>
							</div>

							<div className="pet-writing-editor-preview-meta">
								<span>Ma lop: {classCode || "Chua nhap"}</span>
								<span>Giao vien: {teacherName || "Chua nhap"}</span>
							</div>

							{previewSections.map((section) => (
								<section key={section.id} className="pet-writing-editor-preview-section">
									<div className="pet-writing-editor-preview-section-header">{section.title}</div>
									{section.imageSrc ? (
										<div className="pet-writing-editor-preview-image-wrap">
											<img src={section.imageSrc} alt={section.imageAlt || section.title} />
										</div>
									) : null}
									<div
										className="pet-writing-editor-preview-html"
										dangerouslySetInnerHTML={{ __html: section.html }}
									/>
								</section>
							))}
						</div>
					</div>
				) : null}
			</div>
		</>
	);
};

export default PetWritingEditorShell;