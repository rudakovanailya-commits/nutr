(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    document.documentElement.classList.add("js-reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );
    $$(".reveal-on-scroll").forEach((el) => io.observe(el));
  } else {
    $$(".reveal-on-scroll").forEach((el) => el.classList.add("is-visible"));
  }

  const burger = $(".burger");
  const mobileNav = $(".mobile-nav");
  if (burger && mobileNav) {
    burger.addEventListener("click", () => {
      const isOpen = mobileNav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(isOpen));
    });
    $$(".mobile-nav a").forEach((a) => {
      a.addEventListener("click", () => {
        mobileNav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  function normalizeTel(str) {
    const plus = str.trim().startsWith("+") ? "+" : "";
    const digits = str.replace(/[^\d]/g, "");
    return plus + digits;
  }

  function showStatus(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function setupDemoForm(formEl, statusEl) {
    if (!formEl) return;
    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(formEl);
      const name = String(fd.get("name") || "").trim();
      const contact = String(fd.get("contact") || "").trim();
      const goal = String(fd.get("goal") || "").trim();

      if (!name || !contact) {
        showStatus(statusEl, "Проверьте поля: имя и контакт обязательны.");
        return;
      }

      const consentEl = formEl.querySelector('input[name="consent"][type="checkbox"]');
      if (consentEl && !consentEl.checked) {
        showStatus(statusEl, "Отметьте согласие на обработку персональных данных.");
        return;
      }

      const tel = normalizeTel(contact);
      const message = goal
        ? `Спасибо, ${name}! Заявка получена. Цель: ${goal}. (демо) Тел: ${tel}`
        : `Спасибо, ${name}! Заявка получена. (демо) Тел: ${tel}`;

      showStatus(statusEl, message);
      formEl.reset();
    });
  }

  setupDemoForm($("#leadForm"), $("#formStatus"));
  setupDemoForm($("#contactForm"), $("#contactStatus"));

  $$('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    a.addEventListener("click", (e) => {
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
