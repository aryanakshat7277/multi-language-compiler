import React, { useCallback, useEffect, useState } from 'react';
import './ResizeHandle.css';

interface ResizeHandleProps {
  direction: 'vertical' | 'horizontal'; // 'vertical' = left/right divider, 'horizontal' = top/bottom divider
  onDrag: (delta: number) => void;
  onReset?: () => void;
  className?: string;
  title?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  direction,
  onDrag,
  onReset,
  className = '',
  title = direction === 'vertical' ? 'Drag to resize width (Double click to reset)' : 'Drag to resize height (Double click to reset)'
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startPos = direction === 'vertical' ? e.clientX : e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'vertical' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - startPos;
      onDrag(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [direction, onDrag]);

  return (
    <div
      className={`resize-handle resize-handle-${direction} ${isDragging ? 'is-dragging' : ''} ${className}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={onReset}
      title={title}
    >
      <div className="resize-handle-indicator">
        <span className="resize-handle-dots" />
      </div>
    </div>
  );
};

export default ResizeHandle;
