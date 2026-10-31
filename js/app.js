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
  }

  /* ---------- Ссылка на текущую страницу (логотип, пункт меню) — плавно наверх без перезагрузки ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || a.target === "_blank") return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- Появление при прокрутке + счётчики ---------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  /* ---------- Подбор формата (воинский учёт) ---------- */
  var quiz = document.querySelector("[data-quiz]");
  if (quiz) {
    var res = quiz.querySelector("[data-quiz-res]");
    var list = res.querySelector("ul");
    var empty = res.querySelector(".quiz__empty");
    var go = res.querySelector("[data-quiz-go]");
    var rec = {
      none: ["Постановка на воинский учёт с нуля", "Ведение — чтобы учёт дальше вёлся без вас"],
      messy: ["Аудит воинского учёта — отчёт с рисками и планом", "Ведение — чтобы порядок не развалился снова"],
      check: ["Годовая сверка с военкоматом", "Проверка документов перед сверкой"],
      keep: ["Ведение воинского учёта — оплата только за события, без абонентской платы"]
    };
    function render() {
      var sit = quiz.querySelector("input[name=q_sit]:checked");
      var size = quiz.querySelector("input[name=q_size]:checked");
      var city = quiz.querySelector("input[name=q_city]:checked");
      if (!sit) { list.innerHTML = ""; empty.hidden = false; go.hidden = true; return; }
      var items = rec[sit.value].slice();
      if (city) {
        items.push(city.value === "msk"
          ? "Документы готовлю онлайн, в военкомат в СПб еду сама, в Москве — мой проверенный специалист"
          : "Всё онлайн: документы готовлю и согласую удалённо");
      }
      list.innerHTML = items.map(function (s) { return "<li>" + s + "</li>"; }).join("");
      empty.hidden = true; go.hidden = false;
      var parts = [sit.parentNode.textContent.trim()];
      if (size) parts.push("сотрудников: " + size.parentNode.textContent.trim());
      if (city) parts.push(city.parentNode.textContent.trim());
      go.setAttribute("data-prefill", "Подбор: " + parts.join("; "));
    }
    quiz.addEventListener("change", render);
    go.addEventListener("click", function () {
      var msg = document.querySelector("#lead textarea");
      if (msg) msg.value = go.getAttribute("data-prefill");
    });
    render();
  }

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
        var first = form.querySelector(".is-err input, .is-err");
        if (first && first.focus) first.focus();
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.page = location.pathname;
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Отправляю…";
      var endpoint = form.getAttribute("data-endpoint");
      var done = function () {
        if (window.ym && window.HR_METRIKA) window.ym(window.HR_METRIKA, "reachGoal", "lead");
        location.href = (window.HR_BASE || "/") + "spasibo/";
      };
      if (!endpoint) { setTimeout(done, 500); return; }
      var payload = {
        access_key: form.getAttribute("data-key"),
        subject: "Заявка с сайта HRвДеле" + (data.service ? " — " + data.service : ""),
        from_name: "Сайт HRвДеле",
        "Имя": data.name,
        "Телефон или Telegram": data.contact,
        "Услуга": data.service || "—",
        "Сообщение": data.message || "—",
        "Страница": location.href.split("?")[0],
        "Согласие на обработку ПД": "да"
      };
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j.success) throw new Error(j.message); done(); })
        .catch(function () {
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

  /* Кнопки «Узнать цену» подставляют услугу в форму */
  document.querySelectorAll("[data-service]").forEach(function (a) {
    a.addEventListener("click", function () {
      var msg = document.querySelector("#lead textarea");
      if (msg && !msg.value) msg.value = "Интересует: " + a.getAttribute("data-service");
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
