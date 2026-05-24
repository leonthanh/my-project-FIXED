const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', () => reject(new Error('Không thể tải ảnh để crop.')));
  image.src = src;
});

const getOutputType = (file) => {
  const type = String(file?.type || '').trim().toLowerCase();
  if (type === 'image/png' || type === 'image/webp' || type === 'image/jpeg' || type === 'image/jpg') {
    return type === 'image/jpg' ? 'image/jpeg' : type;
  }

  return 'image/jpeg';
};

const buildOutputName = (file, outputType) => {
  const baseName = String(file?.name || 'avatar').replace(/\.[^.]+$/, '') || 'avatar';
  const extension = outputType.split('/')[1] || 'jpg';
  return `${baseName}.${extension}`;
};

export const createCroppedAvatarFile = async (imageSrc, croppedAreaPixels, sourceFile) => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Trình duyệt hiện tại không hỗ trợ crop avatar.');
  }

  const width = Math.max(1, Math.round(croppedAreaPixels?.width || 0));
  const height = Math.max(1, Math.round(croppedAreaPixels?.height || 0));

  canvas.width = width;
  canvas.height = height;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    Math.round(croppedAreaPixels?.x || 0),
    Math.round(croppedAreaPixels?.y || 0),
    width,
    height,
    0,
    0,
    width,
    height
  );

  const outputType = getOutputType(sourceFile);
  const outputName = buildOutputName(sourceFile, outputType);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Không thể tạo avatar sau khi crop.'));
          return;
        }

        resolve(new File([blob], outputName, { type: outputType }));
      },
      outputType,
      0.92
    );
  });
};