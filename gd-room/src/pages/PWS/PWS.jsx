import { Link } from "react-router-dom";
import {
  Brain,
  Code2,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
  Clock3,
  ArrowRight,
} from "lucide-react";

import "./PWS.css";

const features = [
  {
    title: "Aptitude Arena",
    description:
      "Sharpen your logical reasoning, quantitative aptitude and problem-solving skills.",
    icon: Target,
    active: false,
  },
  {
    title: "AI Interview",
    description:
      "Practice realistic interview questions and improve your confidence before the real interview.",
    icon: Brain,
    active: false,
  },
  {
    title: "GD Room",
    description:
      "Enter a realistic group discussion environment and practice expressing your ideas confidently.",
    icon: MessageSquare,
    active: true,
  },
  {
    title: "Coding Room",
    description:
      "Solve coding challenges and prepare yourself for technical assessments.",
    icon: Code2,
    active: false,
  },
];

function PWS() {
  return (
    <div className="app">

      <div className="glow glow-one"></div>
      <div className="glow glow-two"></div>

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">
            <Sparkles size={20} />
          </div>

          <span>
            Prepare<span className="logo-highlight">WithUs</span>
          </span>
        </div>

        <div className="nav-status">
          <span className="status-dot"></span>
          Placement Preparation
        </div>
      </nav>

      {/* Hero */}
      <main>

        <section className="hero">

          <div className="hero-badge">
            <Sparkles size={15} />
            YOUR PLACEMENT PREP ZONE
          </div>

          <h1>
            Prepare today.
            <br />
            <span>Perform tomorrow.</span>
          </h1>

          <p>
            Practice the skills that matter before you face the real
            placement process.
          </p>

          <div className="stats">

            <div>
              <Trophy size={18} />
              <span>Practice & Improve</span>
            </div>

            <div>
              <Clock3 size={18} />
              <span>Learn at your pace</span>
            </div>

          </div>

        </section>

        {/* Features */}
        <section className="features-section">

          <div className="section-heading">

            <div>
              <span>CHOOSE YOUR PREPARATION</span>
              <h2>What do you want to practice?</h2>
            </div>

            <p>
              Select a room and start building your placement confidence.
            </p>

          </div>

          <div className="features-grid">

            {features.map((feature, index) => {

              const Icon = feature.icon;

              return (
                <div
                  className={`feature-card ${
                    feature.active ? "active-card" : "disabled-card"
                  }`}
                  key={feature.title}
                >

                  <div className="card-top">

                    <div className="feature-icon">
                      <Icon size={25} />
                    </div>

                    <span className="card-number">
                      0{index + 1}
                    </span>

                  </div>

                  <div className="card-content">

                    <span className="card-tag">
                      {feature.active
                        ? "● AVAILABLE NOW"
                        : "COMING SOON"}
                    </span>

                    <h3>{feature.title}</h3>

                    <p>{feature.description}</p>

                  </div>

                  {feature.active ? (

                    <Link to="/gd" className="feature-button">
                      Start Practice
                      <ArrowRight size={18} />
                    </Link>

                  ) : (

                    <button
                      className="feature-button"
                      disabled
                    >
                      Coming Soon
                    </button>

                  )}

                </div>
              );

            })}

          </div>

        </section>

      </main>

      <footer>
        <span>Prepare With Us</span>
        <span>Build confidence. Crack placements.</span>
      </footer>

    </div>
  );
}

export default PWS;