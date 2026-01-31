// Question Editor Components - Dùng cho ADMIN tạo/sửa đề

// Core question types
export { default as FillBlankEditor } from './FillBlankEditor';
export { default as MultipleChoiceEditor } from './MultipleChoiceEditor';
export { default as MultiSelectEditor } from './MultiSelectEditor';
export { default as MatchingEditor } from './MatchingEditor';

// IELTS Listening specific
export { default as FormCompletionEditor } from './FormCompletionEditor';
export { default as NotesCompletionEditor } from './NotesCompletionEditor';
export { default as MapLabelingEditor } from './MapLabelingEditor';
export { default as FlowchartEditor } from './FlowchartEditor';

// Table / Notes specific for IELTS Part 1
export { default as TableCompletionEditor } from './TableCompletionEditor';

// Cambridge KET/PET specific
export { default as ClozeTestEditor } from './ClozeTestEditor';
export { default as SentenceTransformationEditor } from './SentenceTransformationEditor';
export { default as ShortMessageEditor } from './ShortMessageEditor';

// KET Part-specific editors
export { default as SignMessageEditor } from './SignMessageEditor'; // Part 1
export { default as PeopleMatchingEditor } from './PeopleMatchingEditor'; // Part 2
export { default as LongTextMCEditor } from './LongTextMCEditor'; // Part 3
export { default as ClozeMCEditor } from './ClozeMCEditor'; // Part 4
export { default as WordFormEditor } from './WordFormEditor'; // Part 6
export { default as MultipleChoicePicturesEditor } from './MultipleChoicePicturesEditor';
export { default as GapMatchEditor } from './GapMatchEditor';
export { default as SummaryCompletionEditor } from './SummaryCompletionEditor';
