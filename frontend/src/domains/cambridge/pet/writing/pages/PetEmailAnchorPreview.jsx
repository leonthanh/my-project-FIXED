import React, { useEffect, useRef, useState } from "react";
import InlineIcon from "../../../../../shared/components/InlineIcon.jsx";
import {
	defaultPetPart1NoteBoxes,
	defaultPetPart1NoteAnchors,
	normalizePetPart1NoteBoxes,
	normalizePetPart1NoteAnchors,
	normalizePetPart1Fields,
	PET_PART1_NOTE_POSITIONS,
} from "./petWritingTemplateUtils.js";

const NOTE_KEYS = ["note1", "note2", "note3", "note4"];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const readonlyEmptyNote = (text) => !String(text || "").trim();

const PetEmailAnchorPreview = ({ fields, onAnchorsChange, onNoteBoxesChange, readonly = false }) => {
	const wrapperRef = useRef(null);
	const [draggingTarget, setDraggingTarget] = useState(null);
	const normalizedFields = normalizePetPart1Fields(fields);
	const noteBoxes = normalizedFields.noteBoxes || defaultPetPart1NoteBoxes;
	const anchors = normalizedFields.noteAnchors || defaultPetPart1NoteAnchors;

	useEffect(() => {
		if (!draggingTarget || readonly) {
			return undefined;
		}

		const handlePointerMove = (event) => {
			if (!wrapperRef.current) {
				return;
			}

			const bounds = wrapperRef.current.getBoundingClientRect();
			const nextX = ((event.clientX - bounds.left) / bounds.width) * 100;
			const nextY = ((event.clientY - bounds.top) / bounds.height) * 100;

			if (draggingTarget.type === "anchor") {
				onAnchorsChange((currentAnchors) =>
					normalizePetPart1NoteAnchors({
						...currentAnchors,
						[draggingTarget.key]: {
							x: clamp(nextX, 0, 100),
							y: clamp(nextY, 0, 100),
						},
					})
				);
				return;
			}

			onNoteBoxesChange((currentBoxes) =>
				normalizePetPart1NoteBoxes({
					...currentBoxes,
					[draggingTarget.key]: {
						x: clamp(nextX, 0, 100),
						y: clamp(nextY, 0, 100),
					},
				})
			);
		};

		const handlePointerUp = () => setDraggingTarget(null);

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [draggingTarget, onAnchorsChange, onNoteBoxesChange, readonly]);

	return (
		<div className="pet-writing-email-preview-shell">
			<div className="pet-writing-email-preview-top">
				<div className="pet-writing-email-preview-badge">Part 1</div>
				{!readonly ? (
					<div className="pet-writing-email-preview-hint">
						<InlineIcon name="average" size={14} />
						<span>Kéo note box bên ngoài hoặc chấm neo trong email để canh line theo ý muốn.</span>
					</div>
				) : null}
			</div>
			<p className="pet-writing-email-preview-copy"><strong>You must answer this question.</strong></p>
			<p className="pet-writing-email-preview-copy">Write your answer in about 100 words on the answer sheet.</p>
			<div className="pet-writing-email-preview-question">Question 1</div>
			<p className="pet-writing-email-preview-copy pet-writing-email-preview-copy--intro">{normalizedFields.promptIntro}</p>

			<div className={`pet-writing-email-preview-stage ${readonly ? "is-readonly" : ""}`} ref={wrapperRef}>
				<svg className="pet-writing-email-preview-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
					{NOTE_KEYS.map((noteKey) => {
						const noteText = normalizedFields[noteKey];
						if (readonlyEmptyNote(noteText)) {
							return null;
						}

						const position = PET_PART1_NOTE_POSITIONS[noteKey];
						const noteBox = noteBoxes[noteKey] || defaultPetPart1NoteBoxes[noteKey];
						const anchor = anchors[noteKey] || defaultPetPart1NoteAnchors[noteKey];

						return (
							<line
								key={`${noteKey}-line`}
								x1={noteBox.x}
								y1={noteBox.y}
								x2={anchor.x}
								y2={anchor.y}
							/>
						);
					})}
				</svg>

				<div className="pet-writing-email-preview-card">
					<div className="pet-writing-email-preview-card-header">
						<InlineIcon name="mail" size={14} />
						<span>EMAIL</span>
					</div>
					<div className="pet-writing-email-preview-card-body">
						<div className="pet-writing-email-preview-meta">
							<div className="pet-writing-email-preview-meta-row">
								<div>From</div>
								<div>{normalizedFields.from}</div>
							</div>
							<div className="pet-writing-email-preview-meta-row">
								<div>To</div>
								<div>{normalizedFields.to}</div>
							</div>
							<div className="pet-writing-email-preview-meta-row">
								<div>Subject</div>
								<div>{normalizedFields.subject}</div>
							</div>
						</div>
						<div className="pet-writing-email-preview-divider" />
						<div className="pet-writing-email-preview-body" dangerouslySetInnerHTML={{ __html: normalizedFields.emailBodyHtml }} />
					</div>
				</div>

				{NOTE_KEYS.map((noteKey) => {
					const noteText = normalizedFields[noteKey];
					if (readonlyEmptyNote(noteText)) {
						return null;
					}

					const position = PET_PART1_NOTE_POSITIONS[noteKey];
					const noteBox = noteBoxes[noteKey] || defaultPetPart1NoteBoxes[noteKey];
					const anchor = anchors[noteKey] || defaultPetPart1NoteAnchors[noteKey];
					const isRightAligned = position.textAlign === "right";

					return (
						<React.Fragment key={noteKey}>
							<div
								className={`pet-writing-email-preview-note ${isRightAligned ? "is-right" : "is-left"}`}
								style={{
									left: `${noteBox.x}%`,
									top: `${noteBox.y}%`,
									maxWidth: `${position.maxWidth}px`,
								}}
								onPointerDown={
									readonly
										? undefined
										: (event) => {
											event.preventDefault();
											setDraggingTarget({ type: "box", key: noteKey });
										}
								}
								role={readonly ? undefined : "button"}
								aria-label={readonly ? undefined : `Move ${noteKey} note box`}
							>
								{noteText}
							</div>
							{!readonly ? (
								<button
									type="button"
									className="pet-writing-email-preview-anchor"
									style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
									onPointerDown={(event) => {
										event.preventDefault();
										setDraggingTarget({ type: "anchor", key: noteKey });
									}}
									aria-label={`Move ${noteKey} anchor`}
								/>
							) : null}
						</React.Fragment>
					);
				})}
			</div>

			<p className="pet-writing-email-preview-footer"><strong>{normalizedFields.answerInstruction}</strong></p>
		</div>
	);
};

export default PetEmailAnchorPreview;