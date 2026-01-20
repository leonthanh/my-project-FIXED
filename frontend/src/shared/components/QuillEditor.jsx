import React, { useRef, useState, useEffect, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Quill from "quill";
import { apiPath, API_HOST } from "../utils/api";

// Register custom size class
const Size = Quill.import("formats/size");
Size.whitelist = ["small", "normal", "large", "huge"];
Quill.register(Size, true);

// Register align format
const Align = Quill.import("formats/align");
Align.whitelist = ["", "center", "right", "justify"];
Quill.register(Align, true);

const QuillEditor = ({
  value,
  onChange,
  placeholder,
  showBlankButton = false,
}) => {
  const quillRef = useRef(null);
  const [internalValue, setInternalValue] = useState(value || "");
  const [uploading, setUploading] = useState(false);

  // Helper: Clean up HTML by removing empty paragraphs and unnecessary tags
  const cleanupHTML = (html) => {
    if (html === null || html === undefined) return "";
    if (typeof html !== "string") return String(html || "");

    // Remove empty <p><br></p> tags
    let cleaned = html.replace(/<p><br><\/p>/g, "");

    // Remove multiple consecutive empty paragraphs
    cleaned = cleaned.replace(/<p><\/p>/g, "");

    // Remove excessive whitespace-only paragraphs
    cleaned = cleaned.replace(/<p>\s*<\/p>/g, "");

    // Replace multiple <br> with single <br>
    cleaned = cleaned.replace(/<br>\s*<br>/g, "<br>");

    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
  };

  // Custom image handler - upload to server instead of base64
  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File quá lớn. Giới hạn tối đa 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Chỉ cho phép upload file hình ảnh");
        return;
      }

      try {
        setUploading(true);

        // Upload to server
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(apiPath("upload/image"), {
          method: "POST",
          body: formData,
        });

        // If server responded with non-2xx, extract JSON or text for clearer error message
        if (!response.ok) {
          const contentType = response.headers.get("content-type") || "";
          let errMsg = `HTTP ${response.status}`;

          try {
            if (contentType.includes("application/json")) {
              const errData = await response.json();
              errMsg = errData.message || errMsg;
            } else {
              const text = await response.text();
              errMsg = text && text.trim() ? text.slice(0, 300) : errMsg;
            }
          } catch (parseErr) {
            console.warn("Error parsing error response", parseErr);
          }

          throw new Error(errMsg || "Upload failed");
        }

        // Parse JSON on success; if not JSON, throw helpful message
        let data = null;
        try {
          data = await response.json();
        } catch (parseErr) {
          const text = await response.text();
          throw new Error(
            text
              ? text.slice(0, 300)
              : "Upload succeeded but returned unexpected response"
          );
        }

        // Insert image into editor with full URL (build safely to preserve protocol)
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const range = editor.getSelection(true);

          // Build a safe absolute URL. Use configured host if provided, otherwise fall back to current origin.
          const base = API_HOST || window.location.origin;
          let imageUrl;
          try {
            imageUrl = new URL(data.url, base).toString();
          } catch (err) {
            // Fallback string concatenation if URL constructor fails
            const cleanedBase = base.replace(/\/$/, "");
            const cleanedPath = (data.url || "").replace(/^\//, "");
            imageUrl = `${cleanedBase}/${cleanedPath}`;
          }

          editor.insertEmbed(range.index, "image", imageUrl);
          editor.setSelection(range.index + 1);
        }
      } catch (error) {
        console.error("Upload error:", error);
        alert(`Lỗi upload: ${error.message || "Không thể upload hình ảnh"}`);
      } finally {
        setUploading(false);
      }
    };
  };

  // Update internal value when prop changes
  useEffect(() => {
    const cleanedValue = cleanupHTML(value || "");
    setInternalValue(cleanedValue);

    // Force update Quill content if editor exists
    if (quillRef.current && quillRef.current.getEditor) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        const currentContent = editor.root.innerHTML;
        if (currentContent !== cleanedValue) {
          editor.root.innerHTML = cleanedValue || "";
        }
      }
    }
  }, [value]);

  const handleInsertBlank = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const cursorPosition = editor.getSelection()?.index || editor.getLength();
      editor.insertText(cursorPosition, "…………");
      editor.setSelection(cursorPosition + "…………".length);
    }
  };

  // Modules with custom image handler - use useMemo to prevent re-creation
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ font: [] }, { size: ["small", false, "large", "huge"] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "font",
    "size",
    "list",
    "bullet",
    "align",
    "direction",
    "link",
    "image",
  ];

  return (
    <div style={{ position: "relative", zIndex: 10 }}>
      <style>{`
        /* Fix Quill Heading spacing - remove excessive top padding */
        .ql-editor h1, .ql-editor h2, .ql-editor h3 {
          margin: 0 !important;
          padding: 0 !important;
          margin-top: 0 !important;
          margin-bottom: 0.5em !important;
        }
        .ql-editor h1 {
          font-size: 2em !important;
        }
        .ql-editor h2 {
          font-size: 1.5em !important;
        }
        .ql-editor h3 {
          font-size: 1.17em !important;
        }
        
        /* Fix paragraph spacing */
        .ql-editor p {
          margin: 0 0 0.5em 0 !important;
          padding: 0 !important;
        }
        
        /* Preserve line breaks */
        .ql-editor br {
          margin: 0 !important;
        }
        
        /* Fix list spacing */
        .ql-editor ul, .ql-editor ol {
          margin: 0.5em 0 !important;
          padding-left: 1.5em !important;
        }
        
        /* Size formats - for span tags
           Allow Quill to apply inline font-size styles (do not force inherit) */
        /* Previously we forced font-size to inherit which prevented the toolbar size from working. */
        /* Keeping this comment for future reference. */
        
        /* Size class formats */
        .ql-editor .ql-size-small {
          font-size: 0.75em !important;
        }
        .ql-editor .ql-size-large {
          font-size: 1.5em !important;
        }
        .ql-editor .ql-size-huge {
          font-size: 2.5em !important;
        }
        
        /* Align - support both class and style (inside editor) */
        .ql-editor .ql-align-center {
          text-align: center !important;
        }
        .ql-editor .ql-align-right {
          text-align: right !important;
        }
        .ql-editor .ql-align-justify {
          text-align: justify !important;
        }

        /* Global alignment helpers - apply even outside .ql-editor (e.g., preview modal, saved HTML) */
        .ql-align-center,
        p.ql-align-center,
        div.ql-align-center,
        span.ql-align-center,
        .ql-align-right,
        p.ql-align-right,
        div.ql-align-right,
        span.ql-align-right,
        .ql-align-justify,
        p.ql-align-justify,
        div.ql-align-justify,
        span.ql-align-justify,
        p[style*="text-align:center"],
        div[style*="text-align:center"],
        p[style*="text-align:right"],
        div[style*="text-align:right"],
        p[style*="text-align:justify"],
        div[style*="text-align:justify"] {
          /* center/right/justify handled by individual selectors above */
        }

        /* Specifically set text-align for each class to ensure preview renders correctly */
        .ql-align-center, p.ql-align-center, div.ql-align-center, span.ql-align-center, p[style*="text-align:center"], div[style*="text-align:center"] {
          text-align: center !important;
        }
        .ql-align-right, p.ql-align-right, div.ql-align-right, span.ql-align-right, p[style*="text-align:right"], div[style*="text-align:right"] {
          text-align: right !important;
        }
        .ql-align-justify, p.ql-align-justify, div.ql-align-justify, span.ql-align-justify, p[style*="text-align:justify"], div[style*="text-align:justify"] {
          text-align: justify !important;
        }
        
        /* Images in editor */
        .ql-editor img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 4px;
          margin: 8px 0;
          /* Default inline so text wraps if not centered */
          display: inline-block;
        }
        /* Center alignment helpers: handle images wrapped in different alignment wrappers or with inline styles */
        .ql-editor .ql-align-center img,
        .ql-editor p.ql-align-center img,
        .ql-editor div.ql-align-center img,
        .ql-editor figure.ql-align-center img,
        .ql-editor p[style*="text-align:center"] img,
        .ql-editor div[style*="text-align:center"] img,
        .ql-editor img[style*="display:block"],
        .ql-editor img[style*="margin:auto"],
        .ql-editor img[style*="margin:0 auto"],
        .ql-editor img.ql-align-center {
          display: inline-block !important;
          margin-left: auto !important;
          margin-right: auto !important;
          float: none !important;
        }

        /* Ensure block wrappers with ql-align-center center their inline children (text and images) */
        .ql-editor .ql-align-center,
        .ql-editor p.ql-align-center,
        .ql-editor div.ql-align-center,
        .ql-editor figure.ql-align-center,
        .ql-editor p[style*="text-align:center"],
        .ql-editor div[style*="text-align:center"] {
          text-align: center !important;
        }

        /* Images that were floated by other styles should be reset so centering can work */
        .ql-editor img[style*="float:left"],
        .ql-editor img[style*="float:right"] {
          float: none !important;
          display: inline-block !important;
        }

        /* If an image has width:100% inline, make it behave as block but ensure centering (it already fills container) */
        .ql-editor img[style*="width:100%"] {
          display: block !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        
        /* Upload indicator */
        .quill-uploading {
          position: relative;
        }
        .quill-uploading::after {
          content: '⏳ Đang upload...';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 100;
        }
      `}</style>

      {/* Upload indicator */}
      {uploading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255,255,255,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            borderRadius: "4px",
          }}
        >
          <span
            style={{
              backgroundColor: "#0e276f",
              color: "white",
              padding: "10px 20px",
              borderRadius: "4px",
              fontWeight: "bold",
            }}
          >
            ⏳ Đang upload hình ảnh...
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        {showBlankButton && (
          <button
            type="button"
            onClick={handleInsertBlank}
            style={{
              padding: "8px 16px",
              backgroundColor: "#0e276f",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              zIndex: 11,
            }}
          >
            ➕ Thêm chỗ trống
          </button>
        )}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
        }}
      >
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={internalValue}
          onChange={(val) => {
            try {
              const cleanedVal = cleanupHTML(val);
              setInternalValue(cleanedVal);
              if (typeof onChange === "function") {
                onChange(cleanedVal);
              }
            } catch (err) {
              console.error("Quill onChange error:", err);
            }
          }}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{
            minHeight: "200px",
            marginBottom: "20px",
          }}
        />
      </div>
    </div>
  );
};

export default QuillEditor;
