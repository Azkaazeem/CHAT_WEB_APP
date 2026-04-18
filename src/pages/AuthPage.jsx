import { useEffect, useRef, useState } from "react";
import { Camera, Lock, Mail, UserRound } from "lucide-react";
import gsap from "gsap";
import Swal from "sweetalert2";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { clearAuthError, setAuthMode, signInUser, signUpUser } from "../features/auth/authSlice";
import { getInitials } from "../lib/format";

const initialSignup = {
  fullName: "",
  nickname: "",
  email: "",
  password: "",
  bio: "",
  dateOfBirth: "",
  avatarFile: null,
};

export default function AuthPage() {
  const rootRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { authMode, status, error, user } = useAppSelector((state) => state.auth);
  const [loginInput, setLoginInput] = useState({ email: "", password: "" });
  const [signupInput, setSignupInput] = useState(initialSignup);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (user) {
      navigate(location.state?.from || "/chat", { replace: true });
    }
  }, [location.state, navigate, user]);

  useEffect(() => {
    if (!rootRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-auth-card]",
        { opacity: 0, y: 30, rotateX: -10 },
        { opacity: 1, y: 0, rotateX: 0, duration: 0.9, stagger: 0.08, ease: "power3.out" },
      );
    }, rootRef);

    return () => ctx.revert();
  }, [authMode]);

  const handleAvatar = (file) => {
    if (!file) {
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    setSignupInput((current) => ({ ...current, avatarFile: file }));
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    dispatch(clearAuthError());

    try {
      await dispatch(signInUser(loginInput)).unwrap();
      await Swal.fire({
        title: "Welcome back",
        text: "Login successful. Chat dashboard khul raha hai.",
        icon: "success",
        background: "#0f1425",
        color: "#eef2ff",
        confirmButtonColor: "#7c6bff",
      });
      navigate(location.state?.from || "/chat");
    } catch (submitError) {
      await Swal.fire({
        title: "Login failed",
        text: submitError?.message || "Please check your credentials.",
        icon: "error",
        background: "#0f1425",
        color: "#eef2ff",
        confirmButtonColor: "#ff5b7f",
      });
    }
  };

  const submitSignup = async (event) => {
    event.preventDefault();
    dispatch(clearAuthError());

    try {
      const result = await dispatch(signUpUser(signupInput)).unwrap();
      await Swal.fire({
        title: result.needsEmailVerification ? "Check your email" : "Account created",
        text: result.needsEmailVerification
          ? "Verification email bheji gayi hai. Verify karke login karo."
          : "Signup successful. Ab aap app use kar sakte ho.",
        icon: "success",
        background: "#0f1425",
        color: "#eef2ff",
        confirmButtonColor: "#7c6bff",
      });
      navigate(result.needsEmailVerification ? "/auth" : "/chat");
    } catch (submitError) {
      await Swal.fire({
        title: "Signup failed",
        text: submitError?.message || "Please try again with a different email or nickname.",
        icon: "error",
        background: "#0f1425",
        color: "#eef2ff",
        confirmButtonColor: "#ff5b7f",
      });
    }
  };

  return (
    <main className="route-shell auth-route" ref={rootRef}>
      <section className="auth-side-panel cut-panel" data-auth-card>
        <p className="label-line">Secure account access</p>
        <h1>Login to unlock chat. Signup to create your profile first.</h1>
        <p className="auth-side-copy">
          App intentionally gated hai. Home page sab dekh sakte hain, lekin interactions,
          profile editing aur messaging sirf authenticated users ke liye hai.
        </p>
        <div className="auth-side-bars">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="auth-form-panel glass-panel" data-auth-card>
        <div className="auth-top-switch">
          <button
            className={`tab-switch ${authMode === "login" ? "active" : ""}`}
            onClick={() => dispatch(setAuthMode("login"))}
            type="button"
          >
            Login
          </button>
          <button
            className={`tab-switch ${authMode === "signup" ? "active" : ""}`}
            onClick={() => dispatch(setAuthMode("signup"))}
            type="button"
          >
            Signup
          </button>
        </div>

        {authMode === "login" ? (
          <form className="auth-clean-form" onSubmit={submitLogin}>
            <label className="clean-field">
              <span>Email</span>
              <div className="field-shell">
                <Mail size={15} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={loginInput.email}
                  onChange={(event) =>
                    setLoginInput((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>
            </label>

            <label className="clean-field">
              <span>Password</span>
              <div className="field-shell">
                <Lock size={15} />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={loginInput.password}
                  onChange={(event) =>
                    setLoginInput((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
              </div>
            </label>

            <button className="primary-cta wide" disabled={status === "loading"} type="submit">
              {status === "loading" ? "Please wait..." : "Login now"}
            </button>
          </form>
        ) : (
          <form className="auth-clean-form" onSubmit={submitSignup}>
            <div className="signup-avatar-row">
              <div className="auth-avatar">
                {previewUrl ? (
                  <img alt="Avatar preview" src={previewUrl} />
                ) : (
                  <span>{getInitials(signupInput.fullName || signupInput.nickname || "PC")}</span>
                )}
              </div>
              <label className="outline-cta" htmlFor="signup-pic">
                <Camera size={14} />
                Upload picture
              </label>
              <input
                accept="image/*"
                hidden
                id="signup-pic"
                type="file"
                onChange={(event) => handleAvatar(event.target.files?.[0])}
              />
            </div>

            <div className="split-fields">
              <label className="clean-field">
                <span>Name</span>
                <div className="field-shell">
                  <UserRound size={15} />
                  <input
                    type="text"
                    value={signupInput.fullName}
                    onChange={(event) =>
                      setSignupInput((current) => ({ ...current, fullName: event.target.value }))
                    }
                    required
                  />
                </div>
              </label>
              <label className="clean-field">
                <span>Nickname</span>
                <div className="field-shell">
                  <UserRound size={15} />
                  <input
                    type="text"
                    value={signupInput.nickname}
                    onChange={(event) =>
                      setSignupInput((current) => ({ ...current, nickname: event.target.value }))
                    }
                    required
                  />
                </div>
              </label>
            </div>

            <div className="split-fields">
              <label className="clean-field">
                <span>Email</span>
                <div className="field-shell">
                  <Mail size={15} />
                  <input
                    type="email"
                    value={signupInput.email}
                    onChange={(event) =>
                      setSignupInput((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                  />
                </div>
              </label>
              <label className="clean-field">
                <span>DOB</span>
                <div className="field-shell">
                  <input
                    type="date"
                    value={signupInput.dateOfBirth}
                    onChange={(event) =>
                      setSignupInput((current) => ({
                        ...current,
                        dateOfBirth: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </label>
            </div>

            <label className="clean-field">
              <span>Password</span>
              <div className="field-shell">
                <Lock size={15} />
                <input
                  type="password"
                  value={signupInput.password}
                  onChange={(event) =>
                    setSignupInput((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
              </div>
            </label>

            <label className="clean-field">
              <span>Bio</span>
              <div className="field-shell textarea-shell">
                <textarea
                  rows="4"
                  value={signupInput.bio}
                  onChange={(event) =>
                    setSignupInput((current) => ({ ...current, bio: event.target.value }))
                  }
                  required
                />
              </div>
            </label>

            <button className="primary-cta wide" disabled={status === "loading"} type="submit">
              {status === "loading" ? "Creating..." : "Create account"}
            </button>
          </form>
        )}

        {error ? <p className="inline-error">{error}</p> : null}
      </section>
    </main>
  );
}
