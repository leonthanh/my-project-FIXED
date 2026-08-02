import CambridgeSubmissionsPage from '../../../features/admin/pages/CambridgeSubmissionsPage';
import { useDisplaySettings } from '../../../shared/contexts/DisplaySettingsContext';

const FceSubmissionsPage = () => {
	const { displayLabels } = useDisplaySettings();
	const fceDisplayName = String(displayLabels?.fceDisplayName || 'FCE').trim() || 'FCE';

	return (
		<CambridgeSubmissionsPage
			platformFilter="fce"
			platformLabel={fceDisplayName}
			platformLabelLower={fceDisplayName.toLowerCase()}
			displayLabels={displayLabels}
		/>
	);
};

export default FceSubmissionsPage;
