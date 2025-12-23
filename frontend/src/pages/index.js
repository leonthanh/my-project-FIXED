/**
 * ⚠️ DEPRECATED - Backward Compatibility Only
 * ============================================
 * 
 * CÁC FILES GỐC ĐÃ ĐƯỢC DI CHUYỂN SANG:
 * - features/reading/pages/    → Reading test pages
 * - features/listening/pages/  → Listening test pages  
 * - features/writing/pages/    → Writing test pages
 * - features/auth/pages/       → Login page
 * - features/admin/pages/      → Admin pages
 * 
 * ⛔ KHÔNG THÊM CODE MỚI VÀO ĐÂY!
 * ✅ HÃY SỬA TẠI CÁC FILE TRONG features/
 * 
 * File này chỉ để backward compatibility với old imports.
 */

// Re-export from new feature locations
export { default as CreateReadingTest } from '../features/reading/pages/CreateReadingTest';
export { default as EditReadingTest } from '../features/reading/pages/EditReadingTest';
export { default as TakeReadingTest } from '../features/reading/pages/TakeReadingTest';
export { default as DoReadingTest } from '../features/reading/pages/DoReadingTest';
export { default as CreateListeningTest } from '../features/listening/pages/CreateListeningTest';
export { default as TakeListeningTest } from '../features/listening/pages/TakeListeningTest';
export { default as DoListeningTest } from '../features/listening/pages/DoListeningTest';
export { default as WritingTest } from '../features/writing/pages/WritingTest';
export { default as CreateWritingTest } from '../features/writing/pages/CreateWritingTest';
export { default as SelectWritingTest } from '../features/writing/pages/SelectWritingTest';
export { default as Login } from '../features/auth/pages/Login';
export { default as AdminSubmissions } from '../features/admin/pages/AdminSubmissions';
export { default as Review } from '../features/admin/pages/Review';
export { default as ReviewSubmission } from '../features/admin/pages/ReviewSubmission';
export { default as EditTest } from '../features/admin/pages/EditTest';
export { default as SelectTest } from '../features/admin/pages/SelectTest';
export { default as MyFeedback } from '../features/admin/pages/MyFeedback';
