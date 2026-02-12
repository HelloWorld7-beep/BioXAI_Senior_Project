import '../styles/Home.css';
import Navbar from '../components/Navbar';
import Bubble from '../components/Bubble';
import StartButton from '../components/StartButton';

function Home() {
    const bubbles = [
        { x: '88%', y: '-17%', size: 450, opacity: 0.45, shadow: false},
        { x: '-8%', y: '45%', size: 300, opacity: 0.25, shadow: false },
        { x: '38%', y: '15%', size: 90, opacity: 0.4, shadow: true },
       
        { x: '65%', y: '55%', size: 15, opacity: 0.4, shadow: true, shadowSize: 8 },
        { x: '69%', y: '52%', size: 10, opacity: 0.4, shadow: false, shadowSize: 7 },
        { x: '71%', y: '44%', size: 15, opacity: 0.5, shadow: true, shadowSize: 4 },
        
        { x: '32%', y: '70%', size: 50, opacity: 0.45, shadow: true, shadowSize: 7 },
        { x: '39%', y: '78%', size: 10, opacity: 0.6, shadow: true, shadowSize: 7  },
        { x: '28%', y: '85%', size: 60, opacity: 0.20, shadow: true, shadowSize: 30 },



    ];

    return (
        <div className='body'>
            <Navbar/>
            <div className="bubble-layer">
                {bubbles.map((b, i) => (
                    <Bubble key={i} {...b} />
                ))}
            </div>
            <div className='hero'>
                <div className="hero-content">
                    <div className='header'>BioXAI</div>
                    <div className='subheader'>Explainable Protein Mutation Scoring</div>
                </div>
                <StartButton />
            </div>
        </div>
    )
}

export default Home;