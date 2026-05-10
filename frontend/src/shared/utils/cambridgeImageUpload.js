import { apiPath, hostPath } from '../utils/api';

const isInlineImageDataUrl = (value) => typeof value === 'string' && /^data:image\//i.test(value);

const inferExtension = (mimeType = '') => {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('svg')) return 'svg';
  return 'png';
};

const uploadCambridgeImageFile = async (file) => {
  if (!file) {
    throw new Error('Không có file ảnh để upload');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(apiPath('upload/cambridge-image'), {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || 'Lỗi khi upload hình ảnh');
  }

  if (!data?.url) {
    throw new Error('Upload thành công nhưng không nhận được URL hình ảnh');
  }

  return hostPath(data.url);
};

const uploadCambridgeImageDataUrl = async (dataUrl, fileNamePrefix = 'diagram') => {
  if (!isInlineImageDataUrl(dataUrl)) {
    return dataUrl;
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = inferExtension(blob.type);
  const file = new File([blob], `${fileNamePrefix}-${Date.now()}.${extension}`, {
    type: blob.type || `image/${extension}`,
  });

  return uploadCambridgeImageFile(file);
};

export {
  isInlineImageDataUrl,
  uploadCambridgeImageFile,
  uploadCambridgeImageDataUrl,
};