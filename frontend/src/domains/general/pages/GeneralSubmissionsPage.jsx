import CambridgeSubmissionsPage from '../../../features/admin/pages/CambridgeSubmissionsPage';
import { useDisplaySettings } from '../../../shared/contexts/DisplaySettingsContext';

const GeneralSubmissionsPage = () => {
	const { displayLabels } = useDisplaySettings();
	const generalDisplayName = String(displayLabels?.generalDisplayName || 'General').trim() || 'General';

	return (
		<CambridgeSubmissionsPage
			platformFilter="general"
			platformLabel={generalDisplayName}
			platformLabelLower={generalDisplayName.toLowerCase()}
			submissionsApiBase="general/submissions"
			displayLabels={displayLabels}
		/>
	);
};

export default GeneralSubmissionsPage;
