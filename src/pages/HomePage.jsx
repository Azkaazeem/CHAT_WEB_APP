import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Layers3,
  LockKeyhole,
  MessageCircleHeart,
  Orbit,
  Sparkles,
  Zap,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";

gsap.registerPlugin(ScrollTrigger);

const featureCards = [
  {
    icon: MessageCircleHeart,
    title: "Direct chat only",
    text: "Har user visible hoga aur jis se baat karni ho us par click karke private thread khul jayegi.",
  },
  {
    icon: LockKeyhole,
    title: "Auth gated experience",
    text: "Home page public hai, lekin app ke interactive parts use karne ke liye login lazmi hai.",
  },
  {
    icon: Orbit,
    title: "Complex motion system",
    text: "Hero parallax, scroll reveals, layered transitions aur hover-based depth effects included hain.",
  },
  {
    icon: Layers3,
    title: "Sharper premium UI",
    text: "Mixed corners, clean spacing aur slimmer cards taake layout bulky ya over-rounded na lage.",
  },
];

export default function HomePage() {
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!rootRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-hero]",
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power3.out" },
      );

      gsap.to(".hero-glow-a", {
        x: 55,
        y: 35,
        rotate: 20,
        duration: 7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".hero-glow-b", {
        x: -40,
        y: -25,
        duration: 6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.utils.toArray("[data-reveal]").forEach((item, index) => {
        gsap.fromTo(
          item,
          { opacity: 0, y: 60, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.9,
            ease: "power3.out",
            delay: index * 0.03,
            scrollTrigger: {
              trigger: item,
              start: "top 80%",
            },
          },
        );
      });

      gsap.to(".showcase-window", {
        yPercent: -8,
        scrollTrigger: {
          trigger: ".hero-area",
          start: "top top",
          end: "bottom top",
          scrub: 1.1,
        },
      });

      gsap.to(".marquee-track", {
        xPercent: -50,
        duration: 18,
        repeat: -1,
        ease: "none",
      });

      gsap.utils.toArray(".motion-tilt").forEach((card) => {
        const tiltX = gsap.quickTo(card, "rotateX", { duration: 0.3, ease: "power2.out" });
        const tiltY = gsap.quickTo(card, "rotateY", { duration: 0.3, ease: "power2.out" });
        const shiftY = gsap.quickTo(card, "y", { duration: 0.3, ease: "power2.out" });

        const onMove = (event) => {
          const rect = card.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          tiltX(py * -10);
          tiltY(px * 14);
          shiftY(-6);
        };

        const onLeave = () => {
          tiltX(0);
          tiltY(0);
          shiftY(0);
        };

        card.addEventListener("mousemove", onMove);
        card.addEventListener("mouseleave", onLeave);
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const gateToAuth = async () => {
    if (user) {
      navigate("/chat");
      return;
    }

    await Swal.fire({
      title: "Login first",
      text: "Interactive app use karne ke liye account banana ya login karna zaroori hai.",
      icon: "question",
      background: "#0f1425",
      color: "#eef2ff",
      confirmButtonText: "Go to login",
      confirmButtonColor: "#7c6bff",
    });

    navigate("/auth");
  };

  return (
    <main className="route-shell home-route" ref={rootRef}>
      <section className="hero-area">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />

        <div className="hero-copy-panel" data-hero>
          <p className="label-line">
            <Zap size={15} />
            Modern premium chat interface
          </p>
          <h1>Public landing page first. Full chat app only after login.</h1>
          <p className="hero-description">
            Fast, cinematic and polished. Mixed corners, strong motion, hover energy,
            layered sections, and a proper product-style structure instead of one static screen.
          </p>

          <div className="hero-actions">
            <button className="primary-cta sharp" onClick={gateToAuth} type="button">
              Start now
              <ArrowRight size={16} />
            </button>
            <button className="secondary-cta cut" onClick={() => navigate("/auth")} type="button">
              Login / Signup
            </button>
          </div>
        </div>

        <div className="showcase-window" data-hero>
          <div className="window-topline">
            <span />
            <span />
            <span />
          </div>
          <div className="window-layout">
            <aside className="window-sidebar">
              <div className="window-chip tall" />
              <div className="window-chip" />
              <div className="window-chip" />
              <div className="window-chip short" />
            </aside>
            <div className="window-main">
              <div className="window-list">
                <div className="window-row active" />
                <div className="window-row" />
                <div className="window-row" />
              </div>
              <div className="window-chat">
                <div className="bubble left" />
                <div className="bubble right gradient" />
                <div className="bubble left short" />
                <div className="bubble right" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid-home">
        {featureCards.map(({ icon: Icon, title, text }) => (
          <article className="feature-panel motion-tilt" data-reveal key={title}>
            <div className="feature-icon-wrap">
              <Icon size={18} />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="marquee-band" data-reveal>
        <div className="marquee-track">
          <span>Pulse Chat Premium</span>
          <span>Realtime Conversations</span>
          <span>Editorial Motion System</span>
          <span>Mixed Geometry Interface</span>
          <span>Pulse Chat Premium</span>
          <span>Realtime Conversations</span>
          <span>Editorial Motion System</span>
          <span>Mixed Geometry Interface</span>
        </div>
      </section>

      <section className="editorial-grid" data-reveal>
        <article className="editorial-card primary-cut motion-tilt">
          <p className="label-line">
            <Sparkles size={14} />
            Visual rhythm
          </p>
          <h3>Big type, long breathing space, and sections that feel staged not stacked.</h3>
          <p>
            Is reference site ki strongest cheez us ka pacing hai. Elements rush nahi karte;
            woh enter karte hain, hold karte hain, aur phir next section ko room dete hain.
          </p>
        </article>

        <article className="editorial-card secondary-cut motion-tilt">
          <p className="label-line">Interaction depth</p>
          <h3>Hover par sirf color nahi, perspective aur positional energy bhi change hoti hai.</h3>
          <p>
            Isi liye maine tilt-based motion aur stronger hover elevation direction add ki hai
            taa ke UI zinda lage.
          </p>
        </article>
      </section>

      <section className="story-band" data-reveal>
        <div className="story-copy">
          <p className="label-line">Scroll animations</p>
          <h2>Every major section enters with reveal motion, depth shifts, and layered transitions.</h2>
        </div>
        <div className="story-stack">
          <div className="story-card tilt-one motion-tilt">
            <span>Hover reactions</span>
            <p>Cards lift, edges glow, and content slides subtly for a richer premium feel.</p>
          </div>
          <div className="story-card tilt-two motion-tilt">
            <span>Sharpened geometry</span>
            <p>Some panels rounded, some cut-corner, some sharper edges, taake UI monotonous na lage.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
