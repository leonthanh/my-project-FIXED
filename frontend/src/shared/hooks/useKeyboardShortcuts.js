import { useEffect, useCallback } from "react";

/**
 * useKeyboardShortcuts - Hook xử lý keyboard shortcuts
 *
 * @param {Object} handlers - Object chứa các handler cho shortcuts
 * @param {Function} handlers.onSave - Ctrl+S handler
 * @param {Function} handlers.onAddQuestion - Ctrl+N handler
 * @param {Function} handlers.onPreview - Ctrl+P handler
 * @param {Function} handlers.onToggleTheme - Ctrl+D handler
 * @param {boolean} enabled - Bật/tắt shortcuts
 */

const useKeyboardShortcuts = (handlers = {}, enabled = true) => {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      // Ignore if typing in input/textarea
      const target = e.target;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;

      // Ctrl+S - Save
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (handlers.onSave) {
          handlers.onSave();
        }
        return;
      }

      // Ctrl+N - Add new question (only when not in input)
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        if (handlers.onAddQuestion) {
          handlers.onAddQuestion();
        }
        return;
      }

      // Ctrl+P - Preview
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        if (handlers.onPreview) {
          handlers.onPreview();
        }
        return;
      }

      // Ctrl+D - Toggle dark mode
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        if (handlers.onToggleTheme) {
          handlers.onToggleTheme();
        }
        return;
      }

      // Ctrl+B - Toggle sidebar (future feature)
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        if (handlers.onToggleSidebar) {
          handlers.onToggleSidebar();
        }
        return;
      }

      // Escape - Close modal
      if (e.key === "Escape") {
        if (handlers.onCloseModal) {
          handlers.onCloseModal();
        }
        return;
      }
    },
    [handlers, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Return info about available shortcuts
  return {
    shortcuts: [
      { key: "Ctrl+S", action: "Lưu / Review", enabled: !!handlers.onSave },
      {
        key: "Ctrl+N",
        action: "Thêm câu hỏi mới",
        enabled: !!handlers.onAddQuestion,
      },
      {
        key: "Ctrl+P",
        action: "Xem trước (Preview)",
        enabled: !!handlers.onPreview,
      },
      {
        key: "Ctrl+D",
        action: "Dark/Light mode",
        enabled: !!handlers.onToggleTheme,
      },
      { key: "Esc", action: "Đóng modal", enabled: !!handlers.onCloseModal },
    ],
  };
};

export default useKeyboardShortcuts;
