import React from 'react';

/**
 * HTML Helper Functions for Reading Test
 * Các hàm xử lý HTML từ Quill Editor
 */

const styleNameCache = new Map();

const toReactStyleName = (name) => {
  if (styleNameCache.has(name)) {
    return styleNameCache.get(name);
  }

  const reactName = name.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  styleNameCache.set(name, reactName);
  return reactName;
};

const parseStyleAttribute = (styleText = '') => {
  return String(styleText || '')
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .reduce((styleObject, rule) => {
      const separatorIndex = rule.indexOf(':');
      if (separatorIndex === -1) {
        return styleObject;
      }

      const propertyName = rule.slice(0, separatorIndex).trim();
      const propertyValue = rule.slice(separatorIndex + 1).trim();

      if (!propertyName || !propertyValue) {
        return styleObject;
      }

      styleObject[toReactStyleName(propertyName)] = propertyValue;
      return styleObject;
    }, {});
};

const toReactProps = (element, key) => {
  const props = { key };

  Array.from(element.attributes || []).forEach((attribute) => {
    const attrName = attribute.name;
    const attrValue = attribute.value;

    if (attrName === 'class') {
      props.className = attrValue;
      return;
    }

    if (attrName === 'style') {
      const parsedStyle = parseStyleAttribute(attrValue);
      if (Object.keys(parsedStyle).length > 0) {
        props.style = parsedStyle;
      }
      return;
    }

    if (attrName === 'for') {
      props.htmlFor = attrValue;
      return;
    }

    if (attrName === 'tabindex') {
      props.tabIndex = Number(attrValue);
      return;
    }

    if (attrName === 'readonly') {
      props.readOnly = attrValue === '' ? true : attrValue;
      return;
    }

    if (attrName === 'colspan') {
      props.colSpan = Number(attrValue);
      return;
    }

    if (attrName === 'rowspan') {
      props.rowSpan = Number(attrValue);
      return;
    }

    props[attrName] = attrValue === '' ? true : attrValue;
  });

  return props;
};

const appendRenderedNode = (bucket, renderedNode) => {
  if (renderedNode === null || renderedNode === undefined || renderedNode === false) {
    return;
  }

  if (Array.isArray(renderedNode)) {
    renderedNode.forEach((child) => appendRenderedNode(bucket, child));
    return;
  }

  bucket.push(renderedNode);
};

const blankPlaceholderPattern = /\[BLANK\]/i;

export const sentenceCompletionPlaceholderPattern = /(?:\[BLANK\]|_{3,}|\.{3,}|…+)/i;

const createPlaceholderRegex = (placeholderPattern = blankPlaceholderPattern) => {
  if (placeholderPattern instanceof RegExp) {
    const flags = placeholderPattern.flags.includes('g')
      ? placeholderPattern.flags
      : `${placeholderPattern.flags}g`;
    return new RegExp(placeholderPattern.source, flags);
  }

  return new RegExp(String(placeholderPattern || '\\[BLANK\\]'), 'gi');
};

const splitTextByPlaceholderPattern = (
  text,
  placeholderPattern = blankPlaceholderPattern
) => String(text || '').split(createPlaceholderRegex(placeholderPattern));

const renderNodeWithPlaceholderPattern = (
  node,
  path,
  renderPlaceholder,
  state,
  placeholderPattern
) => {
  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return null;

    const parts = splitTextByPlaceholderPattern(text, placeholderPattern);
    if (parts.length === 1) {
      return text;
    }

    const children = [];
    parts.forEach((part, index) => {
      if (part) {
        children.push(part);
      }

      if (index < parts.length - 1) {
        const blankIndex = state.blankIndex;
        state.blankIndex += 1;
        children.push(
          renderPlaceholder(blankIndex, `${state.keyPrefix}-blank-${blankIndex}`)
        );
      }
    });

    return children;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tagName = node.tagName.toLowerCase();
  const props = toReactProps(node, `${state.keyPrefix}-${path.join('-')}`);
  const children = [];

  Array.from(node.childNodes || []).forEach((childNode, childIndex) => {
    appendRenderedNode(
      children,
      renderNodeWithPlaceholderPattern(
        childNode,
        [...path, childIndex],
        renderPlaceholder,
        state,
        placeholderPattern
      )
    );
  });

  return React.createElement(tagName, props, ...children);
};

export const hasPlaceholderPattern = (
  html,
  placeholderPattern = blankPlaceholderPattern
) => {
  if (!html) return false;
  return createPlaceholderRegex(placeholderPattern).test(String(html));
};

export const renderHtmlWithPlaceholderPattern = (
  html,
  renderPlaceholder,
  placeholderPattern = blankPlaceholderPattern,
  keyPrefix = 'reading-html'
) => {
  if (!html || typeof renderPlaceholder !== 'function') return null;

  if (typeof document === 'undefined') {
    const fallbackState = { blankIndex: 0, keyPrefix };
    const children = [];
    splitTextByPlaceholderPattern(String(html), placeholderPattern)
      .forEach((part, index, array) => {
        if (part) {
          children.push(part);
        }

        if (index < array.length - 1) {
          const blankIndex = fallbackState.blankIndex;
          fallbackState.blankIndex += 1;
          children.push(
            renderPlaceholder(blankIndex, `${keyPrefix}-blank-${blankIndex}`)
          );
        }
      });
    return children;
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  const state = { blankIndex: 0, keyPrefix };
  const renderedNodes = [];

  Array.from(template.content.childNodes || []).forEach((node, index) => {
    appendRenderedNode(
      renderedNodes,
      renderNodeWithPlaceholderPattern(
        node,
        [index],
        renderPlaceholder,
        state,
        placeholderPattern
      )
    );
  });

  return renderedNodes;
};

export const renderHtmlWithBlankPlaceholders = (
  html,
  renderBlank,
  keyPrefix = 'reading-html'
) =>
  renderHtmlWithPlaceholderPattern(
    html,
    renderBlank,
    blankPlaceholderPattern,
    keyPrefix
  );

/**
 * Loại bỏ HTML tags, trả về text thuần
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export const stripHtml = (html) => {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

/**
 * Dọn dẹp HTML từ Quill editor - xóa các thẻ rỗng
 * @param {string} html - HTML từ Quill
 * @returns {string} HTML đã được dọn dẹp
 */
export const cleanupPassageHTML = (html) => {
  if (!html) return '';
  
  // Remove empty <p><br></p> tags
  let cleaned = html.replace(/<p><br><\/p>/g, '');
  
  // Remove multiple consecutive empty paragraphs
  cleaned = cleaned.replace(/<p><\/p>/g, '');
  
  // Remove excessive whitespace-only paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  
  // Replace multiple <br> with single <br>
  cleaned = cleaned.replace(/<br>\s*<br>/g, '<br>');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
};

/**
 * Convert File to Base64 string
 * @param {File} file - File object
 * @returns {Promise<string>} Base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};
