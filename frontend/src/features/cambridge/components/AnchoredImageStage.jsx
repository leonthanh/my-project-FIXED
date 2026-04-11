import React, { useCallback, useEffect, useState } from 'react';

export default function AnchoredImageStage({
  src,
  alt,
  imageRef,
  maxWidth = '100%',
  cursor = 'default',
  onClick,
  onReadyChange,
  borderColor = '#e2e8f0',
  borderWidth = '2px',
  borderRadius = '10px',
  containerStyle,
  imageStyle,
  children,
}) {
  const [imageNode, setImageNode] = useState(null);
  const [imageReady, setImageReady] = useState(false);

  const assignImageRef = useCallback((node) => {
    setImageNode(node);
    if (typeof imageRef === 'function') {
      imageRef(node);
      return;
    }
    if (imageRef && typeof imageRef === 'object') {
      imageRef.current = node;
    }
  }, [imageRef]);

  useEffect(() => {
    setImageReady(false);
  }, [src]);

  useEffect(() => {
    if (imageNode?.complete && imageNode.naturalWidth > 0 && imageNode.naturalHeight > 0) {
      setImageReady(true);
    }
  }, [imageNode, src]);

  useEffect(() => {
    onReadyChange?.(imageReady);
  }, [imageReady, onReadyChange]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        maxWidth,
        margin: '0 auto',
        cursor,
        ...containerStyle,
      }}
      onClick={onClick}
    >
      <img
        ref={assignImageRef}
        src={src}
        alt={alt}
        draggable={false}
        onLoad={() => setImageReady(true)}
        onError={() => setImageReady(false)}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          boxSizing: 'border-box',
          borderRadius,
          border: `${borderWidth} solid ${borderColor}`,
          userSelect: 'none',
          ...imageStyle,
        }}
      />
      {typeof children === 'function' ? children({ imageReady }) : children}
    </div>
  );
}