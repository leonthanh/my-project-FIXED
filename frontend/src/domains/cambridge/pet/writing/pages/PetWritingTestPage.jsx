import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiPath, hostPath, redirectInApp, redirectToLogin } from '../../../../../shared/utils/api';
import TestHeader from '../../../../../shared/components/TestHeader';
import TestStartModal from '../../../../../shared/components/TestStartModal';
import { getOrangeSelectTestPathForTestType } from '../../../config/navigation';
import {
	buildPlacementAttemptPath,
	readPlacementRuntimeContext,
} from '../../../../../shared/utils/placementTests';
import './PetWritingTest.css';

const DURATION_SECONDS = 45 * 60;

const PetWritingTestPage = () => {
	const { id: routeTestId } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const placementContext = useMemo(
		() => readPlacementRuntimeContext({ pathname: location.pathname, search: location.search }),
		[location.pathname, location.search]
	);
	const isPlacementRuntime = Boolean(
		placementContext.isPlacementRuntime && placementContext.placementAttemptItemToken
	);
	const storageSuffix = isPlacementRuntime && placementContext.placementAttemptItemToken
		? `:${placementContext.placementAttemptItemToken}`
		: '';
	const task1StorageKey = `pet_writing_task1${storageSuffix}`;
	const task2Q2StorageKey = `pet_writing_task2_q2${storageSuffix}`;
	const task2Q3StorageKey = `pet_writing_task2_q3${storageSuffix}`;
	const selectedQuestionStorageKey = `pet_writing_selected_q${storageSuffix}`;
	const timeLeftStorageKey = `pet_writing_timeLeft${storageSuffix}`;
	const endAtStorageKey = `pet_writing_endAt${storageSuffix}`;
	const startedStorageKey = `pet_writing_started${storageSuffix}`;
	const questionPickStorageKey = `pet_writing_question_pick${storageSuffix}`;
	const exitPath = useMemo(
		() => (
			isPlacementRuntime && placementContext.placementAttemptToken
				? buildPlacementAttemptPath(placementContext.placementAttemptToken)
				: getOrangeSelectTestPathForTestType('pet-writing')
		),
		[isPlacementRuntime, placementContext.placementAttemptToken]
	);
	const user = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem('user') || 'null');
		} catch (_error) {
			return null;
		}
	}, []);
	const selectedTestId = useMemo(() => {
		if (isPlacementRuntime && routeTestId) {
			return String(routeTestId);
		}

		return (
			localStorage.getItem('selectedPetWritingTestId') ||
			localStorage.getItem('selectedTestId') ||
			''
		);
	}, [isPlacementRuntime, routeTestId]);

	const [task1Answer, setTask1Answer] = useState(
		localStorage.getItem(task1StorageKey) || ''
	);
	const [task2Answer2, setTask2Answer2] = useState(
		localStorage.getItem(task2Q2StorageKey) || ''
	);
	const [task2Answer3, setTask2Answer3] = useState(
		localStorage.getItem(task2Q3StorageKey) || ''
	);
	const [selectedQuestion, setSelectedQuestion] = useState(
		localStorage.getItem(selectedQuestionStorageKey) || '2'
	);
	const [timeLeft, setTimeLeft] = useState(() => {
		const saved = localStorage.getItem(timeLeftStorageKey);
		if (!saved) return DURATION_SECONDS;
		return Math.min(parseInt(saved, 10), DURATION_SECONDS);
	});
	const [endAt, setEndAt] = useState(() => {
		const saved = localStorage.getItem(endAtStorageKey);
		return saved ? parseInt(saved, 10) : 0;
	});
	const [started, setStarted] = useState(
		localStorage.getItem(startedStorageKey) === 'true'
	);
	const [submitted, setSubmitted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState('');
	const [activePanel, setActivePanel] = useState('part1');
	const [testData, setTestData] = useState(null);
	const [isMobile, setIsMobile] = useState(
		typeof window !== 'undefined' ? window.innerWidth <= 900 : false
	);
	const [leftWidth, setLeftWidth] = useState(50);
	const [isResizing, setIsResizing] = useState(false);
	const containerRef = useRef(null);
	const autoSubmittingRef = useRef(false);
	const [questionPick, setQuestionPick] = useState(() => {
		try {
			const raw = localStorage.getItem(questionPickStorageKey);
			const parsed = raw ? JSON.parse(raw) : null;
			return {
				q2: parsed?.q2 || 'UNDECIDED',
				q3: parsed?.q3 || 'UNDECIDED',
			};
		} catch (e) {
			return { q2: 'UNDECIDED', q3: 'UNDECIDED' };
		}
	});

	const normalizeHtmlImages = (html) => {
		if (!html) return '';
		return html.replace(
			/src=(['"])(\/?uploads\/[^'"]+)\1/g,
			(_match, quote, path) => `src=${quote}${hostPath(path)}${quote}`
		);
	};

	useEffect(() => {
		localStorage.setItem(task1StorageKey, task1Answer);
	}, [task1Answer, task1StorageKey]);

	useEffect(() => {
		localStorage.setItem(task2Q2StorageKey, task2Answer2);
	}, [task2Answer2, task2Q2StorageKey]);

	useEffect(() => {
		localStorage.setItem(task2Q3StorageKey, task2Answer3);
	}, [task2Answer3, task2Q3StorageKey]);

	useEffect(() => {
		localStorage.setItem(selectedQuestionStorageKey, selectedQuestion);
	}, [selectedQuestion, selectedQuestionStorageKey]);

	useEffect(() => {
		localStorage.setItem(questionPickStorageKey, JSON.stringify(questionPick));
	}, [questionPick, questionPickStorageKey]);

	useEffect(() => {
		localStorage.setItem(timeLeftStorageKey, timeLeft.toString());
	}, [timeLeft, timeLeftStorageKey]);

	useEffect(() => {
		localStorage.setItem(startedStorageKey, started.toString());
	}, [started, startedStorageKey]);

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= 900);
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	useEffect(() => {
		if (!selectedTestId) {
			setMessage(isPlacementRuntime ? 'This placement writing link is incomplete.' : 'Cannot find selected test.');
			return;
		}

		const fetchTestData = async () => {
			try {
				const res = await fetch(apiPath(`writing-tests/detail/${selectedTestId}`));
				if (!res.ok) {
					throw new Error(`Error ${res.status}: Test not found.`);
				}
				const data = await res.json();
				setTestData(data);
			} catch (err) {
				console.error('Failed to load PET writing test:', err);
				setMessage('Cannot load the test. Please select again.');
			}
		};

		fetchTestData();
	}, [isPlacementRuntime, selectedTestId]);

	useEffect(() => {
		if (endAt) {
			localStorage.setItem(endAtStorageKey, endAt.toString());
		} else {
			localStorage.removeItem(endAtStorageKey);
		}
	}, [endAt, endAtStorageKey]);

	useEffect(() => {
		if (started && !endAt) {
			const nextEndAt = Date.now() + timeLeft * 1000;
			setEndAt(nextEndAt);
		}
	}, [started, endAt, timeLeft]);

	const handleMouseDown = (e) => {
		e.preventDefault();
		setIsResizing(true);
	};

	const handleMouseMove = useCallback((e) => {
		if (!isResizing || !containerRef.current) return;
		const container = containerRef.current;
		const rect = container.getBoundingClientRect();
		const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
		if (newLeftWidth >= 25 && newLeftWidth <= 75) {
			setLeftWidth(newLeftWidth);
		}
	}, [isResizing]);

	const handleMouseUp = useCallback(() => {
		setIsResizing(false);
	}, []);

	useEffect(() => {
		if (!isResizing) return;
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isResizing, handleMouseMove, handleMouseUp]);

	const resolvePart2Submission = useCallback(() => {
		const answer2 = task2Answer2.trim();
		const answer3 = task2Answer3.trim();
		const explicitChoice = questionPick.q2 === 'YES'
			? '2'
			: questionPick.q3 === 'YES'
				? '3'
				: null;

		if (explicitChoice === '2') {
			return { chosen: '2', answer: task2Answer2 };
		}
		if (explicitChoice === '3') {
			return { chosen: '3', answer: task2Answer3 };
		}

		if (answer2 && !answer3) {
			return { chosen: '2', answer: task2Answer2 };
		}
		if (answer3 && !answer2) {
			return { chosen: '3', answer: task2Answer3 };
		}

		const fallbackChoice = selectedQuestion === '3' ? '3' : '2';
		return {
			chosen: fallbackChoice,
			answer: fallbackChoice === '3' ? task2Answer3 : task2Answer2,
		};
	}, [questionPick.q2, questionPick.q3, selectedQuestion, task2Answer2, task2Answer3]);

	const submitCurrentWork = useCallback(async ({ bypassValidation = false } = {}) => {
		if (submitted || isSubmitting) return;

		if (!selectedTestId) {
			setMessage('Cannot find test ID.');
			autoSubmittingRef.current = false;
			return;
		}

		const { answer } = resolvePart2Submission();
		if (!bypassValidation && (!task1Answer.trim() || !answer.trim())) {
			setMessage('Please complete Part 1 and choose one Part 2 response before submitting.');
			return;
		}

		setIsSubmitting(true);
		setSubmitted(true);

		try {
			const payload = {
				task1: task1Answer,
				task2: answer,
				timeLeft,
				testId: parseInt(selectedTestId, 10),
			};

			if (isPlacementRuntime && placementContext.placementAttemptItemToken) {
				payload.placementAttemptItemToken = placementContext.placementAttemptItemToken;
			} else if (user) {
				payload.user = user;
			}

			const res = await fetch(apiPath('writing/submit'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await res.json();
			setMessage(data.message || 'Submission complete.');

			localStorage.removeItem(task1StorageKey);
			localStorage.removeItem(task2Q2StorageKey);
			localStorage.removeItem(task2Q3StorageKey);
			localStorage.removeItem(selectedQuestionStorageKey);
			localStorage.removeItem(timeLeftStorageKey);
			localStorage.removeItem(startedStorageKey);
			localStorage.removeItem(endAtStorageKey);
			localStorage.removeItem(questionPickStorageKey);

			if (!isPlacementRuntime) {
				localStorage.removeItem('selectedPetWritingTestId');
				localStorage.removeItem('selectedTestId');
				localStorage.removeItem('user');
			}

			setTimeout(() => {
				if (isPlacementRuntime) {
					navigate(exitPath, { replace: true });
					return;
				}

				redirectToLogin({ replace: true });
			}, isPlacementRuntime ? 1200 : 3000);
		} catch (err) {
			console.error('Submit error:', err);
			setMessage('Failed to submit. Please try again.');
			setSubmitted(false);
			autoSubmittingRef.current = false;
		} finally {
			setIsSubmitting(false);
		}
	}, [
		endAtStorageKey,
		exitPath,
		isPlacementRuntime,
		isSubmitting,
		navigate,
		placementContext.placementAttemptItemToken,
		questionPickStorageKey,
		resolvePart2Submission,
		selectedQuestionStorageKey,
		selectedTestId,
		startedStorageKey,
		submitted,
		task1Answer,
		task1StorageKey,
		task2Q2StorageKey,
		task2Q3StorageKey,
		timeLeft,
		timeLeftStorageKey,
		user,
	]);

	const handleSubmit = useCallback(() => {
		submitCurrentWork();
	}, [submitCurrentWork]);

	const submitRef = useRef(submitCurrentWork);
	useEffect(() => {
		submitRef.current = submitCurrentWork;
	}, [submitCurrentWork]);

	useEffect(() => {
		if (!started || submitted || isSubmitting || !endAt) return;

		const tick = () => {
			const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
			setTimeLeft(remaining);
			if (remaining <= 0 && !autoSubmittingRef.current) {
				autoSubmittingRef.current = true;
				setMessage('Time is up. Submitting your current work.');
				submitRef.current({ bypassValidation: true });
			}
		};

		tick();
		const intervalId = setInterval(tick, 1000);
		return () => clearInterval(intervalId);
	}, [started, submitted, isSubmitting, endAt]);

	const countWords = (text) => {
		const trimmed = text.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).length;
	};

	const steps = ['part1', 'q2', 'q3'];
	const currentStepIndex = Math.max(0, steps.indexOf(activePanel));
	const part1Answered = task1Answer.trim().length > 0;
	const totalWords = countWords(task1Answer) + countWords(resolvePart2Submission().answer);
	const totalWordTarget = 200;

	if (testData && !started && !submitted) {
		const petWritingMinutes =
			Number.isFinite(timeLeft) && timeLeft > 0 ? Math.ceil(timeLeft / 60) : 45;

		return (
			<TestStartModal
				iconName="writing"
				eyebrow="PET Writing"
				subtitle="Writing Test"
				title={testData?.title || 'PET Writing'}
				stats={[
					{ value: petWritingMinutes, label: 'Minutes', tone: 'sky' },
					{ value: 2, label: 'Parts', tone: 'green' },
				]}
				statsMinWidth={140}
				noticeTitle="Important note"
				noticeContent={
					<>
						The timer starts as soon as you press Start. The system auto-saves your Part 1 answer and your selected Part 2 response while you work.
					</>
				}
				secondaryLabel={isPlacementRuntime ? 'Back to placement' : 'Cancel'}
				onSecondary={() => {
					if (isPlacementRuntime) {
						navigate(exitPath, { replace: true });
						return;
					}

					redirectInApp(getOrangeSelectTestPathForTestType('pet-writing'), {
						replace: true,
					});
				}}
				primaryLabel="Start test"
				onPrimary={() => {
					autoSubmittingRef.current = false;
					setMessage('');
					setStarted(true);
				}}
			/>
		);
	}

	const goToStep = (index) => {
		const next = steps[index];
		if (!next) return;
		setActivePanel(next);
		if (next === 'q2') setSelectedQuestion('2');
		if (next === 'q3') setSelectedQuestion('3');
	};

	const handleQuestionPickChange = (key, value) => {
		setQuestionPick((prev) => {
			const next = { ...prev, [key]: value };
			if (value === 'YES') {
				const otherKey = key === 'q2' ? 'q3' : 'q2';
				next[otherKey] = 'NO';
				setSelectedQuestion(key === 'q2' ? '2' : '3');
			}
			return next;
		});
	};

	const renderPrompt = () => {
		if (!testData) return null;

		if (activePanel === 'part1') {
			return (
				<div className="pet-writing-prompt">
					<div className="pet-writing-section-label">Part 1</div>
					<p className="pet-writing-instruction">
						You must answer this question. Write about 100 words.
					</p>
					<div
						className="pet-writing-rich"
						dangerouslySetInnerHTML={{
							__html: normalizeHtmlImages(testData.task1 || ''),
						}}
					/>
					{testData.task1Image && (
						<div className="pet-writing-image-frame">
							<img
								src={hostPath(testData.task1Image)}
								alt="Task visual"
								className="pet-writing-image"
							/>
						</div>
					)}
				</div>
			);
		}

		const isQuestion2 = activePanel === 'q2';
		const questionHtml = isQuestion2
			? testData.part2Question2
			: testData.part2Question3;

		return (
			<div className="pet-writing-prompt">
				<div className="pet-writing-section-label">Part 2</div>
				<p className="pet-writing-instruction">
					Answer one of the questions (2 or 3). Write about 100 words.
				</p>
				<div className="pet-writing-question-chip">
					Question {isQuestion2 ? '2' : '3'}
				</div>
				<div
					className="pet-writing-rich"
					dangerouslySetInnerHTML={{
						__html: normalizeHtmlImages(questionHtml || ''),
					}}
				/>
			</div>
		);
	};

	const renderAnswerArea = () => {
		if (activePanel === 'part1') {
			return (
				<section className="pet-writing-answer-card" aria-label="Part 1 answer area">
					<div className="pet-writing-answer-top">
						<div>
							<h3 className="pet-writing-answer-title">Part 1 response</h3>
							<p className="pet-writing-answer-note">Write about 100 words for the required question.</p>
						</div>
						<span className="pet-writing-word-pill">Words: {countWords(task1Answer)}</span>
					</div>

					<textarea
						aria-label="Part 1 response"
						className="pet-writing-textarea"
						rows={18}
						spellCheck={false}
						value={task1Answer}
						onChange={(e) => setTask1Answer(e.target.value)}
					/>
				</section>
			);
		}

		const isQuestion2 = activePanel === 'q2';
		const questionKey = isQuestion2 ? 'q2' : 'q3';
		const activeAnswer = isQuestion2 ? task2Answer2 : task2Answer3;
		const selectedStatus = questionPick[questionKey];

		return (
			<section className="pet-writing-answer-card" aria-label={`Part 2 Question ${isQuestion2 ? '2' : '3'} answer area`}>
				<div className="pet-writing-choice-bar">
					<div>
						<h3 className="pet-writing-answer-title">Part 2 response (Question {isQuestion2 ? '2' : '3'})</h3>
						<p className="pet-writing-answer-note">Choose the one Part 2 question you want counted before you submit.</p>
					</div>

					<label className="pet-writing-choice-control">
						<span>Count this question?</span>
						<select
							className="questionPickSelector"
							value={selectedStatus}
							onChange={(e) => handleQuestionPickChange(questionKey, e.target.value)}
						>
							<option value="YES">Yes</option>
							<option value="NO">No</option>
							<option value="UNDECIDED">Undecided</option>
						</select>
					</label>
				</div>

				<div className="pet-writing-choice-status-row">
					<span className={`pet-writing-choice-badge ${selectedStatus === 'YES' ? 'is-active' : ''}`}>
						{selectedStatus === 'YES'
							? 'This question will be counted'
							: selectedStatus === 'NO'
								? 'This question will not be counted'
								: 'No Part 2 choice confirmed yet'}
					</span>
					<span className="pet-writing-word-pill">Words: {countWords(activeAnswer)}</span>
				</div>

				<textarea
					aria-label={`Part 2 Question ${isQuestion2 ? '2' : '3'} response`}
					className="pet-writing-textarea"
					rows={18}
					spellCheck={false}
					value={activeAnswer}
					onChange={(e) =>
						isQuestion2 ? setTask2Answer2(e.target.value) : setTask2Answer3(e.target.value)
					}
				/>

				<p className="pet-writing-choice-hint">
					If time runs out, the system submits the question marked Yes. If neither question is marked, it submits the response in the tab you worked on last.
				</p>
			</section>
		);
	};

	return (
		<div className="pet-writing-page cambridge-test-container">
			<TestHeader
				title="PET Writing"
				classCode={testData?.classCode}
				teacherName={testData?.teacherName}
				timeRemaining={timeLeft}
				answeredCount={totalWords}
				totalQuestions={totalWordTarget}
				onSubmit={handleSubmit}
				submitted={submitted}
				examType="PET"
				timerWarning={timeLeft > 0 && timeLeft <= 300}
				timerCritical={timeLeft > 0 && timeLeft <= 60}
			/>

			<div className="pet-writing-main" ref={containerRef}>
				<section
					className="pet-writing-panel pet-writing-passage"
					style={{ width: isMobile ? '100%' : `${leftWidth}%` }}
				>
					<div className="pet-writing-left-content">
						{renderPrompt()}
					</div>
				</section>

				{isMobile && <div className="pet-writing-mobile-divider" aria-hidden="true"></div>}

				{!isMobile && (
					<div
						className="pet-writing-divider"
						onMouseDown={handleMouseDown}
						style={{ left: `${leftWidth}%` }}
					>
						<div className="pet-writing-divider-handle" aria-hidden="true"></div>
					</div>
				)}

				<section
					className="pet-writing-panel pet-writing-questions"
					style={{ width: isMobile ? '100%' : `${100 - leftWidth}%` }}
				>
					<div className="pet-writing-right-content">
						{renderAnswerArea()}
					</div>
				</section>
			</div>

			<footer className="footer__footer___1NlzQ pet-writing-footer">
				<nav className="nav-row perScorableItem" aria-label="Questions">
					<div
						className={`footer__questionWrapper___1tZ46 single ${
							activePanel === 'part1' ? 'selected' : ''
						}`}
						role="tablist"
					>
						<button
							role="tab"
							className="footer__questionNo___3WNct"
							tabIndex={activePanel === 'part1' ? 0 : -1}
							onClick={() => goToStep(0)}
						>
							<span>
								<span aria-hidden="true" className="section-prefix">Part </span>
								<span className="sectionNr" aria-hidden="true">1</span>
								<span className="attemptedCount" aria-hidden="true">
									{part1Answered ? 1 : 0} of 1
								</span>
							</span>
						</button>
					</div>

					<div
						className={`footer__questionWrapper___1tZ46 ${
							activePanel !== 'part1' ? 'selected' : ''
						} multiple`}
						role="tablist"
					>
						<button
							role="tab"
							className="footer__questionNo___3WNct"
							tabIndex={activePanel !== 'part1' ? 0 : -1}
							onClick={() => goToStep(1)}
						>
							<span>
								<span aria-hidden="true" className="section-prefix">Part </span>
								<span className="sectionNr" aria-hidden="true">2</span>
							</span>
						</button>
						<div className="footer__subquestionWrapper___9GgoP">
							{[2, 3].map((num) => (
								<button
									key={num}
									className={`subQuestion scorable-item ${
										activePanel === `q${num}` ? 'active' : ''
									}`}
									tabIndex={0}
									onClick={() => goToStep(num === 2 ? 1 : 2)}
								>
									<span aria-hidden="true">{num}</span>
								</button>
							))}
						</div>
					</div>

					<button
						id="deliver-button"
						aria-label="Submit your answers"
						className="footer__deliverButton___3FM07"
						onClick={handleSubmit}
						disabled={isSubmitting || submitted}
					>
						<i className="fa fa fa-check" aria-hidden="true"></i>
					</button>
				</nav>

				<div
					className="footer__navButtons___Gtvxu"
					role="navigation"
					aria-label="Previous / next question"
				>
					<button
						className="footer__previousBtn___3pfYh footer__arrowIconBtn___3AiJS"
						aria-label="Previous"
						onClick={() => goToStep(currentStepIndex - 1)}
						disabled={currentStepIndex === 0}
					>
						<i className="fa fa-arrow-left" aria-hidden="true"></i>
					</button>
					<button
						className="footer__promotedNextBtn___Qf9LU footer__arrowIconBtn___3AiJS"
						aria-label="Next"
						onClick={() => goToStep(currentStepIndex + 1)}
						disabled={currentStepIndex === steps.length - 1}
					>
						<i className="fa fa-arrow-right" aria-hidden="true"></i>
					</button>
				</div>
			</footer>

			{message && <div className="pet-writing-toast">{message}</div>}
		</div>
	);
};

export default PetWritingTestPage;