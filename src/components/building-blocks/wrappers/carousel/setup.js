import EmblaCarousel from "embla-carousel";
import AutoScroll from "embla-carousel-auto-scroll";
import Autoplay from "embla-carousel-autoplay";

export function setupCarousel(carousel) {
  if (carousel.hasAttribute("data-embla-initialized")) {
    return;
  }

  const inner = carousel.querySelector(".carousel-inner");
  const viewport = inner?.querySelector(".viewport");
  const track = viewport?.querySelector(".track");
  const slides = track?.querySelectorAll(".slide");
  const controlsWrapper = inner?.querySelector(".controls-wrapper");
  const indicatorsContainer = controlsWrapper?.querySelector(".indicators");

  if (!inner || !viewport || !track || !slides || !slides.length) {
    console.warn("Carousel: Missing required elements");
    return;
  }

  const loop = inner.hasAttribute("data-loop");
  const slidesToScroll = inner.hasAttribute("data-slides-to-scroll")
    ? Number(inner.getAttribute("data-slides-to-scroll")) || "auto"
    : "auto";
  const alignAttr = inner.getAttribute("data-align");
  const align =
    alignAttr === "start" || alignAttr === "center" || alignAttr === "end"
      ? alignAttr
      : "start";

  const plugins = [];

  // Motion that starts on its own must not be forced on users who have asked the
  // OS for reduced motion (WCAG 2.2.2). The carousel stays fully usable manually.
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (inner.hasAttribute("data-autoplay") && !prefersReducedMotion) {
    const autoplayInterval = Number(inner.getAttribute("data-autoplay")) * 1000 || 3000;

    plugins.push(
      Autoplay({ delay: autoplayInterval, stopOnInteraction: false, stopOnMouseEnter: true })
    );
  }

  let watchDrag = true;

  if (inner.hasAttribute("data-autoscroll")) {
    const scrollValue = parseFloat(inner.getAttribute("data-autoscroll") || "1");
    const speed = isNaN(scrollValue) ? 1 : scrollValue;

    if (prefersReducedMotion) {
      // An auto-scrolling carousel normally hides arrows, indicators and drag
      // because the motion itself reveals the slides. With motion suppressed those
      // are the ONLY ways to reach later slides, so restore every one of them —
      // otherwise reduced-motion users get a frozen carousel they cannot navigate
      // (2.1.1 Keyboard, and content simply unreachable). These two attributes are
      // styling hooks only; nothing in JS reads them.
      inner.removeAttribute("data-show-arrows");
      inner.removeAttribute("data-show-indicators");
    } else {
      plugins.push(
        AutoScroll({ speed, stopOnInteraction: false, stopOnMouseEnter: true, startDelay: 0 })
      );
      // Drag is disabled only while auto-scroll actually drives the track.
      watchDrag = false;
    }
  }

  const embla = EmblaCarousel(
    viewport,
    {
      loop,
      slidesToScroll,
      align,
      watchDrag,
      duration: 20,
      startIndex: 0,
      skipSnaps: false,
      inViewThreshold: 0.7,
    },
    plugins
  );

  carousel.setAttribute("data-embla-initialized", "true");
  carousel._embla = embla;
  carousel.dispatchEvent(new CustomEvent("embla:ready", { detail: { embla } }));

  // Pause/play for auto-advancing carousels (WCAG 2.2.2). The control is only
  // rendered when autoplay or auto-scroll is configured.
  const toggleButton = controlsWrapper?.querySelector(".carousel-toggle");

  if (toggleButton) {
    // autoPlay and autoScroll are independent props, so BOTH plugins can be
    // registered on one carousel. Collect every motion plugin — stopping only the
    // first would leave the carousel still moving after the user pressed pause.
    const motionPlugins = () =>
      [embla.plugins().autoplay, embla.plugins().autoScroll].filter(Boolean);

    if (!motionPlugins().length) {
      // Under reduced motion no plugin is registered, so there is nothing to pause.
      // Remove the control rather than shipping a button that does nothing.
      toggleButton.remove();
    } else {
      const setToggleState = (playing) => {
        toggleButton.setAttribute("data-playing", String(playing));
        toggleButton.setAttribute("aria-label", playing ? "Pause carousel" : "Play carousel");
      };

      toggleButton.addEventListener("click", () => {
        const plugins = motionPlugins();
        // Playing if any plugin is still running, so one press stops everything.
        const playing = plugins.some((p) =>
          typeof p.isPlaying === "function" ? p.isPlaying() : true
        );

        plugins.forEach((p) => {
          if (playing) p.stop();
          else p.play();
        });
        setToggleState(!playing);
      });
    }
  }

  const prevButton = inner.querySelector(".prev > .button-inner");
  const nextButton = inner.querySelector(".next > .button-inner");

  const updateButtons = () => {
    if (prevButton) prevButton.disabled = !embla.canScrollPrev();
    if (nextButton) nextButton.disabled = !embla.canScrollNext();
  };

  updateButtons();
  embla.on("select", updateButtons);
  if (prevButton) prevButton.addEventListener("click", () => embla.scrollPrev());
  if (nextButton) nextButton.addEventListener("click", () => embla.scrollNext());

  // Offscreen slides keep their links and buttons in the tab order, so keyboard
  // users tab into content they cannot see. Mark those slides inert.
  //
  // Deliberately NOT using embla.slidesInView(): that honours inViewThreshold
  // (0.7 here), so a slide 69% visible counts as out of view and would be made
  // inert while plainly on screen. Instead a slide is only inert when it is
  // entirely outside the viewport box, which can never hide reachable content.
  //
  // Skipped for auto-scroll: those track continuously, so a discrete inert state
  // would be permanently stale, and they carry decorative logo strips anyway.
  if (!inner.hasAttribute("data-autoscroll")) {
    const syncInertSlides = () => {
      const box = viewport.getBoundingClientRect();

      slides.forEach((slide) => {
        const rect = slide.getBoundingClientRect();
        const fullyOutside = rect.right <= box.left + 1 || rect.left >= box.right - 1;
        // Never inert a slide holding focus — that would strand the user.
        const holdsFocus = slide.contains(document.activeElement);

        if (fullyOutside && !holdsFocus) slide.setAttribute("inert", "");
        else slide.removeAttribute("inert");
      });
    };

    syncInertSlides();
    embla.on("select", syncInertSlides);
    embla.on("settle", syncInertSlides);
    embla.on("reInit", syncInertSlides);
    // If focus reaches a slide by any other route, clear its inert immediately.
    viewport.addEventListener("focusin", syncInertSlides);
  }

  if (indicatorsContainer) {
    const hasThumbnails = inner.getAttribute("data-thumbnails") === "true";

    if (hasThumbnails) {
      const thumbViewport = indicatorsContainer.querySelector(".thumb-viewport");
      const thumbButtons = indicatorsContainer.querySelectorAll(".indicator--thumb");

      if (thumbViewport) {
        const thumbEmbla = EmblaCarousel(thumbViewport, {
          loop: true,
          align: "start",
          containScroll: "trimSnaps",
          dragFree: true,
          duration: 20,
        });

        thumbButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const index = parseInt(btn.getAttribute("data-thumb-index") || "0", 10);

            embla.scrollTo(index);
          });
        });

        const updateSelectedThumb = () => {
          const selected = embla.selectedScrollSnap();

          thumbButtons.forEach((btn, i) => {
            btn.classList.toggle("is-active", i === selected);
            // Expose the active slide to assistive tech, not just visually.
            if (i === selected) btn.setAttribute("aria-current", "true");
            else btn.removeAttribute("aria-current");
          });
          thumbEmbla.scrollTo(selected);
        };

        embla.on("select", updateSelectedThumb);
        updateSelectedThumb();
      }
    } else {
      const renderDots = () => {
        indicatorsContainer.innerHTML = "";
        embla.scrollSnapList().forEach((_, index) => {
          const dot = document.createElement("button");

          dot.className = "indicator";
          dot.setAttribute("type", "button");
          dot.setAttribute("aria-label", `Go to position ${index + 1}`);
          dot.setAttribute("data-selected", (index === embla.selectedScrollSnap()).toString());
          // aria-current, not aria-selected: aria-selected is not supported on
          // role=button, so screen readers ignore it entirely.
          if (index === embla.selectedScrollSnap()) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
          dot.addEventListener("click", () => embla.scrollTo(index));
          indicatorsContainer.appendChild(dot);
        });
      };

      const updateSelectedDot = () => {
        indicatorsContainer.querySelectorAll(".indicator").forEach((dot, index) => {
          const isSelected = index === embla.selectedScrollSnap();

          dot.setAttribute("data-selected", isSelected.toString());
          if (isSelected) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      };

      embla.on("select", updateSelectedDot);
      embla.on("reInit", renderDots);
      renderDots();
    }
  }
}

export function destroyCarousel(carousel) {
  if (!carousel._embla) return;

  carousel._embla.destroy();
  carousel.removeAttribute("data-embla-initialized");
  delete carousel._embla;
}

export function setupAllCarousels() {
  const carousels = document.querySelectorAll(".carousel:not([data-embla-initialized])");

  carousels.forEach((carousel) => setupCarousel(carousel));
}
