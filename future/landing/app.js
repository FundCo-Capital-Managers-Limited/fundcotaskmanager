/* -----------------------------------------------------
   FUNDCO AI FUTURE - landing app
----------------------------------------------------- */

const params = new URLSearchParams(window.location.search);

const futureConfig = {
  userAppUrl: params.get("user") || "https://www.fundcoai.com",
  adminAppUrl: params.get("admin") || "https://admin.fundcoai.com",
  financeAppUrl: params.get("finance") || "https://finance.fundcoai.com",
  themeStorageKey: "fundco-ai-theme",
  homeUrl: "./index.html",
  platformsUrl: "./platforms.html",
};

const root = document.documentElement;
const toggleBtn = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");

function applyTheme(theme) {
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  root.setAttribute("data-theme", resolvedTheme);
  localStorage.setItem(futureConfig.themeStorageKey, resolvedTheme);

  if (toggleBtn) {
    toggleBtn.setAttribute("aria-pressed", String(resolvedTheme === "dark"));
  }

  if (themeLabel) {
    themeLabel.textContent = resolvedTheme === "dark" ? "Dark" : "Light";
  }
}

applyTheme(localStorage.getItem(futureConfig.themeStorageKey) || "light");

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}

function setLinks(selector, href) {
  document.querySelectorAll(selector).forEach((element) => {
    element.setAttribute("href", href);
  });
}

setLinks('[data-link="user"]', futureConfig.userAppUrl);
setLinks('[data-link="admin"]', futureConfig.adminAppUrl);
setLinks('[data-link="finance"]', futureConfig.financeAppUrl);
setLinks('[data-link="home"]', futureConfig.homeUrl);
setLinks('[data-link="platforms"]', futureConfig.platformsUrl);

document.querySelectorAll("[data-scroll]").forEach((element) => {
  element.addEventListener("click", () => {
    const target = document.querySelector(element.getAttribute("data-scroll"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

const yearNode = document.querySelector("[data-year]");
if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

function initReveal() {
  const revealEls = document.querySelectorAll(
    ".pillar, .ptile, .loop-step, .rm-item, .acard, .proof-card, .state-block, .platform-card, .capability-card, .coming-item, .platforms-panel"
  );

  if (!revealEls.length) {
    return;
  }

  const css = document.createElement("style");
  css.textContent = `
    .reveal-ready {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 500ms ease, transform 500ms ease;
    }
    .reveal-ready.revealed {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(css);

  revealEls.forEach((element) => element.classList.add("reveal-ready"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const parent = entry.target.parentElement;
        const siblings = parent ? [...parent.querySelectorAll(".reveal-ready")] : [entry.target];
        const index = siblings.indexOf(entry.target);
        const delay = Math.min(index * 60, 360);

        window.setTimeout(() => {
          entry.target.classList.add("revealed");
        }, delay);

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
  );

  revealEls.forEach((element) => observer.observe(element));
}

function initNavActive() {
  const sections = document.querySelectorAll("section[id]");
  const links = document.querySelectorAll(".nav-link");

  if (!sections.length || !links.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const id = entry.target.getAttribute("id");
        links.forEach((link) => {
          link.classList.toggle("nav-active", link.getAttribute("href") === `#${id}`);
        });
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

function initProgressBars() {
  const bars = document.querySelectorAll(".ptile-fill");
  if (!bars.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const bar = entry.target;
        const targetWidth = bar.style.width;
        bar.style.width = "0%";

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bar.style.width = targetWidth;
          });
        });

        observer.unobserve(bar);
      });
    },
    { threshold: 0.5 }
  );

  bars.forEach((bar) => observer.observe(bar));
}

function initHeroBar() {
  const bar = document.querySelector(".hero-accent-bar");
  if (!bar) {
    return;
  }

  bar.style.height = "0%";
  bar.style.transition = "height 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bar.style.height = "100%";
    });
  });
}

const navStyle = document.createElement("style");
navStyle.textContent = `
  .nav-active {
    color: var(--t0) !important;
  }
  .nav-active::after {
    transform: scaleX(1) !important;
  }
`;
document.head.appendChild(navStyle);

if ("IntersectionObserver" in window) {
  initReveal();
  initNavActive();
  initProgressBars();
}

initHeroBar();
