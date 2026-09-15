(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 980px)").matches;
  const header = document.querySelector(".site-header");
  const menuBtn = document.querySelector(".menu-btn");
  const nav = document.querySelector(".nav");
  const form = document.getElementById("pilot-form");
  const status = document.getElementById("form-status");
  const progressBar = document.querySelector(".scroll-progress span");
  const canvas = document.getElementById("hero-canvas");
  const ring = document.querySelector(".hud-ring");
  const mobileCta = document.getElementById("mobile-cta");
  const hero = document.querySelector(".hero");
  const markers = [...document.querySelectorAll("#hud-markers li")];

  // Split brand into chars
  document.querySelectorAll("[data-split]").forEach((el) => {
    const text = el.getAttribute("data-split") || el.textContent || "";
    el.textContent = "";
    [...text].forEach((ch, i) => {
      if (ch === " ") {
        const gap = document.createElement("span");
        gap.className = "gap";
        gap.innerHTML = "&nbsp;";
        el.appendChild(gap);
        return;
      }
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch;
      span.style.setProperty("--i", String(i));
      el.appendChild(span);
    });
  });

  // Boot screen
  const finishBoot = () => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  };

  if (reduced) finishBoot();
  else setTimeout(finishBoot, 700);

  const syncHeader = () => {
    if (!header || !hero) return;
    const heroBottom = hero.offsetTop + hero.offsetHeight;
    header.classList.toggle("on-hero", window.scrollY < heroBottom - 80);
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  };

  const onScroll = () => {
    syncHeader();
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    }
    if (mobileCta && isMobile()) {
      const nearPilot = document.getElementById("pilot");
      const rect = nearPilot ? nearPilot.getBoundingClientRect() : null;
      const inPilot = rect && rect.top < window.innerHeight * 0.75 && rect.bottom > 100;
      const pastHero = window.scrollY > window.innerHeight * 0.55;
      mobileCta.classList.toggle("is-show", pastHero && !inPilot);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  if (menuBtn && nav) {
    const closeNav = () => {
      nav.classList.remove("is-open");
      menuBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
  }

  // HUD marker cycle
  if (markers.length && !reduced) {
    let idx = 0;
    setInterval(() => {
      markers.forEach((m) => m.classList.remove("is-active"));
      idx = (idx + 1) % markers.length;
      markers[idx].classList.add("is-active");
    }, 1600);
  }

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const animateCount = (el, target, duration = 1600, decimals = 0, suffix = "") => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = `${(target * easeOut(p)).toFixed(decimals)}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const parseCount = (el) => {
    const raw = el.getAttribute("data-count") || "0";
    return {
      target: Number(raw),
      decimals: raw.includes(".") ? raw.split(".")[1].length : 0,
      suffix: el.getAttribute("data-suffix") || "",
    };
  };

  const revealNodes = document.querySelectorAll("[data-reveal]");
  revealNodes.forEach((el) => {
    el.style.setProperty("--stagger", el.getAttribute("data-stagger") || "0");
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll("[data-count]").forEach((node) => {
          if (node.dataset.counted) return;
          node.dataset.counted = "1";
          const { target, decimals, suffix } = parseCount(node);
          animateCount(node, target, isMobile() ? 1200 : 1500, decimals, suffix);
        });
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: isMobile() ? 0.12 : 0.18, rootMargin: "0px 0px -6% 0px" }
  );
  revealNodes.forEach((el) => revealObserver.observe(el));

  const indexValue = document.querySelector(".index-value");
  if (indexValue) {
    const indexObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (ring) ring.classList.add("is-on");
          if (!indexValue.dataset.counted) {
            indexValue.dataset.counted = "1";
            const { target, decimals, suffix } = parseCount(indexValue);
            animateCount(indexValue, target, 1700, decimals, suffix);
          }
          indexObserver.disconnect();
        });
      },
      { threshold: 0.35 }
    );
    indexObserver.observe(indexValue);
  }

  // Hero canvas — tuned for mobile performance
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    let raf = 0;
    let mx = 0.65;
    let my = 0.4;
    let bars = 64;
    let phases = new Float32Array(bars);

    const rebuild = () => {
      bars = isMobile() ? 36 : 72;
      phases = Float32Array.from({ length: bars }, () => Math.random() * Math.PI * 2);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    };

    const roundRect = (x, y, width, height, r) => {
      const rr = Math.min(r, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + width, y, x + width, y + height, rr);
      ctx.arcTo(x + width, y + height, x, y + height, rr);
      ctx.arcTo(x, y + height, x, y, rr);
      ctx.arcTo(x, y, x + width, y, rr);
      ctx.closePath();
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);

      const mobile = isMobile();
      const fieldX = mobile ? w * 0.06 : w * 0.42;
      const fieldW = mobile ? w * 0.88 : w * 0.56;
      const midY = mobile ? h * 0.28 : h * (0.38 + my * 0.06);
      const gap = mobile ? 3 : 5;
      const barW = (fieldW - gap * (bars - 1)) / bars;
      const ampBase = mobile ? h * 0.22 : h * 0.34;

      for (let i = 0; i < bars; i += 1) {
        const focus = 1 - Math.min(Math.abs(i / bars - 0.5) * 1.8, 1);
        const n1 = Math.sin(t * 0.002 + phases[i]);
        const n2 = Math.sin(t * 0.0034 + i * 0.3);
        const breath = 0.3 + 0.7 * ((n1 + 1) / 2) * (0.4 + 0.6 * ((n2 + 1) / 2));
        const amp = Math.max(14, breath * ampBase * (0.4 + focus * 0.95));
        const x = fieldX + i * (barW + gap);
        const y = midY - amp / 2;
        const grad = ctx.createLinearGradient(0, y, 0, y + amp);
        grad.addColorStop(0, "rgba(183, 235, 228, 0.95)");
        grad.addColorStop(0.5, "rgba(26, 166, 160, 0.8)");
        grad.addColorStop(1, "rgba(13, 92, 99, 0.2)");
        ctx.fillStyle = grad;
        roundRect(x, y, Math.max(2, barW), amp, Math.min(7, barW));
        ctx.fill();
      }

      if (!mobile) {
        const cx = w * 0.72;
        const cy = h * 0.46;
        for (let r = 90; r <= 220; r += 65) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(183, 235, 228, 0.09)";
          ctx.setLineDash([4, 10]);
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      const scanX = fieldX + ((t * (mobile ? 0.08 : 0.05)) % fieldW);
      const scanGrad = ctx.createLinearGradient(scanX - 30, 0, scanX + 30, 0);
      scanGrad.addColorStop(0, "rgba(26, 166, 160, 0)");
      scanGrad.addColorStop(0.5, "rgba(26, 166, 160, 0.22)");
      scanGrad.addColorStop(1, "rgba(26, 166, 160, 0)");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(scanX - 30, midY - ampBase, 60, ampBase * 2);

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);

    if (!reduced) {
      raf = requestAnimationFrame(draw);
      window.addEventListener(
        "pointermove",
        (e) => {
          mx = e.clientX / window.innerWidth;
          my = e.clientY / window.innerHeight;
        },
        { passive: true }
      );
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) cancelAnimationFrame(raf);
        else raf = requestAnimationFrame(draw);
      });
    } else {
      draw(0);
    }
  }

  // Magnetic only on fine pointers / desktop
  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (event) => {
        const rect = btn.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.14}px, ${y * 0.18}px)`;
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "";
      });
    });
  }

  if (form && status) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const clinic = String(data.get("clinic") || "").trim();
      const email = String(data.get("email") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const volume = String(data.get("volume") || "").trim();
      const notes = String(data.get("notes") || "").trim();
      const body = [
        `Clinic: ${clinic}`,
        `Email: ${email}`,
        `Phone: ${phone || "—"}`,
        `Visits/week: ${volume || "—"}`,
        "",
        notes || "No extra notes.",
      ].join("\n");
      status.textContent = "Opening your email client with the pilot request…";
      window.location.href = `mailto:pilot@sevensquares.clinic?subject=${encodeURIComponent(
        `Pilot request — ${clinic}`
      )}&body=${encodeURIComponent(body)}`;
      form.reset();
    });
  }
})();
