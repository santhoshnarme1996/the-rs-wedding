import { useEffect, useRef, useState } from "react";
import { weddingData } from "./data";

function useCountdown(targetDate) {
  const calculate = () => {
    const diff = Math.max(new Date(targetDate).getTime() - Date.now(), 0);

    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculate);

  useEffect(() => {
    const intervalId = window.setInterval(() => setTimeLeft(calculate()), 30000);

    return () => window.clearInterval(intervalId);
  }, [targetDate]);

  return timeLeft;
}

function useRevealOnScroll() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);
}

function usePetals(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canvas || reducedMotion) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    const parent = canvas.parentElement;
    const palette = ["#f4c4ce", "#f7d9e0", "#ffffff", "#cdd3f0", "#f6c9b6"];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frameId = 0;
    let width = 0;
    let height = 0;
    let petals = [];

    const createPetal = (fromTop) => ({
      x: Math.random() * width,
      y: fromTop ? -24 : Math.random() * height,
      size: 5 + Math.random() * 8,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.025,
      velocityY: 0.22 + Math.random() * 0.48,
      sway: 0.35 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      color: palette[Math.floor(Math.random() * palette.length)],
      opacity: 0.35 + Math.random() * 0.4,
    });

    const resize = () => {
      const bounds = parent.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!petals.length) {
        const amount = Math.max(14, Math.min(32, Math.round(width / 24)));
        petals = Array.from({ length: amount }, () => createPetal(false));
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      petals.forEach((petal) => {
        petal.y += petal.velocityY;
        petal.phase += 0.01;
        petal.x += Math.sin(petal.phase) * petal.sway * 0.38;
        petal.angle += petal.angularVelocity;

        if (petal.y > height + 26) {
          Object.assign(petal, createPetal(true));
        }

        context.save();
        context.translate(petal.x, petal.y);
        context.rotate(petal.angle);
        context.globalAlpha = petal.opacity;
        context.fillStyle = petal.color;
        context.beginPath();
        context.ellipse(0, 0, petal.size * 0.48, petal.size, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });

      frameId = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef]);
}

function Thoranam() {
  return (
    <div className="thoranam" aria-hidden="true">
      <div className="thoranam__line" />
      <div className="thoranam__leaves">
        {Array.from({ length: 20 }, (_, index) => (
          <svg className="thoranam__leaf" key={index} viewBox="0 0 20 42">
            <path d="M10 1C18 13 18 30 10 41C2 30 2 13 10 1Z" fill="#7e9d6e" />
            <path d="M10 1C14 13 14 30 10 41C9 30 9 13 10 1Z" fill="#92b07d" />
            <path d="M10 4L10 38" stroke="#5b7a4f" strokeWidth="0.8" opacity="0.5" />
          </svg>
        ))}
      </div>
    </div>
  );
}

function KolamHalo() {
  const petals = Array.from({ length: 8 }, (_, index) => index * 45);
  const innerPetals = Array.from({ length: 8 }, (_, index) => 22.5 + index * 45);

  return (
    <div className="kolam-halo" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="90" fill="none" stroke="#bd9648" strokeWidth="0.8" opacity="0.7" />
        <circle cx="100" cy="100" r="74" fill="none" stroke="#bd9648" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 18.6" opacity="0.65" />
        {petals.map((rotation) => (
          <path
            key={rotation}
            d="M100 100C84 74 84 47 100 25C116 47 116 74 100 100Z"
            fill="none"
            stroke="#bd9648"
            strokeWidth="1.3"
            transform={`rotate(${rotation} 100 100)`}
          />
        ))}
        {innerPetals.map((rotation) => (
          <path
            key={rotation}
            d="M100 100C91 83 91 63 100 49C109 63 109 83 100 100Z"
            fill="none"
            stroke="#7f8bc4"
            strokeWidth="1.1"
            transform={`rotate(${rotation} 100 100)`}
          />
        ))}
        <circle cx="100" cy="100" r="11" fill="none" stroke="#bd9648" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="3.4" fill="#cf6f81" />
      </svg>
    </div>
  );
}

function OrnamentDivider() {
  return (
    <div className="ornament-divider" aria-hidden="true">
      <span />
      <svg viewBox="0 0 26 26">
        <path d="M13 2L24 13L13 24L2 13Z" fill="none" stroke="#bd9648" strokeWidth="1.3" />
        <circle cx="13" cy="13" r="3" fill="#cf6f81" />
      </svg>
      <span />
    </div>
  );
}

function VenuePin() {
  return (
    <svg className="venue-pin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22C7 16 4 12.5 4 9a8 8 0 0 1 16 0c0 3.5-3 7-8 13Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="9" r="2.4" fill="currentColor" />
    </svg>
  );
}

function App() {
  const countdown = useCountdown(weddingData.weddingStart);
  const petalCanvasRef = useRef(null);
  const heroImageRef = useRef(null);

  usePetals(petalCanvasRef);
  useRevealOnScroll();

  useEffect(() => {
    const updateParallax = () => {
      const image = heroImageRef.current;
      if (image && window.scrollY < 1000) {
        image.style.transform = `translateX(-50%) translateY(${window.scrollY * 0.16}px) scale(1.1)`;
      }
    };

    window.addEventListener("scroll", updateParallax, { passive: true });
    return () => window.removeEventListener("scroll", updateParallax);
  }, []);

  return (
    <div className="invite-page">
      <section className="hero" id="top">
        <img ref={heroImageRef} className="hero__temple" src="/hero-tanjai-floral-hd.png" alt="" />
        <div className="hero__wash" />
        <div className="hero__glow" />
        <canvas className="hero__petals" ref={petalCanvasRef} aria-hidden="true" />
        <Thoranam />
        <KolamHalo />
        <div className="hero__legibility" />

        <div className="hero__content">
          <p className="hero__ganesha">ॐ श्री गणेशाय नमः</p>
          <p className="hero__overline">{weddingData.heroLabel}</p>
          <h1>
            <span>{weddingData.couple[0]}</span>
            <em>&amp;</em>
            <span>{weddingData.couple[1]}</span>
          </h1>
          <p className="hero__tamil">இரு குடும்பங்களின் வாழ்த்துகளுடன்</p>
          <div className="hero__date">
            <span />
            <b>{weddingData.weddingDate}</b>
            <span />
          </div>
          <div className="countdown" aria-live="polite">
            <div><strong>{countdown.days}</strong><span>Days</span></div>
            <div><strong>{countdown.hours}</strong><span>Hours</span></div>
            <div><strong>{countdown.minutes}</strong><span>Minutes</span></div>
          </div>
          <a className="scroll-invite" href="#invitation">
            <span>Our invitation</span>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" /></svg>
          </a>
        </div>
      </section>

      <main>
        <section className="section invitation" id="invitation">
          <div className="section__narrow" data-reveal>
            <OrnamentDivider />
            <p className="invitation__sanskrit">{weddingData.invitation.sanskrit}</p>
            <p className="invitation__transliteration">{weddingData.invitation.transliteration}</p>
            <p className="invitation__quote">“{weddingData.invitation.blessing}”</p>
            <p className="invitation__message">{weddingData.invitation.message}</p>
            <div className="family-tags">
              {weddingData.families.map((family) => <span key={family}>{family}</span>)}
            </div>
          </div>
        </section>

        <section className="section venue" id="venue">
          <div className="section__narrow" data-reveal>
            <OrnamentDivider />
            <p className="eyebrow">The venue</p>
            <h2>Where we will gather</h2>
            <div className="venue-card">
              <p className="venue-card__eyebrow">Ceremony & Reception</p>
              <h3>{weddingData.venue.name}</h3>
              <p>{weddingData.venue.description}</p>
              <a className="button" href={weddingData.venue.directionsHref}><VenuePin />Get directions</a>
            </div>
          </div>
        </section>

        <section className="section itinerary" id="itinerary">
          <div className="section__wide">
            <div className="section-heading" data-reveal>
              <p className="eyebrow">The celebration</p>
              <h2>Two days of rituals & joy</h2>
            </div>
            <div className="itinerary__days">
              {weddingData.days.map((day) => (
                <article className="itinerary-day" data-reveal key={day.date}>
                  <header>
                    <b>{day.date}</b>
                    <div><h3>{day.title}</h3><p>{day.subtitle}</p></div>
                  </header>
                  <div className="itinerary-day__events">
                    {day.events.map((event) => (
                      <div className="timeline-event" key={event.title}>
                        <span className="timeline-event__dot" />
                        <p className="timeline-event__time">{event.time}</p>
                        <h4>{event.title}</h4>
                        <p>{event.description}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section rituals" id="rituals">
          <div className="section__wide">
            <div className="section-heading" data-reveal>
              <p className="eyebrow">For our guests</p>
              <h2>The meaning behind the rituals</h2>
              <p>A traditional Tamil Brahmin wedding unfolds through a series of sacred ceremonies. Here is a gentle guide to what you will witness.</p>
            </div>
            <div className="ritual-grid">
              {weddingData.rituals.map((ritual) => (
                <article className={`ritual-card${ritual.featured ? " ritual-card--featured" : ""}`} data-reveal key={ritual.title}>
                  <p className="ritual-card__tamil">{ritual.tamil}</p>
                  <h3>{ritual.title}</h3>
                  <p>{ritual.description}</p>
                  {ritual.details && <ul>{ritual.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section story" id="story">
          <div className="section__wide">
            <div className="section-heading" data-reveal>
              <p className="eyebrow">Meet the couple</p>
              <h2>Two cities, one story, a weekend of blessings</h2>
              <p>Rooted in tradition and connected across the places we call home - Bombay, Chennai, and the Bay Area - this celebration brings together heritage, laughter, and the people we love most.</p>
            </div>
            <div className="people-grid">
              {weddingData.people.map((person, index) => (
                <article className={`person-card person-card--${index}`} data-reveal key={person.name}>
                  <div className="person-card__image"><span>{person.imageLabel}</span></div>
                  <div className="person-card__body">
                    <p className="eyebrow">{person.role}</p>
                    <h3>{person.name}</h3>
                    <p className="person-card__location">{person.location}</p>
                    <p>{person.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section closing">
          <div className="section__narrow" data-reveal>
            <OrnamentDivider />
            <p className="eyebrow">With love & gratitude</p>
            <h2>We look forward to<br />celebrating with you</h2>
            <p>Your presence is the greatest blessing of all. We can’t wait to share these sacred days, and a lifetime of joy, with the people we hold dearest.</p>
            <p className="closing__names">Santhosh & Rithikha</p>
            <p className="closing__tamil">நன்றி · வாழ்க வளமுடன்</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
