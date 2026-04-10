import React from "react";
import { Navigate } from "react-router-dom";

const SelectPetWritingTest = () => {
  return <Navigate to="/select-test?platform=orange&type=pet&tab=writing" replace />;
};

export default SelectPetWritingTest;
