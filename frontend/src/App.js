import logo from './logo.svg';
import './App.css';
import AttentionVisualizer from './pages/AttentionVisualizer'; // Your new import

function App() {
  return (
    <div className="App">
      {/* This line tells React to render your specific page */}
      <AttentionVisualizer />
    </div>
  );
}

export default App;