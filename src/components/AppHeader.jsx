import { MessageSquareDiff, ShieldCheck, Sparkles } from "lucide-react";
import Swal from "sweetalert2";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";

export default function AppHeader() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const handleProtectedJump = async () => {
    if (user) {
      navigate("/chat");
      return;
    }

    await Swal.fire({
      title: "Login required",
      text: "Chat use karne ke liye pehle login ya signup karna hoga.",
      icon: "info",
      background: "#0f1425",
      color: "#eef2ff",
      confirmButtonText: "Go to auth",
      confirmButtonColor: "#7c6bff",
    });

    navigate("/auth");
  };

  return (
    <header className="site-header">
      <Link className="logo-lockup" to="/">
        <div className="logo-mark">
          <Sparkles size={16} />
        </div>
        <div>
          <strong>Pulse Chat</strong>
          <p>premium realtime messaging</p>
        </div>
      </Link>

      <nav className="main-nav">
        <NavLink className="nav-link" to="/">
          Home
        </NavLink>
        <button className="nav-link button-link" onClick={handleProtectedJump} type="button">
          Chat
        </button>
        <NavLink className="nav-link" to="/auth">
          {user ? "Switch Account" : "Login"}
        </NavLink>
      </nav>

      <div className="header-actions">
        <div className="header-pill">
          <ShieldCheck size={14} />
          Supabase secure
        </div>
        <button className="header-cta" onClick={handleProtectedJump} type="button">
          <MessageSquareDiff size={16} />
          Open App
        </button>
      </div>
    </header>
  );
}
