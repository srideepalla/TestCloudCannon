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

  if (inner.hasAttribute("data-autoplay")) {
    const autoplayInterval = Number(inner.getAttribute("data-autoplay")) * 1000 || 3000;

    plugins.push(
      Autoplay({ delay: autoplayInterval, stopOnInteraction: false, stopOnMouseEnter: true })
    );
  }

  let watchDrag = true;

  if (inner.hasAttribute("data-autoscroll")) {
    const scrollValue = parseFloat(inner.getAttribute("data-autoscroll") || "1");
    const speed = isNaN(scrollValue) ? 1 : scrollValue;

    plugins.push(
      AutoScroll({ speed, stopOnInteraction: false, stopOnMouseEnter: true, startDelay: 0 })
    );
    watchDrag = false;
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
          dot.setAttribute("aria-selected", (index === embla.selectedScrollSnap()).toString());
          dot.addEventListener("click", () => embla.scrollTo(index));
          indicatorsContainer.appendChild(dot);
        });
      };

      const updateSelectedDot = () => {
        indicatorsContainer.querySelectorAll(".indicator").forEach((dot, index) => {
          const isSelected = index === embla.selectedScrollSnap();

          dot.setAttribute("data-selected", isSelected.toString());
          dot.setAttribute("aria-selected", isSelected.toString());
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
