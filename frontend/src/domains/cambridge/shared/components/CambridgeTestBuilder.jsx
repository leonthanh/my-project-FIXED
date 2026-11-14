import React from "react";
import ExamCoreTestBuilder from "../../../exam-engine/shared/components/ExamCoreTestBuilder";
import { getOrangeSelectTestPathForTestType } from "../../config/navigation";

const CambridgeTestBuilder = (props) => (
  <ExamCoreTestBuilder
    {...props}
    successPathResolver={getOrangeSelectTestPathForTestType}
  />
);

export default CambridgeTestBuilder;
