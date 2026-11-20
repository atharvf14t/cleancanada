/* CleanCanada interactions: menu, scroll state, comparison sliders, quote form, fade-up. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function boot(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error("CleanCanada:", name, err);
    }
  }

  boot("header", function () {
    var header = document.querySelector(".site-header");
    if (!header) return;

    function onScroll() {
      header.classList.toggle("is-solid", window.scrollY > 12);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  });

  boot("menu", function () {
    var header = document.querySelector(".site-header");
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!header || !toggle || !nav) return;

    function setOpen(open) {
      header.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) {
        var full = nav.scrollHeight;
        nav.style.maxHeight = full > 0 ? full + "px" : "";
      } else {
        nav.style.maxHeight = nav.getBoundingClientRect().height + "px";
        window.requestAnimationFrame(function () {
          nav.style.maxHeight = "0px";
        });
      }
    }

    window.matchMedia("(min-width: 1100px)").addEventListener("change", function (event) {
      if (!event.matches) return;
      header.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      nav.style.maxHeight = "";
    });

    toggle.addEventListener("click", function () {
      setOpen(!header.classList.contains("is-open"));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && header.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  });

  boot("scroll", function () {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (event) {
        var id = link.getAttribute("href");
        if (!id || id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    });
  });

  boot("reveal", function () {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    function show(el) {
      el.classList.add("is-in");
    }

    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(show);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          show(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  });

  /* Before/after: drag with mouse or touch, and arrow keys when focused. */
  boot("compare", function () {
    document.querySelectorAll("[data-compare]").forEach(function (frame) {
      var before = frame.querySelector(".ba-before");
      var line = frame.querySelector(".ba-line");
      var handle = frame.querySelector(".ba-handle");
      var value = 50;
      var dragging = false;

      function paint(next) {
        value = Math.max(0, Math.min(100, next));
        var shown = value;
        before.style.clipPath = "inset(0 " + (100 - shown) + "% 0 0)";
        line.style.left = shown + "%";
        handle.style.left = shown + "%";
        var rounded = String(Math.round(shown));
        frame.setAttribute("aria-valuenow", rounded);
        frame.setAttribute("aria-valuetext", rounded + " percent before");
      }

      function fromX(clientX) {
        var rect = frame.getBoundingClientRect();
        if (!rect.width) return;
        paint(((clientX - rect.left) / rect.width) * 100);
      }

      frame.addEventListener("pointerdown", function (event) {
        if (event.button !== undefined && event.button !== 0) return;
        dragging = true;
        frame.setPointerCapture(event.pointerId);
        frame.focus({ preventScroll: true });
        fromX(event.clientX);
      });

      frame.addEventListener("pointermove", function (event) {
        if (!dragging) return;
        fromX(event.clientX);
      });

      function endDrag(event) {
        if (!dragging) return;
        dragging = false;
        if (frame.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
      }

      frame.addEventListener("pointerup", endDrag);
      frame.addEventListener("pointercancel", endDrag);

      frame.addEventListener("keydown", function (event) {
        var step = event.shiftKey ? 10 : 5;
        var next = null;
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = value - step;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") next = value + step;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = 100;
        if (next === null) return;
        event.preventDefault();
        paint(next);
      });

      paint(50);
    });
  });

  boot("form", function () {
    var form = document.getElementById("quote-form");
    var success = document.getElementById("form-success");
    if (!form || !success) return;

    var rules = {
      name: function (value) {
        return value.trim().length < 2 ? "Please enter your name." : "";
      },
      email: function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? "" : "Enter a valid email address.";
      },
      phone: function (value) {
        var digits = value.replace(/\D/g, "");
        return digits.length < 10 || digits.length > 15 ? "Enter a phone number with at least 10 digits." : "";
      },
      service: function (value) {
        return value ? "" : "Please choose a service.";
      }
    };

    function setError(input, message) {
      var field = input.closest(".field");
      var error = field ? field.querySelector(".field-error") : null;
      if (!field || !error) return;
      if (message) {
        field.classList.add("is-invalid");
        input.setAttribute("aria-invalid", "true");
        error.hidden = false;
        error.textContent = message;
      } else {
        field.classList.remove("is-invalid");
        input.removeAttribute("aria-invalid");
        error.hidden = true;
        error.textContent = "";
      }
    }

    function validate() {
      var first = null;
      Object.keys(rules).forEach(function (key) {
        var input = form.elements[key];
        var message = rules[key](input.value);
        setError(input, message);
        if (message && !first) first = input;
      });
      return first;
    }

    Array.prototype.forEach.call(form.elements, function (input) {
      if (!input.name || !rules[input.name]) return;
      input.addEventListener("blur", function () {
        if (!input.value && input.name !== "service") return;
        setError(input, rules[input.name](input.value));
      });
      input.addEventListener("input", function () {
        var field = input.closest(".field");
        if (field && field.classList.contains("is-invalid")) setError(input, rules[input.name](input.value));
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var first = validate();
      if (first) {
        first.focus();
        return;
      }
      var firstName = form.elements.name.value.trim().split(/\s+/)[0];
      var heading = success.querySelector("h3");
      if (heading) heading.textContent = "Thanks, " + firstName + ". Your quote request is in.";
      form.hidden = true;
      success.hidden = false;
      var again = success.querySelector("button");
      if (again) again.focus();
    });

    success.querySelector("button").addEventListener("click", function () {
      form.reset();
      form.hidden = false;
      success.hidden = true;
      form.querySelectorAll(".field").forEach(function (field) {
        field.classList.remove("is-invalid");
      });
      form.elements.name.focus();
    });
  });
})();
