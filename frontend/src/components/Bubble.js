function Bubble({ x, y, size, opacity = 0.4, shadow = false, shadowSize = 12 }) {
  const style = {
    position: 'absolute',
    left: x,
    top: y,
    width: size,
    height: size,
    backgroundColor: '#8F7FEE',
    borderRadius: '50%',
    opacity,
    pointerEvents: 'none',
    
  };

  if (size > 100 || shadow === true) {
    style.boxShadow = `0 0 0 ${shadowSize}px rgba(132, 116, 226, 0.58)`;
  }

  return <div style={style} />;
}

export default Bubble;