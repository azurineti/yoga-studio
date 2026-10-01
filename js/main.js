/* =========================================================
   SATTVA — поведение страницы
   Все анимации мягкие и отключаются при prefers-reduced-motion.

   1.  Утилиты и настройки студии
   2.  Шапка и мобильное меню
   3.  Разбивка заголовков на слова
   4.  Появление блоков при прокрутке
   5.  Hero: готовность, лепестки, параллакс
   6.  Лотос: линии «рисуются» вместе с прокруткой
   7.  Расписание: фильтр по дням + «сегодня»
   8.  FAQ-аккордеон
   9.  Фото-плейсхолдеры, год
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. Утилиты и настройки ---------- */
  var STUDIO = { timeZone: "Asia/Almaty" };   // часовой пояс студии (для метки «Сегодня»)

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* ---------- 2. Шапка и меню ---------- */
  var top = $("#top");
  var burger = $("#burger");
  var menu = $("#menu");
  var hero = $("#hero");

  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  window.addEventListener("resize", function () { if (window.innerWidth > 1180) setMenu(false); });

  // активный пункт меню
  var links = $$('.top__nav a[href^="#"]');
  if (hasIO) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var s = $(a.getAttribute("href")); if (s) spy.observe(s); });
    spy.observe($("#hero"));              // на hero ни один пункт не подсвечен
  }

  /* ---------- 3. Разбивка заголовков на слова ---------- */
  function split(el) {
    var text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(/\s+/).forEach(function (word, i, arr) {
      var s = document.createElement("span");
      s.className = "w";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--wi", i);
      s.textContent = word;
      el.appendChild(s);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }
  var splitEls = $$("[data-split]");
  function splitAll() { splitEls.forEach(split); }
  splitAll();

  // при смене языка заново собираем слова и мягко проявляем их ещё раз
  document.addEventListener("langchange", function () {
    var wasIn = splitEls.map(function (el) { return el.classList.contains("is-in"); });
    splitEls.forEach(function (el) { el.classList.remove("is-in"); });
    splitAll();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        splitEls.forEach(function (el, i) { if (wasIn[i]) el.classList.add("is-in"); });
      });
    });
    markToday();
  });

  /* ---------- 4. Появление при прокрутке ---------- */
  var revealEls = $$("[data-reveal], [data-split]");
  if (hasIO && !reduce) {
    // Браузер считает элемент с clip-path «невидимым», поэтому для фото-«арок»
    // следим за родителем, а класс is-in ставим самому фото.
    var watched = [];                      // [наблюдаемый узел, [элементы для показа]]
    revealEls.forEach(function (el) {
      if (el.closest(".hero")) return;     // hero управляется отдельно
      var target = el.getAttribute("data-reveal") === "clip" ? el.parentElement : el;
      var found = null;
      for (var i = 0; i < watched.length; i++) if (watched[i][0] === target) found = watched[i];
      if (found) found[1].push(el); else watched.push([target, [el]]);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        for (var i = 0; i < watched.length; i++) {
          if (watched[i][0] === en.target) watched[i][1].forEach(function (el) { el.classList.add("is-in"); });
        }
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    watched.forEach(function (w) { io.observe(w[0]); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- 5. Hero ---------- */
  function heroReady() {
    hero.classList.add("is-ready");
    $$("[data-split]", hero).forEach(function (el) { el.classList.add("is-in"); });
  }
  if (reduce) {
    heroReady();
  } else {
    // ждём шрифты (чтобы заголовок не «прыгал»), но не дольше 900 мс
    var started = false;
    var go = function () { if (!started) { started = true; requestAnimationFrame(heroReady); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 900);
  }

  // лепестки
  var petalsBox = $("#petals");
  if (petalsBox && !reduce) {
    var count = window.innerWidth < 640 ? 7 : 13;
    var palettes = [
      ["#f8d9de", "#eab3bf"], ["#fbe5e8", "#f0c4cc"],
      ["#d3e3cd", "#a9c4a4"], ["#e6efe1", "#bfd3b9"]
    ];
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      var pal = palettes[i % palettes.length];
      var size = 10 + Math.random() * 14;
      p.className = "petal";
      p.style.setProperty("--x", (Math.random() * 96).toFixed(1) + "%");
      p.style.setProperty("--s", size.toFixed(1) + "px");
      p.style.setProperty("--dur", (16 + Math.random() * 14).toFixed(1) + "s");
      p.style.setProperty("--delay", (-Math.random() * 28).toFixed(1) + "s");
      p.style.setProperty("--sway", ((Math.random() * 120) - 60).toFixed(0) + "px");
      p.style.setProperty("--c1", pal[0]);
      p.style.setProperty("--c2", pal[1]);
      petalsBox.appendChild(p);
    }
    // экономим батарею: пауза, когда вкладка скрыта
    document.addEventListener("visibilitychange", function () {
      petalsBox.style.display = document.hidden ? "none" : "";
    });
  }

  /* ---------- 6. Скролл: параллакс и лотос ---------- */
  var parallaxEls = $$("[data-parallax]");
  var lotuses = $$(".lotus");
  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    var y = window.pageYOffset || 0;

    top.classList.toggle("is-scrolled", y > 10);
    if (!reduce && y < vh * 1.3) hero.style.setProperty("--sy", Math.round(y));

    if (!reduce) {
      parallaxEls.forEach(function (img) {
        var box = img.parentElement.getBoundingClientRect();
        var progress = (box.top + box.height / 2 - vh / 2) / (vh / 2 + box.height / 2);   // -1 … 1
        img.style.setProperty("--py", clamp(progress, -1, 1).toFixed(3));
      });
    }

    lotuses.forEach(function (svg) {
      var r = svg.getBoundingClientRect();
      var p = reduce ? 1 : clamp((vh * 0.95 - r.top) / (vh * 0.7), 0, 1);
      svg.style.setProperty("--p", p.toFixed(3));
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  frame();

  /* ---------- 7. Расписание ---------- */
  var chips = $$(".chip");
  var rows = $$("#sched-body tr");
  var DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  function todayKey() {
    try {
      var wd = new Intl.DateTimeFormat("en-US", { timeZone: STUDIO.timeZone, weekday: "short" }).format(new Date());
      var map = { Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat" };
      if (map[wd]) return map[wd];
    } catch (e) { /* старый браузер */ }
    return DAYS[new Date().getDay()];
  }
  function markToday() {
    var t = todayKey();
    rows.forEach(function (r) { r.classList.toggle("is-today", r.getAttribute("data-day") === t); });
  }
  markToday();

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var day = chip.getAttribute("data-day");
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-pressed", String(on));
      });
      var n = 0;
      rows.forEach(function (r) {
        var show = day === "all" || r.getAttribute("data-day") === day;
        r.classList.toggle("is-off", !show);
        r.classList.remove("is-new");
        if (show) {
          void r.offsetWidth;                         // перезапуск анимации
          r.style.setProperty("--rd", (n++ * 0.06) + "s");
          r.classList.add("is-new");
        }
      });
    });
  });

  /* ---------- 8. FAQ ---------- */
  var items = $$(".faq__item");
  items.forEach(function (item) {
    var btn = $(".faq__q", item);
    btn.addEventListener("click", function () {
      var open = !item.classList.contains("is-open");
      items.forEach(function (it) {
        var o = it === item ? open : false;           // одновременно открыт один ответ
        it.classList.toggle("is-open", o);
        $(".faq__q", it).setAttribute("aria-expanded", String(o));
      });
    });
  });

  /* ---------- 9. Фото и год ---------- */
  $$(".ph").forEach(function (box) {
    var img = $("img", box);
    if (!img) return;
    function missing() { box.classList.add("is-missing"); }
    img.addEventListener("error", missing);
    if (img.complete && img.naturalWidth === 0) missing();
  });

  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
