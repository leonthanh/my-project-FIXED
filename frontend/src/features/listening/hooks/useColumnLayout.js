import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook để quản lý 4-column layout với resize và collapse cho Listening Editor
 * @param {Object} initialWidths - Chiều rộng ban đầu của các cột (%)
 * @returns {Object} State và handlers cho column layout
 */
export const useColumnLayout = (initialWidths = {
  col1: 12,  // Parts
  col2: 30,  // Part Content (Audio)
  col3: 15,  // Sections
  col4: 43   // Questions
}) => {
  // Column width state
  const [columnWidths, setColumnWidths] = useState(initialWidths);
  
  // Collapsed state for each column
  const [collapsedColumns, setCollapsedColumns] = useState({
    col1: false,
    col2: false,
    col3: false,
    col4: false
  });
  
  // Resize state
  const [isResizing, setIsResizing] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidths, setStartWidths] = useState(null);

  /**
   * Toggle column collapse/expand
   */
  const toggleColumnCollapse = useCallback((colName) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [colName]: !prev[colName]
    }));
  }, []);

  /**
   * Handle mouse down on resize divider
   */
  const handleMouseDown = useCallback((dividerIndex, e) => {
    setIsResizing(dividerIndex);
    setStartX(e.clientX);
    setStartWidths({ ...columnWidths });
  }, [columnWidths]);

  /**
   * Handle mouse move for resizing
   */
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing === null || !startWidths) return;
      
      const delta = (e.clientX - startX) / window.innerWidth * 100;
      const newWidths = { ...startWidths };
      
      if (isResizing === 1) { // Between col1 and col2
        newWidths.col1 = Math.max(8, Math.min(20, startWidths.col1 + delta));
        newWidths.col2 = 100 - newWidths.col1 - newWidths.col3 - newWidths.col4;
      } else if (isResizing === 2) { // Between col2 and col3
        newWidths.col2 = Math.max(20, Math.min(45, startWidths.col2 + delta));
        newWidths.col3 = 100 - newWidths.col1 - newWidths.col2 - newWidths.col4;
      } else if (isResizing === 3) { // Between col3 and col4
        newWidths.col3 = Math.max(10, Math.min(25, startWidths.col3 + delta));
        newWidths.col4 = 100 - newWidths.col1 - newWidths.col2 - newWidths.col3;
      }
      
      setColumnWidths(newWidths);
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startX, startWidths]);

  /**
   * Calculate dynamic width for column based on collapse state
   */
  const getColumnWidth = useCallback((colName) => {
    if (collapsedColumns[colName]) return '50px';
    
    const openColumns = ['col1', 'col2', 'col3', 'col4'].filter(col => !collapsedColumns[col]);
    
    if (openColumns.length === 1) {
      return '100%';
    } else if (openColumns.length === 2) {
      const totalCollapsedWidth = ['col1', 'col2', 'col3', 'col4']
        .filter(col => collapsedColumns[col])
        .length * 50;
      const remainingWidth = 100 - (totalCollapsedWidth / window.innerWidth * 100);
      return `${remainingWidth / 2}%`;
    } else if (openColumns.length === 3) {
      const totalCollapsedWidth = 50;
      const remainingWidth = 100 - (totalCollapsedWidth / window.innerWidth * 100);
      return `${remainingWidth / 3}%`;
    }
    
    return `${columnWidths[colName]}%`;
  }, [collapsedColumns, columnWidths]);

  return {
    columnWidths,
    collapsedColumns,
    isResizing,
    toggleColumnCollapse,
    handleMouseDown,
    getColumnWidth
  };
};

export default useColumnLayout;
