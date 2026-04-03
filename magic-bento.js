/**
 * MagicBento-эффекты для статического сайта (без React / GSAP).
 */
(function () {
  const MOBILE_BREAKPOINT = 768;
  const DEFAULT_SPOTLIGHT_RADIUS = 400;
  const DEFAULT_PARTICLE_COUNT = 12;
  const GLOW_RGB = "142, 111, 130";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function shouldRun() {
    return !reduceMotion && !isMobile();
  }

  function calculateSpotlightValues(radius) {
    return {
      proximity: radius * 0.5,
      fadeDistance: radius * 0.75,
    };
  }

  function updateCardGlowProperties(card, mouseX, mouseY, glow, radius) {
    const rect = card.getBoundingClientRect();
    const relativeX = ((mouseX - rect.left) / rect.width) * 100;
    const relativeY = ((mouseY - rect.top) / rect.height) * 100;
    card.style.setProperty("--glow-x", `${relativeX}%`);
    card.style.setProperty("--glow-y", `${relativeY}%`);
    card.style.setProperty("--glow-intensity", String(glow));
    card.style.setProperty("--glow-radius", `${radius}px`);
  }

  function ensureSpotlightLayer(section) {
    let layer = section.querySelector(":scope > .bento-spotlight-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "bento-spotlight-layer";
      layer.setAttribute("aria-hidden", "true");
      section.insertBefore(layer, section.firstChild);
    }
    let ball = layer.querySelector(".bento-local-spotlight");
    if (!ball) {
      ball = document.createElement("div");
      ball.className = "bento-local-spotlight";
      layer.appendChild(ball);
    }
    return ball;
  }

  function ensureShineLayer(card) {
    let shine = card.querySelector(":scope > .magic-bento-card__shine");
    if (!shine) {
      shine = document.createElement("div");
      shine.className = "magic-bento-card__shine";
      shine.setAttribute("aria-hidden", "true");
      card.insertBefore(shine, card.firstChild);
    }
    return shine;
  }

  function createParticle(x, y) {
    const el = document.createElement("div");
    el.className = "particle";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    return el;
  }

  const cardParticleState = new WeakMap();

  function getCardParticleState(card) {
    if (!cardParticleState.has(card)) {
      cardParticleState.set(card, { timeouts: [], anims: [] });
    }
    return cardParticleState.get(card);
  }

  function clearCardParticles(card) {
    const st = getCardParticleState(card);
    st.timeouts.forEach((id) => clearTimeout(id));
    st.timeouts.length = 0;
    st.anims.forEach((a) => {
      try {
        a.cancel();
      } catch (_) {}
    });
    st.anims.length = 0;
    const shine = card.querySelector(".magic-bento-card__shine");
    if (shine) shine.querySelectorAll(".particle").forEach((p) => p.remove());
  }

  function spawnParticles(card) {
    if (!shouldRun()) return;
    clearCardParticles(card);
    const st = getCardParticleState(card);
    const shine = ensureShineLayer(card);
    const rect = card.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    for (let i = 0; i < DEFAULT_PARTICLE_COUNT; i++) {
      const t = setTimeout(() => {
        if (!card.matches(":hover")) return;
        const p = createParticle(Math.random() * w, Math.random() * h);
        shine.appendChild(p);

        p.animate([{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], {
          duration: 280,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          fill: "forwards",
        });

        const dx = (Math.random() - 0.5) * 100;
        const dy = (Math.random() - 0.5) * 100;
        st.anims.push(
          p.animate(
            [
              { transform: "translate(0,0) rotate(0deg)" },
              { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 180}deg)` },
              { transform: `translate(${-dx * 0.4}px,${-dy * 0.4}px) rotate(0deg)` },
            ],
            {
              duration: 2200 + Math.random() * 1800,
              iterations: Infinity,
              direction: "alternate",
              easing: "ease-in-out",
            }
          ),
          p.animate([{ opacity: 1 }, { opacity: 0.28 }, { opacity: 0.85 }], {
            duration: 1600,
            iterations: Infinity,
            direction: "alternate",
            easing: "ease-in-out",
          })
        );
      }, i * 90);
      st.timeouts.push(t);
    }
  }

  function fadeOutParticles(card) {
    const shine = card.querySelector(".magic-bento-card__shine");
    if (!shine) return;
    const st = getCardParticleState(card);
    st.timeouts.forEach((id) => clearTimeout(id));
    st.timeouts.length = 0;
    st.anims.forEach((a) => {
      try {
        a.cancel();
      } catch (_) {}
    });
    st.anims.length = 0;

    shine.querySelectorAll(".particle").forEach((p) => {
      const out = p.animate(
        [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0)", opacity: 0 }],
        { duration: 280, easing: "cubic-bezier(0.36, 0, 0.66, -0.56)" }
      );
      out.onfinish = () => p.remove();
    });
  }

  function onCardClick(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const maxDistance = Math.max(
      Math.hypot(x, y),
      Math.hypot(x - rect.width, y),
      Math.hypot(x, y - rect.height),
      Math.hypot(x - rect.width, y - rect.height)
    );
    const ripple = document.createElement("div");
    ripple.className = "magic-bento-ripple";
    const size = maxDistance * 2;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x - maxDistance}px`;
    ripple.style.top = `${y - maxDistance}px`;
    card.appendChild(ripple);

    const anim = ripple.animate(
      [{ transform: "scale(0)", opacity: 1 }, { transform: "scale(1)", opacity: 0 }],
      { duration: 750, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
    anim.onfinish = () => ripple.remove();
  }

  const spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS;
  const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);

  /** @type {{ section: Element, ball: HTMLElement, cards: Element[] }[]} */
  let registry = [];
  let started = false;

  function onGlobalMouseMove(e) {
    if (!shouldRun()) return;
    registry.forEach(({ section, ball, cards }) => {
      const rect = section.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (!inside) {
        ball.style.opacity = "0";
        cards.forEach((c) => c.style.setProperty("--glow-intensity", "0"));
        return;
      }

      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      ball.style.left = `${localX}px`;
      ball.style.top = `${localY}px`;

      let minDistance = Infinity;
      cards.forEach((cardEl) => {
        const cr = cardEl.getBoundingClientRect();
        const cx = cr.left + cr.width / 2;
        const cy = cr.top + cr.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(cr.width, cr.height) / 2;
        const effective = Math.max(0, dist);
        minDistance = Math.min(minDistance, effective);

        let glowIntensity = 0;
        if (effective <= proximity) glowIntensity = 1;
        else if (effective <= fadeDistance)
          glowIntensity = (fadeDistance - effective) / (fadeDistance - proximity);

        updateCardGlowProperties(cardEl, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      let targetOp = 0;
      if (minDistance <= proximity) targetOp = 0.75;
      else if (minDistance <= fadeDistance)
        targetOp = ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.75;

      ball.style.opacity = String(targetOp);
    });
  }

  function onGlobalMouseLeave() {
    registry.forEach(({ ball, cards }) => {
      ball.style.opacity = "0";
      cards.forEach((c) => c.style.setProperty("--glow-intensity", "0"));
    });
  }

  /* Снять слушатели корректно: одна ссылка на обработчик */
  const cardHandlers = new WeakMap();

  function bindCard(card) {
    const stars = card.classList.contains("magic-bento-card--stars");
    const enter = stars ? () => spawnParticles(card) : () => {};
    const leave = stars ? () => fadeOutParticles(card) : () => {};
    cardHandlers.set(card, { enter, leave, stars });
    card.addEventListener("mouseenter", enter);
    card.addEventListener("mouseleave", leave);
    card.addEventListener("click", onCardClick);
  }

  function unbindCard(card) {
    const h = cardHandlers.get(card);
    if (!h) return;
    card.removeEventListener("mouseenter", h.enter);
    card.removeEventListener("mouseleave", h.leave);
    card.removeEventListener("click", onCardClick);
    cardHandlers.delete(card);
    clearCardParticles(card);
  }

  function startFixed() {
    if (started) return;
    if (!shouldRun()) {
      document.documentElement.classList.add("magic-bento-off");
      return;
    }

    document.documentElement.classList.remove("magic-bento-off");
    registry = [];

    document.querySelectorAll(".bento-magic-section").forEach((section) => {
      section.style.setProperty("--magic-glow-rgb", GLOW_RGB);
      const ball = ensureSpotlightLayer(section);
      const cards = Array.from(section.querySelectorAll(".magic-bento-card"));
      registry.push({ section, ball, cards });
      cards.forEach(bindCard);
    });

    document.addEventListener("mousemove", onGlobalMouseMove, { passive: true });
    document.addEventListener("mouseleave", onGlobalMouseLeave);
    started = true;
  }

  function stopFixed() {
    if (!started) return;
    document.removeEventListener("mousemove", onGlobalMouseMove);
    document.removeEventListener("mouseleave", onGlobalMouseLeave);
    document.documentElement.classList.add("magic-bento-off");

    registry.forEach(({ cards }) => {
      cards.forEach(unbindCard);
    });
    registry = [];
    started = false;
  }

  window.addEventListener(
    "resize",
    () => {
      if (shouldRun()) startFixed();
      else stopFixed();
    },
    { passive: true }
  );

  if (shouldRun()) startFixed();
  else document.documentElement.classList.add("magic-bento-off");
})();
