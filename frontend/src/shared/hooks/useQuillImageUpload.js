import { useCallback, useMemo, useRef } from "react";
import { apiPath, hostPath } from "../utils/api";

const DEFAULT_TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["link", "image"],
  ["clean"],
];

const useQuillImageUpload = ({ toolbar } = {}) => {
  const quillRef = useRef(null);

  const insertImageAtCursor = useCallback((imageUrl) => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;
    const range = editor.getSelection(true);
    const index = range ? range.index : editor.getLength();
    editor.insertEmbed(index, "image", imageUrl, "user");
    editor.setSelection(index + 1);
  }, []);

  const uploadImage = useCallback(async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(apiPath("upload/cambridge-image"), {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      let errMsg = "Lỗi khi upload hình ảnh";
      try {
        const err = await res.json();
        errMsg = err?.message || errMsg;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (!data?.url) throw new Error("Upload thành công nhưng không nhận được URL hình ảnh");
    return hostPath(data.url);
  }, []);

  const handleImageInsert = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const imageUrl = await uploadImage(file);
        insertImageAtCursor(imageUrl);
      } catch (err) {
        console.error("Upload image error:", err);
        alert(err?.message || "Lỗi khi upload hình ảnh");
      }
    };
    input.click();
  }, [insertImageAtCursor, uploadImage]);

  const modules = useMemo(() => ({
    toolbar: {
      container: toolbar || DEFAULT_TOOLBAR,
      handlers: {
        image: handleImageInsert,
      },
    },
  }), [handleImageInsert, toolbar]);

  return { quillRef, modules };
};

export default useQuillImageUpload;
export { DEFAULT_TOOLBAR };
