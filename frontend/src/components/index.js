/**
 * ⚠️ DEPRECATED - Backward Compatibility Only
 * ============================================
 * 
 * CÁC FILES GỐC ĐÃ ĐƯỢC DI CHUYỂN SANG:
 * - shared/components/                    → Shared UI components
 * - features/listening/components/        → Listening-specific components
 * 
 * ⛔ KHÔNG THÊM CODE MỚI VÀO ĐÂY!
 * ✅ HÃY SỬA TẠI CÁC FILE TRONG shared/components/ hoặc features/
 * 
 * File này chỉ để backward compatibility với old imports.
 */

// Re-export from new shared/components location
export { default as AdminNavbar } from '../shared/components/AdminNavbar';
export { default as StudentNavbar } from '../shared/components/StudentNavbar';
export { default as Timer } from '../shared/components/Timer';
export { default as ConfirmModal } from '../shared/components/ConfirmModal';
export { default as ProtectedRoute } from '../shared/components/ProtectedRoute';
export { default as QuillEditor } from '../shared/components/QuillEditor';
export { default as CustomEditor } from '../shared/components/CustomEditor';
export { default as QuestionEditor } from '../shared/components/QuestionEditor';
export { default as QuestionSection } from '../shared/components/QuestionSection';
export { default as FormQuestion } from '../shared/components/FormQuestion';
export { default as PreviewSection } from '../shared/components/PreviewSection';
export { default as PartInstructions } from '../shared/components/PartInstructions';
export { default as MultipleChoiceQuestion } from '../shared/components/MultipleChoiceQuestion';
export { default as MultiSelectQuestion } from '../shared/components/MultiSelectQuestion';
export { default as FillBlankQuestion } from '../shared/components/FillBlankQuestion';
export { default as TrueFalseNotGivenQuestion } from '../shared/components/TrueFalseNotGivenQuestion';
export { default as YesNoNotGivenQuestion } from '../shared/components/YesNoNotGivenQuestion';
export { default as ShortAnswerQuestion } from '../shared/components/ShortAnswerQuestion';
export { default as ClozeTestQuestion } from '../shared/components/ClozeTestQuestion';
export { default as DragDropQuestion } from '../shared/components/DragDropQuestion';
export { default as ComboboxQuestion } from '../shared/components/ComboboxQuestion';
export { default as ParagraphMatchingQuestion } from '../shared/components/ParagraphMatchingQuestion';
export { default as ParagraphFillBlanksQuestion } from '../shared/components/ParagraphFillBlanksQuestion';
export { default as SentenceCompletionQuestion } from '../shared/components/SentenceCompletionQuestion';

// Listening-specific components
export { default as AudioPlayer } from '../features/listening/components/AudioPlayer';
export { default as ListeningPart } from '../features/listening/components/ListeningPart';
export { default as ListeningPlayer } from '../features/listening/components/ListeningPlayer';
