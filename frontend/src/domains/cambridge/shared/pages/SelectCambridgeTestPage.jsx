import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import StudentNavbar from '../../../../shared/components/StudentNavbar';
import AdminNavbar from '../../../../shared/components/AdminNavbar';
import LineIcon from '../../../../shared/components/LineIcon';
import { apiPath } from '../../../../shared/utils/api';
import { canManageCategory } from '../../../../shared/utils/permissions';
import {
	DEFAULT_ORANGE_SKILL,
	DEFAULT_ORANGE_TYPE,
	getOrangeAllowedSkills,
	getOrangeLevelMeta,
	ORANGE_LEVELS,
} from '../../config/levels';
import {
	buildOrangeSelectTestPath,
	getOrangeCreatePath,
	getOrangeEditPath,
	getOrangeReadingApiTestType,
	getOrangeStudentPath,
	getOrangeTestConfig,
} from '../../config/navigation';
import './SelectCambridgeTest.css';

const SelectOrangeIcon = ({ name, size = 18, className }) => (
	<span className={["cambridge-inlineIcon", className].filter(Boolean).join(" ")} aria-hidden="true">
		<LineIcon name={name} size={size} />
	</span>
);

const SelectCambridgeTestPage = () => {
	const location = useLocation();
	let user = null;
	try {
		user = JSON.parse(localStorage.getItem('user') || 'null');
	} catch {
		localStorage.removeItem('user');
		user = null;
	}
	const isTeacher = user && (user.role === 'teacher' || user.role === 'admin');
	const navigate = useNavigate();

	const [tests, setTests] = useState({
		listening: [],
		reading: [],
		writing: [],
	});
	const [activeTab, setActiveTab] = useState(DEFAULT_ORANGE_SKILL);
	const [activeTestType, setActiveTestType] = useState(DEFAULT_ORANGE_TYPE);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const testTypes = ORANGE_LEVELS;

	const orangeHubRedirectPath = useMemo(() => {
		const params = new URLSearchParams(location.search);
		return buildOrangeSelectTestPath({
			type: params.get('type'),
			tab: params.get('tab'),
		});
	}, [location.search]);
	const shouldRedirectToUnifiedOrangeHub = location.pathname === '/cambridge';

	useEffect(() => {
		if (shouldRedirectToUnifiedOrangeHub) return undefined;

		const fetchTests = async () => {
			try {
				setLoading(true);
				setError(null);

				const readingTestType = getOrangeReadingApiTestType(activeTestType);

				const listeningParams = new URLSearchParams({ testType: `${activeTestType}-listening` });
				const readingParams = new URLSearchParams({ testType: readingTestType });
				if (isTeacher) {
					listeningParams.set('visibility', 'all');
					readingParams.set('visibility', 'all');
				}

				const petWritingParams = new URLSearchParams({ testType: 'pet-writing' });
				if (isTeacher) {
					petWritingParams.set('includeArchived', '1');
				}

				const requests = [
					fetch(apiPath(`cambridge/listening-tests?${listeningParams.toString()}`)),
					fetch(apiPath(`cambridge/reading-tests?${readingParams.toString()}`)),
				];

				if (activeTestType === 'pet') {
					requests.push(fetch(apiPath(`writing-tests?${petWritingParams.toString()}`)));
				}

				const responses = await Promise.all(requests);
				const listeningRes = responses[0];
				const readingRes = responses[1];
				const writingRes = responses[2];

				if (!listeningRes.ok || !readingRes.ok) {
					throw new Error('Không thể tải danh sách đề');
				}

				const listeningData = await listeningRes.json();
				const readingData = await readingRes.json();
				const writingData = writingRes ? await writingRes.json() : [];

				setTests({
					listening: Array.isArray(listeningData) ? listeningData : [],
					reading: Array.isArray(readingData) ? readingData : [],
					writing: Array.isArray(writingData) ? writingData : [],
				});
			} catch (err) {
				console.error('Lỗi khi tải đề Orange:', err);
				setError(err.message);
				setTests({ listening: [], reading: [], writing: [] });
			} finally {
				setLoading(false);
			}
		};

		fetchTests();
	}, [activeTestType, isTeacher, shouldRedirectToUnifiedOrangeHub]);

	useEffect(() => {
		const allowedTabs = getOrangeAllowedSkills(activeTestType);

		if (!allowedTabs.includes(activeTab)) {
			setActiveTab(allowedTabs[0] || DEFAULT_ORANGE_SKILL);
		}
	}, [activeTestType, activeTab]);

	const handleSelectListening = (testId) => {
		navigate(getOrangeStudentPath(activeTestType, 'listening', testId));
	};

	const handleSelectReading = (testId) => {
		navigate(getOrangeStudentPath(activeTestType, 'reading', testId));
	};

	const handleSelectWriting = (testId) => {
		const numericId = parseInt(testId, 10);
		if (!numericId || isNaN(numericId)) return;
		localStorage.setItem('selectedPetWritingTestId', numericId);
		localStorage.removeItem('selectedTestId');
		navigate('/pet-writing');
	};

	const handleEdit = (testId, testType) => {
		if (testType === 'listening') {
			navigate(getOrangeEditPath(activeTestType, 'listening', testId));
		} else if (testType === 'reading') {
			navigate(getOrangeEditPath(activeTestType, 'reading', testId));
		} else if (testType === 'writing') {
			navigate(`/admin/edit-pet-writing/${testId}`);
		}
	};

	const getTestConfig = (type) => {
		return getOrangeTestConfig(activeTestType, type);
	};

	const renderTestList = (testList, testType) => {
		if (loading) {
			return (
				<div className="cambridge-state cambridge-loading">
					<SelectOrangeIcon name="loading" size={32} className="cambridge-state__icon" />
					Đang tải danh sách đề...
				</div>
			);
		}

		if (error) {
			return (
				<div className="cambridge-state cambridge-error">
					<SelectOrangeIcon name="error" size={32} className="cambridge-state__icon" />
					{error}
				</div>
			);
		}

		if (testList.length === 0) {
			return (
				<div className="cambridge-state cambridge-empty">
					<SelectOrangeIcon name="empty" size={44} className="cambridge-state__icon cambridge-state__icon--large" />
					<p>
						Chưa có đề {testType === 'listening' ? 'Listening' : testType === 'reading' ? 'Reading' : 'Writing'} cho {activeTestType.toUpperCase()}
					</p>
					{canManageCategory(user, testType) && (
						<button
							onClick={() => navigate(getOrangeCreatePath(activeTestType, testType))}
							className="cambridge-btn cambridge-btn--success"
						>
							<SelectOrangeIcon name="create" />
							<span>Tạo đề mới</span>
						</button>
					)}
				</div>
			);
		}

		const config = getTestConfig(testType);

		return (
			<div className="cambridge-test-list">
				{testList.map((test, index) => (
					<div key={test.id} className="cambridge-test-item">
						<div className="cambridge-test-row">
							<button
								onClick={() => {
									if (testType === 'listening') handleSelectListening(test.id);
									else if (testType === 'reading') handleSelectReading(test.id);
									else handleSelectWriting(test.id);
								}}
								className="cambridge-test-main"
							>
								<div className="cambridge-test-main__content">
									<SelectOrangeIcon
										name={testType === 'listening' ? 'listening' : testType === 'reading' ? 'reading' : 'writing'}
										size={22}
										className="cambridge-test-main__icon"
									/>
									<div>
										<h3 className="cambridge-test-main__title">
											{test.title || `${activeTestType.toUpperCase()} ${testType.charAt(0).toUpperCase() + testType.slice(1)} ${index + 1}`}
										</h3>
										<div className="cambridge-test-main__meta">
											<span className="cambridge-test-main__metaItem">
												<SelectOrangeIcon name="class" size={16} />
												<span>{test.classCode || 'N/A'}</span>
											</span>
											<span className="cambridge-test-main__metaItem">
												<SelectOrangeIcon name="teacher" size={16} />
												<span>{test.teacherName || 'N/A'}</span>
											</span>
											<span className="cambridge-test-main__metaItem">
												<SelectOrangeIcon name="questions" size={16} />
												<span>{config.totalQuestions || test.totalQuestions || '?'} câu</span>
											</span>
											<span className="cambridge-test-main__metaItem">
												<SelectOrangeIcon name="clock" size={16} />
												<span>{config.duration || 30} phút</span>
											</span>
										</div>
									</div>
								</div>
							</button>
							{canManageCategory(user, testType) && (
								<button
									onClick={() => handleEdit(test.id, testType)}
									className="cambridge-btn cambridge-btn--warning"
								>
									<SelectOrangeIcon name="edit" />
									<span>Sửa</span>
								</button>
							)}
						</div>
					</div>
				))}
			</div>
		);
	};

	if (shouldRedirectToUnifiedOrangeHub) {
		return <Navigate to={orangeHubRedirectPath} replace />;
	}

	const activeTestMeta = getOrangeLevelMeta(activeTestType);

	return (
		<>
			{isTeacher ? <AdminNavbar /> : <StudentNavbar />}
			<div className="cambridge-page">
				<div className="cambridge-card">
					<div className="cambridge-type-list">
						{testTypes.map((type) => (
							<button
								key={type.id}
								onClick={() => setActiveTestType(type.id)}
								className={`cambridge-type-btn${activeTestType === type.id ? ' cambridge-type-btn--active' : ''}`}
							>
								<span className="cambridge-tabLabel">
									<SelectOrangeIcon name={type.iconName} />
									<span>{type.name}</span>
								</span>
							</button>
						))}
					</div>

					<div className="cambridge-tabs">
						{getOrangeAllowedSkills(activeTestType).map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`cambridge-tab${activeTab === tab ? ' cambridge-tab--active' : ''}`}
							>
								<span className="cambridge-tabLabel">
									<SelectOrangeIcon
										name={tab === 'listening' ? 'listening' : tab === 'reading' ? 'reading' : 'writing'}
									/>
									<span>
										{tab === 'listening'
											? 'Listening'
											: tab === 'reading'
												? 'Reading'
												: 'Writing'}
									</span>
								</span>
								<span className="cambridge-tab__badge">{tests[tab].length}</span>
							</button>
						))}
					</div>

					<div className="cambridge-info">
						<SelectOrangeIcon
							name={activeTestMeta.iconName}
							size={28}
							className="cambridge-info__icon"
						/>
						<div>
							<h3 className="cambridge-info__title">
								{activeTestMeta.name} - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
							</h3>
							<p className="cambridge-info__meta">
								{getTestConfig(activeTab).totalQuestions || '?'} câu hỏi • {getTestConfig(activeTab).parts || '?'} parts • {getTestConfig(activeTab).duration || '?'} phút
							</p>
						</div>
					</div>

					{renderTestList(tests[activeTab], activeTab)}

					{canManageCategory(user, activeTab) && tests[activeTab].length > 0 && (
						<div className="cambridge-actions">
							<button
								onClick={() => navigate(getOrangeCreatePath(activeTestType, activeTab))}
								className="cambridge-btn cambridge-btn--success"
							>
								<SelectOrangeIcon name="create" />
								<span>Tạo đề {activeTestMeta.shortLabel} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} mới</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default SelectCambridgeTestPage;