"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

type Slide = {
  id: number;
  kind: "brand" | "network" | "cyber";
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  thumb: string;
  accent: string;
  accentSoft: string;
  imagePosition?: string;
  highlights: string[];
  metrics?: Array<{
    value: string;
    label: string;
  }>;
  cta?: {
    label: string;
    href: string;
  };
};

const AUTO_PLAY_DELAY = 7000;

const slides: Slide[] = [
  {
    id: 1,
    kind: "brand",
    eyebrow: "Africa Digital Connect",
    title: "Accélérez la transformation digitale de votre organisation",
    description:
      "Des équipes, des outils et une méthode claire pour moderniser vos services, sécuriser vos opérations et connecter vos utilisateurs.",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1800&q=85&auto=format&fit=crop",
    thumb:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=220&q=75&auto=format&fit=crop",
    accent: "#20d6c7",
    accentSoft: "rgba(32, 214, 199, 0.22)",
    imagePosition: "center",
    highlights: ["Conseil digital", "Intégration", "Accompagnement"],
  },
  {
    id: 2,
    kind: "network",
    eyebrow: "Infrastructure et innovation",
    title: "Construisez une base technologique fiable pour grandir",
    description:
      "Réseaux, cloud, supervision et services numériques pensés pour les entreprises, les institutions et les équipes terrain.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1800&q=85&auto=format&fit=crop",
    thumb:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=220&q=75&auto=format&fit=crop",
    accent: "#9be15d",
    accentSoft: "rgba(155, 225, 93, 0.2)",
    imagePosition: "center",
    highlights: ["Réseaux", "Cloud", "Supervision"],
  },
  {
    id: 3,
    kind: "cyber",
    eyebrow: "Formation cybersécurité",
    title: "Collaborateur Cyber-Responsable",
    description:
      "Une formation concrète pour aider vos équipes à reconnaître les attaques, protéger les accès et adopter les bons réflexes face au phishing, aux mots de passe faibles et aux risques du quotidien.",
    image:
      "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1800&q=85&auto=format&fit=crop",
    thumb:
      "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=220&q=75&auto=format&fit=crop",
    accent: "#f6c85f",
    accentSoft: "rgba(246, 200, 95, 0.24)",
    imagePosition: "center",
    highlights: ["Phishing", "Mots de passe", "Hygiène numérique"],
    metrics: [
      { value: "CCR", label: "Parcours certifiant" },
      { value: "1 jour", label: "Format intensif" },
      { value: "80%", label: "Risque humain ciblé" },
    ],
    cta: {
      label: "En savoir plus",
      href: "#formation-cybersecurite",
    },
  },
  {
    id: 4,
    kind: "brand",
    eyebrow: "Support et continuité",
    title: "Passez de la sensibilisation aux réflexes durables",
    description:
      "Après la formation, vos équipes repartent avec des pratiques simples, des scénarios réels et une culture de vigilance exploitable dès le lendemain.",
    image:
      "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=1800&q=85&auto=format&fit=crop",
    thumb:
      "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=220&q=75&auto=format&fit=crop",
    accent: "#ff7a59",
    accentSoft: "rgba(255, 122, 89, 0.22)",
    imagePosition: "center",
    highlights: ["Cas pratiques", "Plan d'action", "Suivi"],
  },
];

const cyberImages = [
  {
    src: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=520&q=80&auto=format&fit=crop",
    alt: "Interface de cybersécurité avec cadenas numérique",
    label: "Protection des accès",
  },
  {
    src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=520&q=80&auto=format&fit=crop",
    alt: "Ecrans de supervision cybersécurité",
    label: "Détection des menaces",
  },
  {
    src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=520&q=80&auto=format&fit=crop",
    alt: "Participant suivant une formation en ligne",
    label: "Ateliers pratiques",
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [ctaVisible, setCtaVisible] = useState(false);
  const slide = slides[current];
  const isCyberSlide = slide.kind === "cyber";

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setCtaVisible(false);
  }, []);

  const next = useCallback(() => {
    setCurrent((value) => (value + 1) % slides.length);
    setCtaVisible(false);
  }, []);

  const prev = useCallback(() => {
    setCurrent((value) => (value - 1 + slides.length) % slides.length);
    setCtaVisible(false);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(next, AUTO_PLAY_DELAY);
    return () => window.clearInterval(timer);
  }, [next]);

  useEffect(() => {
    setCtaVisible(false);

    if (!isCyberSlide) return;

    const timer = window.setTimeout(() => setCtaVisible(true), 650);
    return () => window.clearTimeout(timer);
  }, [isCyberSlide, current]);

  return (
    <>
      <style>{`
        .cv3-root {
          position: relative;
          isolation: isolate;
          width: 100%;
          min-height: 560px;
          overflow: hidden;
          background: #111315;
          color: #ffffff;
          font-family: Inter, Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .cv3-bg-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          transform: scale(1.035);
          transition: opacity 650ms ease, transform 1200ms ease;
          z-index: -3;
        }

        .cv3-bg-layer.show {
          opacity: 1;
          transform: scale(1);
        }

        .cv3-bg-image {
          height: 100%;
          width: 100%;
          object-fit: cover;
          filter: saturate(0.92) contrast(1.05);
        }

        .cv3-shade {
          position: absolute;
          inset: 0;
          z-index: -2;
          background:
            linear-gradient(90deg, rgba(10, 12, 13, 0.92) 0%, rgba(10, 12, 13, 0.74) 38%, rgba(10, 12, 13, 0.24) 76%, rgba(10, 12, 13, 0.56) 100%),
            linear-gradient(180deg, rgba(10, 12, 13, 0.18) 0%, rgba(10, 12, 13, 0.78) 100%);
        }

        .cv3-grid {
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: 0.18;
          background-image:
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(90deg, black 0%, transparent 74%);
        }

        .cv3-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 390px;
          gap: 44px;
          min-height: 560px;
          align-items: center;
          padding: 64px 56px 92px;
        }

        .cv3-copy {
          max-width: 720px;
          transition: opacity 350ms ease, transform 350ms ease;
        }

        .cv3-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 18px;
          color: rgba(255, 255, 255, 0.76);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .cv3-kicker::before {
          content: "";
          width: 34px;
          height: 3px;
          border-radius: 999px;
          background: var(--cv3-accent);
          box-shadow: 0 0 28px var(--cv3-accent-soft);
        }

        .cv3-title {
          max-width: 760px;
          margin: 0;
          color: #ffffff;
          font-size: 54px;
          font-weight: 800;
          line-height: 1.02;
          letter-spacing: 0;
          text-wrap: balance;
        }

        .cv3-desc {
          max-width: 640px;
          margin: 22px 0 0;
          color: rgba(255, 255, 255, 0.76);
          font-size: 17px;
          line-height: 1.7;
        }

        .cv3-highlights {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 28px 0 0;
          padding: 0;
          list-style: none;
        }

        .cv3-highlight {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          padding: 8px 13px;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          backdrop-filter: blur(10px);
        }

        .cv3-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          max-width: 620px;
          margin: 28px 0 0;
        }

        .cv3-metric {
          min-height: 86px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          background: rgba(17, 19, 21, 0.68);
          padding: 14px;
          backdrop-filter: blur(12px);
        }

        .cv3-metric-value {
          color: var(--cv3-accent);
          font-size: 24px;
          font-weight: 800;
          line-height: 1;
        }

        .cv3-metric-label {
          margin-top: 9px;
          color: rgba(255, 255, 255, 0.66);
          font-size: 12px;
          line-height: 1.35;
        }

        .cv3-actions {
          min-height: 52px;
          margin: 28px 0 0;
        }

        .cv3-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 48px;
          border-radius: 8px;
          background: var(--cv3-accent);
          color: #111315;
          padding: 0 22px;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          opacity: 0;
          transform: translateY(10px);
          pointer-events: none;
          transition: opacity 320ms ease, transform 320ms ease, filter 180ms ease;
        }

        .cv3-cta.show {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .cv3-cta:hover {
          filter: brightness(1.08);
        }

        .cv3-panel {
          align-self: stretch;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 14px;
        }

        .cv3-cyber-stack {
          display: grid;
          gap: 12px;
          opacity: 0;
          transform: translateX(18px);
          pointer-events: none;
          transition: opacity 420ms ease, transform 420ms ease;
        }

        .cv3-cyber-stack.show {
          opacity: 1;
          transform: translateX(0);
        }

        .cv3-mini-image {
          position: relative;
          height: 112px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: #191b1d;
        }

        .cv3-mini-image img {
          height: 100%;
          width: 100%;
          object-fit: cover;
          opacity: 0.88;
        }

        .cv3-mini-image span {
          position: absolute;
          left: 10px;
          bottom: 10px;
          border-radius: 8px;
          background: rgba(17, 19, 21, 0.82);
          padding: 6px 9px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          backdrop-filter: blur(10px);
        }

        .cv3-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          position: absolute;
          left: 56px;
          right: 56px;
          bottom: 26px;
          z-index: 4;
        }

        .cv3-thumbs {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .cv3-thumb {
          position: relative;
          height: 54px;
          width: 82px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          padding: 0;
          cursor: pointer;
          opacity: 0.58;
          transition: opacity 180ms ease, width 240ms ease, border-color 180ms ease;
        }

        .cv3-thumb.active {
          width: 108px;
          opacity: 1;
          border-color: var(--cv3-accent);
        }

        .cv3-thumb img {
          height: 100%;
          width: 100%;
          object-fit: cover;
        }

        .cv3-thumb span {
          position: absolute;
          left: 7px;
          bottom: 6px;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.8);
        }

        .cv3-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cv3-counter {
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          font-weight: 800;
        }

        .cv3-nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          width: 42px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 8px;
          background: rgba(17, 19, 21, 0.56);
          color: #ffffff;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: background 180ms ease, border-color 180ms ease;
        }

        .cv3-nav-btn:hover {
          border-color: var(--cv3-accent);
          background: rgba(255, 255, 255, 0.14);
        }

        .cv3-progress {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 4px;
          background: rgba(255, 255, 255, 0.12);
        }

        .cv3-progress-fill {
          height: 100%;
          width: 100%;
          transform-origin: left;
          background: var(--cv3-accent);
          animation: cv3-progress ${AUTO_PLAY_DELAY}ms linear forwards;
        }

        @keyframes cv3-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        @media (max-width: 960px) {
          .cv3-root {
            min-height: 640px;
          }

          .cv3-shell {
            grid-template-columns: 1fr;
            gap: 28px;
            min-height: 640px;
            padding: 54px 28px 128px;
          }

          .cv3-title {
            font-size: 42px;
            line-height: 1.08;
          }

          .cv3-panel {
            align-self: auto;
          }

          .cv3-cyber-stack {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .cv3-mini-image {
            height: 96px;
          }

          .cv3-status {
            left: 28px;
            right: 28px;
            align-items: flex-end;
          }
        }

        @media (max-width: 640px) {
          .cv3-root {
            min-height: 680px;
          }

          .cv3-shell {
            min-height: 680px;
            padding: 44px 18px 150px;
          }

          .cv3-title {
            font-size: 34px;
          }

          .cv3-desc {
            font-size: 15px;
          }

          .cv3-metrics {
            grid-template-columns: 1fr;
          }

          .cv3-cyber-stack {
            display: none;
          }

          .cv3-status {
            left: 18px;
            right: 18px;
            bottom: 22px;
            flex-direction: column;
            align-items: stretch;
          }

          .cv3-thumbs {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 2px;
          }

          .cv3-thumb {
            flex: 0 0 auto;
            width: 78px;
          }

          .cv3-thumb.active {
            width: 96px;
          }

          .cv3-controls {
            justify-content: space-between;
          }
        }
      `}</style>

      <section
        className="cv3-root"
        aria-roledescription="carousel"
        aria-label="Carousel Africa Digital Connect"
        style={
          {
            "--cv3-accent": slide.accent,
            "--cv3-accent-soft": slide.accentSoft,
          } as CSSProperties
        }
      >
        {slides.map((item, index) => (
          <div
            key={item.id}
            className={`cv3-bg-layer${index === current ? " show" : ""}`}
            aria-hidden={index !== current}
          >
            <img
              className="cv3-bg-image"
              src={item.image}
              alt=""
              style={{ objectPosition: item.imagePosition || "center" }}
            />
          </div>
        ))}

        <div className="cv3-shade" />
        <div className="cv3-grid" />

        <div className="cv3-shell">
          <div className="cv3-copy" key={slide.id}>
            <p className="cv3-kicker">{slide.eyebrow}</p>
            <h2 className="cv3-title">{slide.title}</h2>
            <p className="cv3-desc">{slide.description}</p>

            <ul className="cv3-highlights" aria-label="Points forts">
              {slide.highlights.map((highlight) => (
                <li className="cv3-highlight" key={highlight}>
                  {highlight}
                </li>
              ))}
            </ul>

            {slide.metrics && (
              <div className="cv3-metrics">
                {slide.metrics.map((metric) => (
                  <div className="cv3-metric" key={metric.label}>
                    <div className="cv3-metric-value">{metric.value}</div>
                    <div className="cv3-metric-label">{metric.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="cv3-actions">
              {isCyberSlide && slide.cta && (
                <a
                  className={`cv3-cta${ctaVisible ? " show" : ""}`}
                  href={slide.cta.href}
                >
                  {slide.cta.label}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          <aside className="cv3-panel" aria-hidden={!isCyberSlide}>
            <div className={`cv3-cyber-stack${isCyberSlide ? " show" : ""}`}>
              {cyberImages.map((image) => (
                <div className="cv3-mini-image" key={image.label}>
                  <img src={image.src} alt={image.alt} />
                  <span>{image.label}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="cv3-status">
          <div className="cv3-thumbs" role="tablist" aria-label="Choisir un slide">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`cv3-thumb${index === current ? " active" : ""}`}
                onClick={() => goTo(index)}
                aria-label={`Afficher le slide ${index + 1}: ${item.eyebrow}`}
                aria-selected={index === current}
              >
                <img src={item.thumb} alt="" />
                <span>{item.kind === "cyber" ? "Cyber" : `0${index + 1}`}</span>
              </button>
            ))}
          </div>

          <div className="cv3-controls">
            <span className="cv3-counter">
              {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
            <button className="cv3-nav-btn" type="button" onClick={prev} aria-label="Slide précédent">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 3 5 8l5 5" />
              </svg>
            </button>
            <button className="cv3-nav-btn" type="button" onClick={next} aria-label="Slide suivant">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 3 5 5-5 5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="cv3-progress" aria-hidden="true">
          <div className="cv3-progress-fill" key={current} />
        </div>
      </section>
    </>
  );
}
