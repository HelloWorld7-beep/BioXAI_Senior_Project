import React, { useEffect, useMemo, useRef, useState } from 'react';

const BASE_CELL_SIZE = 30;
const GRID_GAP = 1;

const HeatmapGrid = ({ sequence, data }) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const size = data?.length ?? 0;

  const gridSize = useMemo(() => {
    if (!size) return 0;
    return (size * BASE_CELL_SIZE) + ((size - 1) * GRID_GAP);
  }, [size]);

  useEffect(() => {
    if (!containerRef.current || !gridSize) return undefined;

    const handleResize = (rect) => {
      const available = Math.min(rect.width, rect.height);
      const nextScale = Math.min(1, available / gridSize);
      setScale(Number.isFinite(nextScale) ? nextScale : 1);
    };

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      handleResize(entries[0].contentRect);
    });

    handleResize(containerRef.current.getBoundingClientRect());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [gridSize]);

  // If the model adds start/end tokens, the matrix might be longer than the sequence.
  // We use the data length to ensure we map every cell returned by the backend.
  return (
    <div className="heatmap-wrap" ref={containerRef}>
      <div
        className="heatmap-grid"
        style={{
          gridTemplateColumns: `repeat(${size}, ${BASE_CELL_SIZE}px)`,
          gridAutoRows: `${BASE_CELL_SIZE}px`,
          gap: `${GRID_GAP}px`,
          width: gridSize ? `${gridSize}px` : 'auto',
          height: gridSize ? `${gridSize}px` : 'auto',
          transform: `scale(${scale})`
        }}
      >
        {data.map((row, rowIndex) => (
          row.map((score, colIndex) => (
            <div 
              key={`${rowIndex}-${colIndex}`}
              title={`Residue ${rowIndex} to ${colIndex}\nAttention Score: ${score.toFixed(4)}`}
              style={{
                width: `${BASE_CELL_SIZE}px`,
                height: `${BASE_CELL_SIZE}px`,
                backgroundColor: `rgba(255, 0, 0, ${Math.min(score * 8, 1)})`, // Multiplied for better contrast
                cursor: 'help'
              }}
            />
          ))
        ))}
      </div>
    </div>
  );
};

export default HeatmapGrid;
