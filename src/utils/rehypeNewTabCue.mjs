/**
 * Append a screen-reader-only "(opens in new tab)" to every link that opens in a
 * new tab.
 *
 * 103 links across the English content carry target="_blank" and none warn
 * first. For a sighted mouse user that is merely surprising; for someone using a
 * screen reader or magnifier there is no signal at all that their context
 * changed, and the back button stops behaving as expected (WCAG 3.2.5).
 *
 * Done at build time rather than with a client script so the cue is in the
 * markup, needs no JavaScript, and causes no layout shift. The text is inside
 * the link, so it becomes part of the link's accessible name.
 *
 * Deliberately invisible: it adds the missing non-visual cue without changing
 * how any page looks. A *visible* new-tab icon is a separate editorial call.
 *
 * Hand-rolled tree walk — unist-util-visit would be a new dependency, and this
 * has to handle two node shapes anyway:
 *   - `element`            markdown links, e.g. [text](url)
 *   - `mdxJsxTextElement`  raw <a target="_blank"> written in MDX, which the MDX
 *     `mdxJsxFlowElement`  parser turns into JSX rather than HTML elements.
 * A plugin that only handled `element` would miss every one of the 103, because
 * they are all authored as raw HTML.
 */

const CUE_TEXT = " (opens in new tab)";
const CUE_CLASS = "visually-hidden";

/** Is this an anchor node, in either of the two representations? */
function anchorName(node) {
  if (node.type === "element") return node.tagName === "a" ? "element" : null;
  if (node.type === "mdxJsxTextElement" || node.type === "mdxJsxFlowElement") {
    return node.name === "a" ? "jsx" : null;
  }
  return null;
}

/** Read an attribute value from either representation. */
function getAttr(node, kind, name) {
  if (kind === "element") return node.properties?.[name];

  const attr = (node.attributes ?? []).find((a) => a.type === "mdxJsxAttribute" && a.name === name);

  // An expression attribute (target={x}) has a non-string value; treat as unknown
  // rather than guessing what it evaluates to.
  return typeof attr?.value === "string" ? attr.value : undefined;
}

/** Does this node already end with the cue? Keeps the plugin idempotent. */
function alreadyCued(node) {
  const last = node.children?.[node.children.length - 1];

  if (!last) return false;
  if (last.type === "element") {
    const cls = last.properties?.className;

    return Array.isArray(cls) ? cls.includes(CUE_CLASS) : cls === CUE_CLASS;
  }
  if (last.type === "mdxJsxTextElement" || last.type === "mdxJsxFlowElement") {
    return getAttr(last, "jsx", "class") === CUE_CLASS;
  }
  return false;
}

function makeCue(kind) {
  if (kind === "element") {
    return {
      type: "element",
      tagName: "span",
      properties: { className: [CUE_CLASS] },
      children: [{ type: "text", value: CUE_TEXT }],
    };
  }
  return {
    type: "mdxJsxTextElement",
    name: "span",
    attributes: [{ type: "mdxJsxAttribute", name: "class", value: CUE_CLASS }],
    children: [{ type: "text", value: CUE_TEXT }],
  };
}

export function rehypeNewTabCue() {
  return (tree) => {
    const walk = (node) => {
      const kind = anchorName(node);

      if (kind && getAttr(node, kind, "target") === "_blank" && !alreadyCued(node)) {
        // Empty links (icon-only, or an image with alt text) get no cue: the cue
        // would become the entire accessible name and say nothing about where
        // the link goes.
        if (node.children?.length) node.children.push(makeCue(kind));
      }

      for (const child of node.children ?? []) {
        if (child && typeof child === "object") walk(child);
      }
    };

    walk(tree);
  };
}

export default rehypeNewTabCue;
