import React from 'react';
import SummaryCompletionQuestion from '../../SummaryCompletionQuestion';

const SummaryCompletionEditor = ({ question, onChange, startingNumber, partIndex }) => {
  return <SummaryCompletionQuestion question={question} onChange={onChange} startingNumber={startingNumber} partIndex={partIndex} />;
};

export default SummaryCompletionEditor;
