/* HRвДеле — интерактив сайта */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var shot = /[?&]shot\b/.test(location.search);
  if (shot) doc.classList.add("shot");

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Меню на телефоне ---------- */
  var burger = document.querySelector(".burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var open = doc.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".mnav a").forEach(function (a) {
      a.addEventListener("click", function () {
        doc.classList.remove("menu-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !doc.classList.contains("menu-open")) return;
      doc.classList.remove("menu-open");
      burger.setAttribute("aria-expanded", "false");
      burger.focus();
    });
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Плавная прокрутка ----------
     1) Кнопки и ссылки на блоки этой же страницы (#lead, #ceny…) и логотип — плавно едут к месту
        на любом устройстве: телефон, планшет, ПК.
     2) Колёсико мыши на ПК — мягкая докрутка. Палец на телефоне и тачпад — родная прокрутка
        устройства, она уже плавная и с инерцией: её не подменяем, иначе будет «вязко». */
  var sRaf = 0, sCur = 0, sTarget = 0, aRaf = 0;
  var maxY = function () { return document.documentElement.scrollHeight - innerHeight; };
  var jump = function (y) { window.scrollTo({ top: y, behavior: "instant" }); };
  var stopAll = function () {
    if (sRaf) { cancelAnimationFrame(sRaf); sRaf = 0; }
    if (aRaf) { cancelAnimationFrame(aRaf); aRaf = 0; }
  };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function smoothTo(y) {
    stopAll();
    y = Math.max(0, Math.min(maxY(), Math.round(y)));
    var from = scrollY, dist = y - from;
    if (reduce || Math.abs(dist) < 2) { jump(y); return; }
    // Чем дальше, тем дольше, но не дольше 1,1 с
    var dur = Math.min(1100, 450 + Math.abs(dist) * 0.12), t0 = 0;
    var step = function (t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      jump(from + dist * ease(p));
      aRaf = p < 1 ? requestAnimationFrame(step) : 0;
    };
    aRaf = requestAnimationFrame(step);
    // Страховка: если анимация не пошла (вкладка в фоне, экономия батареи) — всё равно доезжаем
    setTimeout(function () { if (!t0) { stopAll(); jump(y); } }, 300);
  }
  // Отступ сверху под липкую шапку (тот же, что scroll-padding-top в стилях)
  var headOffset = function () { return parseFloat(getComputedStyle(doc).scrollPaddingTop) || 0; };

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || a.target === "_blank") return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    var el = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
    if (url.hash && !el) return;
    e.preventDefault();
    smoothTo(el ? el.getBoundingClientRect().top + scrollY - headOffset() : 0);
    if (url.hash && location.hash !== url.hash) history.pushState(null, "", url.hash);
    else if (!url.hash && location.hash) history.pushState(null, "", url.pathname + url.search);
  });

  if (!reduce && !shot && window.matchMedia("(pointer: fine)").matches) {
    // Прокрутка внутри своих областей (текст в форме, лента отзывов, меню) — не трогаем
    var ownScroll = function (el, dy) {
      for (; el && el !== document.body && el !== doc; el = el.parentElement) {
        var oy = getComputedStyle(el).overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
          if ((dy < 0 && el.scrollTop > 0) || (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
        }
      }
      return false;
    };
    var sStep = function () {
      sCur += (sTarget - sCur) * 0.11;
      if (Math.abs(sTarget - sCur) < 0.5) { sCur = sTarget; sRaf = 0; }
      jump(sCur);
      if (sRaf) sRaf = requestAnimationFrame(sStep);
    };
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      var dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
      // Мелкие шаги — это тачпад, он и так плавный
      if (e.deltaMode === 0 && Math.abs(dy) < 40 && !sRaf) { if (aRaf) stopAll(); return; }
      if (ownScroll(e.target, dy)) return;
      e.preventDefault();
      if (aRaf) { cancelAnimationFrame(aRaf); aRaf = 0; }
      if (!sRaf) { sCur = sTarget = scrollY; }
      sTarget = Math.max(0, Math.min(maxY(), sTarget + dy));
      if (!sRaf) sRaf = requestAnimationFrame(sStep);
    }, { passive: false });
  } else {
    // Без своей докрутки колёсиком: прокрутка пользователем просто останавливает переезд к блоку
    window.addEventListener("wheel", function () { if (aRaf) stopAll(); }, { passive: true });
  }
  // Палец, клавиши, перетаскивание ползунка — человек сам управляет прокруткой
  ["mousedown", "keydown", "touchstart"].forEach(function (t) {
    window.addEventListener(t, stopAll, { passive: true });
  });

  /* ---------- Появление при прокрутке + счётчики ---------- */
  function countUp(el) {
    var raw = el.getAttribute("data-count");
    var target = parseInt(raw, 10);
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce || shot || !target || target >= 1900) { return; }
    var start = null, dur = 1100;
    function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    el.textContent = "0" + suffix;
    requestAnimationFrame(tick);
  }
  var els = document.querySelectorAll(".rv-in, .stats, [data-count]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        if (e.target.hasAttribute("data-count")) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Отзывы: стрелки и «читать полностью» ---------- */
  document.querySelectorAll(".reviews").forEach(function (box) {
    var track = box.querySelector(".rv-track");
    var prev = box.querySelector("[data-rv-prev]");
    var next = box.querySelector("[data-rv-next]");
    function step() {
      var card = track.querySelector(".rv");
      return card ? card.getBoundingClientRect().width + 16 : track.clientWidth;
    }
    function upd() {
      if (!prev) return;
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    }
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
    track.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  });
  document.querySelectorAll(".rv__text").forEach(function (t) {
    t.classList.add("is-clamped");
    var btn = t.nextElementSibling;
    if (!btn || !btn.classList.contains("rv__more")) return;
    if (t.scrollHeight <= t.clientHeight + 4) { btn.remove(); return; }
    btn.addEventListener("click", function () {
      var clamped = t.classList.toggle("is-clamped");
      btn.textContent = clamped ? "Читать полностью" : "Свернуть";
    });
  });

  /* ---------- Формы заявки ---------- */
  var PHONE = /[\d]{6,}/;
  document.querySelectorAll("form[data-lead]").forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var ok = true;
      form.querySelectorAll("[data-req]").forEach(function (inp) {
        var f = inp.closest(".field");
        var v = inp.value.trim();
        var bad = !v || (inp.name === "contact" && !PHONE.test(v.replace(/\D/g, "")) && v.indexOf("@") !== 0 && !/t\.me\//.test(v));
        f.classList.toggle("is-err", bad);
        if (bad) ok = false;
      });
      var consent = form.querySelector("input[name=consent]");
      consent.closest(".consent").classList.toggle("is-err", !consent.checked);
      if (!consent.checked) ok = false;
      if (!ok) {
        var first = form.querySelector(".is-err input, .is-err textarea");
        if (first && first.focus) first.focus();
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.page = location.href.split("?")[0];
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Отправляю…";
      var endpoint = form.getAttribute("data-endpoint");
      var done = function () {
        if (window.ym && window.HR_METRIKA) window.ym(window.HR_METRIKA, "reachGoal", "lead");
        location.href = (window.HR_BASE || "/") + "spasibo/";
      };
      if (!endpoint) { setTimeout(done, 500); return; }
      // Если сервер не ответил за 15 секунд — показываем ошибку, а не вечное «Отправляю…»
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 15000);
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data), signal: ctrl && ctrl.signal })
        .then(function (r) { return r.json(); })
        .then(function (j) { clearTimeout(timer); if (!j.ok) throw new Error(j.error); done(); })
        .catch(function () {
          clearTimeout(timer);
          btn.disabled = false; btn.textContent = "Отправить заявку";
          alert("Не получилось отправить заявку. Напишите мне в Telegram или WhatsApp, позвоните или отправьте письмо на s.krasovskaya22@yandex.ru — отвечу.");
        });
    });
    form.querySelectorAll("input, textarea").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var f = inp.closest(".field, .consent");
        if (f) f.classList.remove("is-err");
      });
    });
  });

  /* Кнопки «Узнать цену» и карточки ситуаций подставляют услугу в форму.
     Свой текст человека не трогаем — заменяем только то, что подставили сами. */
  var autoMsg = "";
  document.querySelectorAll("[data-service]").forEach(function (a) {
    a.addEventListener("click", function () {
      var msg = document.querySelector("#lead textarea");
      if (!msg || (msg.value && msg.value !== autoMsg)) return;
      msg.value = autoMsg = "Интересует: " + a.getAttribute("data-service");
    });
  });

  /* ---------- Плавающая кнопка на телефоне ---------- */
  var fab = document.querySelector(".fab");
  var hero = document.querySelector(".hero");
  var lead = document.getElementById("lead");
  if (fab && hero && "IntersectionObserver" in window) {
    var heroVis = true, leadVis = false;
    var sync = function () { fab.classList.toggle("is-on", !heroVis && !leadVis && !cookieOn()); };
    new IntersectionObserver(function (e) { heroVis = e[0].isIntersecting; sync(); }).observe(hero);
    if (lead) new IntersectionObserver(function (e) { leadVis = e[0].isIntersecting; sync(); }).observe(lead);
    window.addEventListener("hr:cookie", sync);
  }

  /* ---------- Cookie и Метрика (только после согласия) ---------- */
  var bar = document.querySelector(".cookie");
  function cookieOn() { return bar && bar.classList.contains("is-on"); }
  function loadMetrika() {
    var id = window.HR_METRIKA;
    if (!id || /^(localhost|127\.|\[::1\])/.test(location.hostname)) return;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(id, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  }
  if (bar) {
    var choice = store.get("hr_cookie");
    if (choice === "all") loadMetrika();
    if (!choice) bar.classList.add("is-on");
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cookie]");
      if (!b) return;
      var v = b.getAttribute("data-cookie");
      store.set("hr_cookie", v);
      bar.classList.remove("is-on");
      if (v === "all") loadMetrika();
      window.dispatchEvent(new Event("hr:cookie"));
    });
  }

  /* Год в подвале */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
