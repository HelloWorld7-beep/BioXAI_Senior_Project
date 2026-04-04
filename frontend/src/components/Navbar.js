import '../styles/Navbar.css';
import { NavLink } from "react-router-dom";

function Navbar() {
    return (
        <nav className="nav-box">
            <NavLink to="/" end className="nav-link">
                Home
            </NavLink>
            <NavLink to="/analysis" className="nav-link">
                Analysis
            </NavLink>
            <NavLink to="/tensorboard" className="nav-link">
                TensorBoard
            </NavLink>
            <NavLink to="/about" className="nav-link">
                About
            </NavLink>
        </nav>
    );
}

export default Navbar;