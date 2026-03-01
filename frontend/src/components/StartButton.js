import '../styles/StartButton.css';
import { useNavigate } from 'react-router-dom';

function StartButton() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/analysis');
  };

  return (
    <button className="cta" onClick={handleClick}>
      Start Analysis
    </button>
  );
}

export default StartButton;