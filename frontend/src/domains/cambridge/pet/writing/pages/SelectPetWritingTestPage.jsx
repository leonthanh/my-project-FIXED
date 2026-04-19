import React from 'react';
import { Navigate } from 'react-router-dom';
import { getOrangeSelectTestPathForTestType } from '../../../config/navigation';

const SelectPetWritingTestPage = () => {
	return <Navigate to={getOrangeSelectTestPathForTestType('pet-writing')} replace />;
};

export default SelectPetWritingTestPage;