/**
 * Keyboard focus containment for the popover-based dialogs.
 *
 * The dialogs use the native popover API, which gives light-dismiss (Esc and
 * outside click) but does NOT contain Tab — only `<dialog>.showModal()` does
 * that. Without this, Tab walks straight out of an open dialog into the page
 * behind it, and a keyboard user ends up interacting with content the dialog is
 * covering, with nothing to signal they have left (WCAG 2.4.3, 2.1.2).
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]",
].join(",");

/** Focusable descendants in tab order, skipping anything not currently rendered. */
function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.tabIndex < 0) return false;
    if (el.closest("[inert]")) return false;
    // getClientRects rather than offsetParent: the dialogs are position:fixed,
    // which leaves offsetParent null even when they are plainly visible.
    return el.getClientRects().length > 0;
  });
}

/** Marker for elements THIS module inerted, so it never clears someone else's. */
const OWNED = "data-dialog-inert";

/**
 * Make everything outside the dialog inert while it is open, and undo it on close.
 *
 * A focus trap alone is not a modal. Without this the page behind an open dialog
 * stays in the accessibility tree, so a screen reader can still browse it and a
 * mouse can still click it — the dialog looks modal but is not (WCAG 4.1.2, and
 * the reason `aria-modal` exists).
 *
 * Walks up from the dialog inerting SIBLINGS at each level, never an ancestor:
 * inerting an ancestor would inert the dialog with it, since a popover stays in
 * its DOM position even while painted in the top layer.
 *
 * Only elements this function inerted are un-inerted, tracked via a marker
 * attribute. The mobile drawer is legitimately inert when closed, and clearing
 * that on dialog close would put ~88 offscreen tab stops back in the page.
 */
function setOutsideInert(dialog: HTMLElement, on: boolean): void {
  let node: HTMLElement = dialog;

  while (node.parentElement) {
    const parent: HTMLElement = node.parentElement;

    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;

      if (on) {
        // Already inert for its own reasons — leave it alone, and do not claim it.
        if (sibling.hasAttribute("inert")) continue;
        sibling.setAttribute("inert", "");
        sibling.setAttribute(OWNED, "");
      } else if (sibling.hasAttribute(OWNED)) {
        sibling.removeAttribute("inert");
        sibling.removeAttribute(OWNED);
      }
    }

    if (parent === document.body) break;
    node = parent;
  }
}

/**
 * Contain Tab within `popover` while it is open, and move focus into it on open.
 * Returning focus to the trigger on close is left to the caller, which already
 * does it. Safe to call more than once for the same element.
 */
export function trapFocus(popover: HTMLElement): void {
  if (popover.hasAttribute("data-focus-trapped")) return;
  popover.setAttribute("data-focus-trapped", "");

  popover.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;

    const focusable = focusableWithin(popover);

    // Nothing to cycle between: hold focus on the dialog itself rather than
    // letting Tab escape into the page behind.
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && (active === first || !popover.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !popover.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  });

  popover.addEventListener("toggle", (event) => {
    if ((event as ToggleEvent).newState !== "open") {
      // Order matters: clear aria-modal and release the background BEFORE the
      // caller's close handler moves focus back to the trigger, or the trigger is
      // still inert and .focus() silently does nothing.
      popover.removeAttribute("aria-modal");
      setOutsideInert(popover, false);
      return;
    }

    // aria-modal tells assistive tech the rest of the page is unavailable. It is
    // only honest once the background really is inert, so the two are set together.
    setOutsideInert(popover, true);
    popover.setAttribute("aria-modal", "true");

    // The popover API leaves focus on the trigger unless something inside is
    // autofocused, which would make the trap pointless — the first Tab would
    // still land outside. Move focus in, preferring an explicit autofocus.
    const target = popover.querySelector<HTMLElement>("[autofocus]") ?? focusableWithin(popover)[0];

    if (target) {
      target.focus();
    } else {
      // No focusable content: make the dialog itself the focus holder so the
      // keydown handler above can still intercept Tab.
      popover.tabIndex = -1;
      popover.focus();
    }
  });
}
