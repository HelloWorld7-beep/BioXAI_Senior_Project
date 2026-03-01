import React from 'react';

const HeatmapGrid = ({ sequence, data }) => {
  // If the model adds start/end tokens, the matrix might be longer than the sequence
  // We use the data length to ensure we map every cell returned by the backend
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(${data.length}, 30px)`,
      gap: '1px',
      backgroundColor: '#ddd'
    }}>
      {data.map((row, rowIndex) => (
        row.map((score, colIndex) => (
          <div 
            key={`${rowIndex}-${colIndex}`}
            title={`Residue ${rowIndex} to ${colIndex}\nAttention Score: ${score.toFixed(4)}`}
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: `rgba(255, 0, 0, ${score * 1.5})`, // Multiplied for better contrast
              cursor: 'help'
            }}
          />
        ))
      ))}
    </div>
  );
};

export default HeatmapGrid;