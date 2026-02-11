import { useState } from 'react';
import '../styles/Home.css';
import Navbar from '../components/Navbar';

function Home() {
    
    return (
        <div className='body'>
            <Navbar/>
            Hello World!
        </div>
    )
}

export default Home;