#!/usr/bin/env node

/**
 * Convert language pages from old Bookshop structure to new Astro component structure
 *
 * Usage: node scripts/convert-spanish-pages.js <source-directory> <lang-code>
 * Example: node scripts/convert-spanish-pages.js /path/to/old-site/src/content/pages es
 *
 * This script reads .md/.mdx files from the source directory's language subfolder
 * and converts them to the new pageSections structure.
 * All converted files go to src/content/pages/{lang}/ to create URLs like /{lang}/about/page
 */

import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// Usage: node scripts/convert-spanish-pages.js <source-directory> <lang-code>
// Example: node scripts/convert-spanish-pages.js /path/to/old-site/src/content/pages es
if (process.argv.length < 4) {
  console.error("Usage: node scripts/convert-spanish-pages.js <source-directory> <lang-code>");
  console.error(
    "Example: node scripts/convert-spanish-pages.js /path/to/old-site/src/content/pages es"
  );
  process.exit(1);
}

const SOURCE_BASE = process.argv[2];
const LANG = process.argv[3];
const SOURCE_DIR = path.join(SOURCE_BASE, LANG);
const TARGET_DIR = path.join(__dirname, "../src/content/pages", LANG);

// Derive image base paths from source directory (go up to find the root)
// Assumes source is like /path/to/site/src/content/pages, so we go up 3 levels
const SOURCE_IMAGES_BASE = path.resolve(SOURCE_BASE, "../../../");
const TARGET_IMAGES_BASE = path.join(__dirname, "../src/assets/images");

// Track copied images to avoid duplicates
const copiedImages = new Set();

// English forms to use (don't translate these)
const ENGLISH_FORMS = {
  entryKit: `<div id="hubspot-entrykit-form" class="w-full" data-hs-forms-root="true"><div class="hs-form-frame" data-portal-id="35655" data-form-id="8c8fe571-1bef-44a9-b3f0-31964149cdfc" data-target="#hubspot-entrykit-form" data-on-form-submitted="function () {
        const redirectTo = resolveRedirect(thankYouUrl);
        try {
          window.top.location.href = redirectTo;
        } catch (e) {
          window.location.href = redirectTo;
        }
      }" style="height: 1000px;"><iframe src="https://js.hsforms.net/ui-forms-embed-components-app/frame.html?_hsPortalId=35655&amp;_hsFormId=8c8fe571-1bef-44a9-b3f0-31964149cdfc&amp;_hsIsQa=false&amp;_hsHublet=na1&amp;_hsDisableScriptloader=true&amp;_hsDisableRedirect=true&amp;_hsInstanceId=5f74d8e2-1d0c-450b-b91c-8724e65f22d1&amp;_hsUtk=c9d14285c0c99ecef07fc6ffb25c22fa"   loading="lazy" data-test-id="embedded-form-8c8fe571-1bef-44a9-b3f0-31964149cdfc" title="Form" scrolling="no" style="border: none; height: 100%; width: 100%;"></iframe></div>
    </div>`,
  newsletter: `<div id="hubspot-schedule-form-container" data-astro-cid-anhwevce=""> <div id="hubspotScheduleForm" data-astro-cid-anhwevce="" data-hs-forms-root="true"><div class="hs-form-frame" data-portal-id="35655" data-form-id="4efdd4d5-a101-48a9-a83a-de234d43d7e9" data-target="#hubspotScheduleForm" data-on-form-ready="function(e){setTimeout(()=&gt;{u(e)},300),setTimeout(()=&gt;{u(e)},800)}" data-on-form-submit="function(e){}" data-on-form-submitted="function(e){l(&quot;&quot;,&quot;success&quot;)}" style="height: 671.5px;"><iframe src="https://js.hsforms.net/ui-forms-embed-components-app/frame.html?_hsPortalId=35655&amp;_hsFormId=4efdd4d5-a101-48a9-a83a-de234d43d7e9&amp;_hsIsQa=false&amp;_hsHublet=na1&amp;_hsDisableScriptloader=true&amp;_hsDisableRedirect=true&amp;_hsInstanceId=dfc8f47a-13ed-47e9-b2db-db65c06feffa&amp;_hsUtk=c9d14285c0c99ecef07fc6ffb25c22fa"  loading="lazy" data-test-id="embedded-form-4efdd4d5-a101-48a9-a83a-de234d43d7e9" title="Form" scrolling="no" style="border: none; height: 100%; width: 100%;"></iframe></div></div> </div>`,
  entryKitLong: `<div class="hs-form-frame" data-region="na1" data-form-id="fa2a5858-32e2-4240-9ed0-2a6a3ba34b8e" data-portal-id="35655" style="height: 5827px;"><iframe src="https://js.hsforms.net/ui-forms-embed-components-app/frame.html?_hsPortalId=35655&amp;_hsFormId=fa2a5858-32e2-4240-9ed0-2a6a3ba34b8e&amp;_hsIsQa=false&amp;_hsHublet=na1&amp;_hsDisableScriptloader=true&amp;_hsDisableRedirect=true&amp;_hsInstanceId=1b224221-56c8-42a4-91e9-b20aa022f8a1&amp;_hsUtk=c9d14285c0c99ecef07fc6ffb25c22fa" data-test-id="embedded-form-fa2a5858-32e2-4240-9ed0-2a6a3ba34b8e" title="Form" scrolling="no" style="border: none; height: 100%; width: 100%;"></iframe></div>`,
};

/**
 * Fix image paths - ensure they work correctly and copy missing images
 */
function fixImagePath(imagePath) {
  if (!imagePath) return "";

  const originalPath = imagePath;
  let targetImagePath = "";

  // Determine the target path format
  if (imagePath.startsWith("/src/")) {
    targetImagePath = imagePath;
  } else if (imagePath.startsWith("/assets/")) {
    targetImagePath = imagePath.replace("/assets/", "/src/assets/");
  } else if (imagePath.startsWith("/images/")) {
    targetImagePath = imagePath.replace("/images/", "/src/assets/images/");
  } else if (!imagePath.startsWith("/")) {
    targetImagePath = `/src/assets/images/${imagePath}`;
  } else {
    targetImagePath = `/src/assets/images${imagePath}`;
  }

  // Check if the image exists at the target location
  const targetImageFile = targetImagePath.replace("/src/", "");
  const fullTargetPath = path.join("/Users/alysha/Downloads/stevieawards-main", targetImageFile);

  if (fs.existsSync(fullTargetPath)) {
    // Image exists, return the path as-is
    return targetImagePath;
  }

  // Image doesn't exist - try to copy it from source
  const sourceImagePaths = [
    path.join(SOURCE_IMAGES_BASE, originalPath),
    path.join(SOURCE_IMAGES_BASE, "src", originalPath.replace(/^\//, "")),
    path.join(SOURCE_IMAGES_BASE, originalPath.replace(/^\//, "")),
    path.join(SOURCE_IMAGES_BASE, "public", originalPath.replace(/^\//, "")),
  ];

  let sourceFound = null;

  for (const sourcePath of sourceImagePaths) {
    if (fs.existsSync(sourcePath)) {
      sourceFound = sourcePath;
      break;
    }
  }

  if (sourceFound && !copiedImages.has(originalPath)) {
    try {
      // Create target path with /es/ subfolder
      const imageFilename = path.basename(originalPath);
      const imageDirPath = path.dirname(targetImagePath.replace("/src/assets/images/", ""));
      const langImageDir = imageDirPath === "." ? LANG : path.join(imageDirPath, LANG);
      const finalTargetDir = path.join(TARGET_IMAGES_BASE, langImageDir);
      const finalTargetPath = path.join(finalTargetDir, imageFilename);

      // Create directory if needed
      fs.mkdirSync(finalTargetDir, { recursive: true });

      // Copy the image
      fs.copyFileSync(sourceFound, finalTargetPath);
      copiedImages.add(originalPath);

      // Return the new path
      const newPath = `/src/assets/images/${langImageDir}/${imageFilename}`.replace(/\/\//g, "/");

      console.log(`   📸 Copied image: ${originalPath} -> ${newPath}`);
      return newPath;
    } catch (error) {
      console.warn(`   ⚠️  Failed to copy image: ${originalPath} - ${error.message}`);
      return targetImagePath; // Return original target path anyway
    }
  }

  // Image not found in source, return the path anyway
  if (!sourceFound) {
    console.warn(`   ⚠️  Image not found: ${originalPath}`);
  }

  return targetImagePath;
}

/**
 * Normalize directory path - lowercase and handle special cases
 */
function normalizeDirectoryPath(dirPath) {
  // Split path and normalize each part
  const parts = dirPath.split("/").filter((p) => p);
  const normalized = parts.map((part) => {
    // Convert to lowercase
    return part.toLowerCase();
  });

  return normalized.join("/");
}

/**
 * Convert hero section from old format to new format
 */
function convertHeroSection(block) {
  const column1 = block.column_1 || [];
  const column2 = block.column_2 || [];
  const column3 = block.column_3 || [];

  let heading = "";
  let subheading = "";
  let description = "";
  const buttonSections = [];
  const socialLinks = [];
  let deadlinesHeading = "Upcoming Deadlines & Events";

  // Extract data from column_1
  for (const item of column1) {
    if (item._bookshop_name === "ContentComponent/headline") {
      heading = item.text || "";
      subheading = item.kicker || "";
    } else if (item._bookshop_name === "ContentComponent/LinkedTextLine") {
      description += (description ? "\n\n" : "") + (item.text || "");
    } else if (item._bookshop_name === "ContentComponent/button") {
      buttonSections.push({
        _component: "building-blocks/core-elements/button",
        text: item.text || "",
        hideText: false,
        link: item.url || "",
        iconName: "",
        iconPosition: "before",
        variant:
          item.style === "primary"
            ? "primary"
            : item.style === "secondary"
              ? "tertiary"
              : "primary",
        size: "md",
        uppercase: true,
      });
    }
  }

  // Extract social links from column_3
  for (const item of column3) {
    if (item._bookshop_name === "ContentComponent/iconlist" && item.icons) {
      for (const icon of item.icons) {
        let platform = icon.name || "Social";
        let iconName = "social/linkedin";

        if (icon.link && icon.link.includes("linkedin")) {
          platform = "LinkedIn";
          iconName = "social/linkedin";
        } else if (icon.link && (icon.link.includes("twitter") || icon.link.includes("x.com"))) {
          platform = "X";
          iconName = "social/x";
        } else if (icon.link && icon.link.includes("facebook")) {
          platform = "Facebook";
          iconName = "social/facebook";
        } else if (icon.link && icon.link.includes("instagram")) {
          platform = "Instagram";
          iconName = "social/instagram";
        } else if (icon.link && icon.link.includes("youtube")) {
          platform = "YouTube";
          iconName = "social/youtube";
        }

        socialLinks.push({
          platform,
          link: icon.link || "",
          icon: iconName,
        });
      }
    }
  }

  // Extract calendar heading from column_2
  for (const item of column2) {
    if (item._bookshop_name === "ContentComponent/CalendarCarousel") {
      deadlinesHeading = item.headline || deadlinesHeading;
    }
  }

  const backgroundImage =
    block.backgrounds && block.backgrounds[0]
      ? { source: fixImagePath(block.backgrounds[0]), alt: heading }
      : null;

  return {
    _component: "page-sections/heroes/hero-calendar",
    colorScheme: "dark",
    backgroundColor: "base",
    subheading,
    heading,
    deadlinesHeading,
    description,
    backgroundImage,
    buttonSections,
    socialLinks,
  };
}

/**
 * Convert award categories section with form
 */
function convertAwardCategoriesSection(block) {
  const items = [];

  // Combine left and right column categories
  if (block.left_column_categories) {
    items.push(
      ...block.left_column_categories.map((cat) => ({
        text: cat.text || "",
        iconName: "four-pointed-star",
        iconColor: "brand",
      }))
    );
  }

  if (block.right_column_categories) {
    items.push(
      ...block.right_column_categories.map((cat) => ({
        text: cat.text || "",
        iconName: "four-pointed-star",
        iconColor: "brand",
      }))
    );
  }

  const buttonSections = [];

  if (block.know_more_button_text) {
    buttonSections.push({
      _component: "building-blocks/core-elements/button",
      text: block.know_more_button_text,
      link: block.know_more_button_url || "#",
      variant: "secondary",
      uppercase: false,
    });
  }

  return {
    _component: "page-sections/features/split-list-form",
    colorScheme: "dark",
    backgroundColor: "base",
    formCardColorScheme: "light",
    subheading: block.main_heading_top || "",
    heading: block.main_heading_bottom || "",
    formHeading: block.form_heading || "",
    formEmbed: ENGLISH_FORMS.entryKit,
    description: `${block.heading_subtitle || ""}\n\n${block.heading_subtitle2 || ""}`,
    list: {
      _component: "building-blocks/core-elements/list",
      listType: "icon",
      direction: "vertical",
      alignX: "start",
      size: "lg",
      columns: true,
      items,
    },
    buttonSections,
  };
}

/**
 * Convert logo marquee section
 */
function convertLogoMarquee(block) {
  const logos = (block.logos || []).map((logo) => ({
    source: fixImagePath(logo.image),
    alt: logo.alt || "",
  }));

  return {
    _component: "page-sections/features/feature-logo-scroller",
    colorScheme: "light",
    backgroundColor: "base",
    heading: block.heading || "",
    description: block.subtitle || "",
    logos,
  };
}

/**
 * Convert featured content with form section
 */
function convertFeaturedContentSection(block) {
  const stories = (block.features || []).map((feature) => ({
    image: {
      source: fixImagePath(feature.image),
      alt: feature.image_alt || "",
    },
    title: feature.text || "",
    link: feature.url || "",
  }));

  return {
    _component: "page-sections/features/split-list-form",
    colorScheme: "light",
    backgroundColor: "surface",
    formCardColorScheme: "dark",
    buttonSections: [],
    subheading: block.heading_top || "",
    heading: block.heading_bottom || "",
    formHeading: block.form_heading || "",
    formEmbed: ENGLISH_FORMS.newsletter,
    list: {
      _component: "building-blocks/wrappers/article-link-list",
      stories,
    },
  };
}

/**
 * Convert YouTube videos section
 */
function convertYouTubeVideos(block) {
  const videos = (block.videos || []).map((video) => ({
    youtubeId: video.video_id || "",
    title: video.title || "",
  }));

  return {
    _component: "page-sections/features/grid-videos",
    colorScheme: "light",
    backgroundColor: "base",
    heading: block.heading || "",
    videos,
  };
}

/**
 * Convert testimonials section
 */
function convertTestimonials(block) {
  const testimonials = (block.testimonials || []).map((t) => {
    // Parse the description field which contains "Name, Title, Company"
    const description = t.description || "";
    const parts = description.split(",").map((p) => p.trim());

    let authorName = "";
    let authorTitle = "";

    if (parts.length >= 2) {
      authorName = parts[0];
      authorTitle = parts.slice(1).join(", ");
    } else {
      authorName = description;
    }

    return {
      quote: t.quote || "",
      authorName,
      authorTitle,
      companyLogo: {
        source: fixImagePath(t.logo),
        alt: t.logo_alt || "",
      },
    };
  });

  return {
    _component: "page-sections/features/grid-testimonials",
    colorScheme: "light",
    backgroundColor: "surface",
    heading: block.heading || "",
    testimonials,
  };
}

/**
 * Convert staff card with nav box (staff page)
 */
function convertStaffCardWithNavBox(block) {
  const staff = (block.staff_profiles || []).map((profile) => {
    return {
      photo: {
        source: fixImagePath(profile.image),
        alt: profile.name || "",
      },
      heading: profile.name || "",
      jobTitle: profile.role || "",
      description: profile.description || "",
      colorScheme: profile.isDarkTheme ? "dark" : "light",
      backgroundColor: profile.isDarkTheme ? "base" : "surface",
    };
  });

  return {
    _component: "page-sections/people/staff-grid",
    staff,
  };
}

/**
 * Convert image carousel section
 */
function convertImageCarousel(block) {
  const images = (block.images || []).map((img) => ({
    source: fixImagePath(img.image),
    alt: img.alt || "",
  }));

  let description = block.subtitle_p1 || "";

  if (block.subtitle_p2_text) {
    description += `\n\n${block.subtitle_p2_text}`;
  }

  return {
    _component: "page-sections/carousels/gallery-carousel",
    colorScheme: "dark",
    backgroundColor: "base",
    heading: block.heading || "",
    description,
    images,
  };
}

/**
 * Convert cards explorer section
 */
function convertCardsExplorer(block) {
  const cards = (block.cards || []).map((card) => ({
    logo: {
      source: fixImagePath(card.logo),
      alt: card.heading || "",
    },
    eventPhoto: {
      source: fixImagePath(card.card_image),
      alt: card.card_image_alt || "",
    },
    dateLabel: card.text_above_heading || "",
    name: card.heading || "",
    description: card.subtitle || "",
    link: card.button_url || "",
    brandColor: card.bg_color || "#000000",
  }));

  return {
    _component: "page-sections/carousels/card-carousel",
    colorScheme: "light",
    backgroundColor: "base",
    heading: block.section_heading || "",
    description: block.section_subtitle || "",
    cards,
  };
}

/**
 * Convert HTML content to markdown
 */
function htmlToMarkdown(html) {
  if (!html) return "";

  // Fix broken tags split across lines
  // Handle: "<e" + newline + "m>" or "< e" + newline + "m>"
  html = html.replace(/<([a-zA-Z])\s*\n\s*([a-zA-Z]+)>/g, "<$1$2>");
  // Handle: "</" + newline + "a>"
  html = html.replace(/<\/\s*\n\s*([a-zA-Z]+)>/g, "</$1>");
  // Handle: "<" + newline + "em>"
  html = html.replace(/<\s*\n\s*([a-zA-Z]+)>/g, "<$1>");
  // Handle any remaining broken tags with spaces: "< em>" -> "<em>"
  html = html.replace(/<\s+([a-zA-Z]+)\s*>/g, "<$1>");
  html = html.replace(/<\/\s+([a-zA-Z]+)\s*>/g, "</$1>");

  // Fix common malformed patterns
  // Remove invalid tags like "<a." or "<b." (followed by non-tag character)
  html = html.replace(/<([a-zA-Z]+)\./g, "$1.");
  // Fix malformed links like "<a href=)" - remove the broken link start
  html = html.replace(/<a\s+href=\)/g, "(");
  // Fix malformed links missing closing quote: href="/url/text</a> -> href="/url">text</a>
  html = html.replace(
    /<a\s+href="([^"]*)"?([^>]*?)([^>\/]{10,})<\/a>/gi,
    (match, url, attrs, text) => {
      // If there's no > before the text, it's malformed - add it
      if (!attrs.includes(">")) {
        return `<a href="${url}">${text}</a>`;
      }
      return match;
    }
  );
  // Remove invalid HTML-like patterns: <F66, <123, etc. (< followed by number or uppercase letter not part of valid tag)
  html = html.replace(/<([A-Z0-9][A-Z0-9]*\.?)/g, "&lt;$1");
  // Fix incomplete tags at end of line: "<p" or "<br /" without closing >
  html = html.replace(/<(p|br|div|span)\s*$/gm, "");
  html = html.replace(/<br\s*\/(?!>)/g, "<br />");
  // Fix malformed markdown links with < inside: "[<text" -> "[text"
  html = html.replace(/\[<([^\]]+)\]/g, "[$1");

  // First pass: convert paragraph tags inside tables to just spaces
  html = html.replace(/<table>([\s\S]*?)<\/table>/gi, (tableMatch) => {
    // Inside tables, convert <p> to nothing and </p> to space (instead of newlines)
    return tableMatch.replace(/<p>/gi, "").replace(/<\/p>/gi, " ").replace(/\s+/g, " "); // Consolidate multiple spaces
  });

  // Clean up orphaned closing tags (closing tags without opening tags)
  // This handles common tags: a, strong, b, em, i, span, div, u
  const tagsToCheck = ["a", "strong", "b", "em", "i", "span", "div", "u"];

  for (const tag of tagsToCheck) {
    const closingTagRegex = new RegExp(`<\\/${tag}>`, "gi");

    html = html.replace(closingTagRegex, (match, offset, string) => {
      // Check if there's a matching opening tag before this closing tag
      const beforeThis = string.substring(0, offset);
      const openingTagRegex = new RegExp(`<${tag}[\\s>]`, "i");
      const closingTagRegex2 = new RegExp(`<\\/${tag}>`, "gi");

      const lastOpeningMatch = beforeThis.match(openingTagRegex);
      const lastOpeningIndex = lastOpeningMatch ? beforeThis.lastIndexOf(lastOpeningMatch[0]) : -1;
      const lastClosingIndex = beforeThis.lastIndexOf(`</${tag}>`);

      // If there's no opening tag, or the last closing tag is after the last opening tag,
      // this is an orphaned closing tag - remove it
      if (lastOpeningIndex === -1 || lastClosingIndex > lastOpeningIndex) {
        return "";
      }
      return match;
    });
  }

  // Clean up orphaned opening tags (opening tags without closing tags at end of content)
  for (const tag of tagsToCheck) {
    const openingTagRegex = new RegExp(`<${tag}[\\s>]`, "gi");

    // Simple heuristic: if there's an opening tag very close to the end with no closing tag, remove it
    html = html.replace(new RegExp(`<${tag}[\\s>][^<]{0,50}$`, "i"), (match) => {
      if (!match.includes(`</${tag}>`)) {
        return match.replace(new RegExp(`<${tag}[\\s>]`, "i"), "");
      }
      return match;
    });
  }

  // Convert lists properly - handle newlines inside li tags
  html = html.replace(/<li>([\s\S]*?)<\/li>/gi, (match, content) => {
    // Remove paragraph tags and newlines from inside list items
    const cleanContent = content
      .replace(/<p>/gi, "")
      .replace(/<\/p>/gi, " ")
      .replace(/\n+/g, " ")
      .trim();

    return `<li>${cleanContent}</li>`;
  });

  // Fix links with malformed content (e.g., <a href="..."><complete text</strong></a>)
  html = html.replace(/<a\s+([^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, content) => {
    // Clean up the content: remove any stray < or tags
    const cleanContent = content
      .replace(/<complete\s+/gi, "complete ")
      .replace(/<\/?strong>/gi, "")
      .replace(/<\/?em>/gi, "")
      .replace(/<\/?b>/gi, "")
      .replace(/<\/?i>/gi, "");

    return `<a ${attrs}>${cleanContent}</a>`;
  });

  // Basic HTML to markdown conversion
  const md = html
    // Remove opening and closing paragraph tags (including those with attributes)
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    // Convert headers (including those with attributes, with 's' flag for multiline)
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `\n\n# ${cleanText}\n\n`;
    })
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `\n\n## ${cleanText}\n\n`;
    })
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `\n\n### ${cleanText}\n\n`;
    })
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `\n\n#### ${cleanText}\n\n`;
    })
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `\n\n##### ${cleanText}\n\n`;
    })
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `\n\n###### ${cleanText}\n\n`;
    })
    // Remove span tags (keep content)
    .replace(/<span[^>]*>/gi, "")
    .replace(/<\/span>/gi, "")
    // Remove div tags (keep content)
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    // Convert links (with 's' flag to match across newlines)
    .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, url, text) => {
      // Clean up the link text by removing newlines
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `[${cleanText}](${url})`;
    })
    // Convert bold and italic (with 's' flag to match across newlines)
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `**${cleanText}**`;
    })
    .replace(/<b>([\s\S]*?)<\/b>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `**${cleanText}**`;
    })
    .replace(/<em>([\s\S]*?)<\/em>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `*${cleanText}*`;
    })
    .replace(/<i>([\s\S]*?)<\/i>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `*${cleanText}*`;
    })
    // Convert underline (not standard markdown, but leave as HTML)
    .replace(/<u>([\s\S]*?)<\/u>/gi, (match, text) => {
      const cleanText = text.replace(/\n+/g, " ").trim();

      return `<u>${cleanText}</u>`;
    })
    // Convert lists
    .replace(/<ul>/gi, "")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<ol>/gi, "")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
    // Convert line breaks
    .replace(/<br\s*\/?>/gi, "\n")
    // Clean up tables - remove newlines between tags
    .replace(/<table>([\s\S]*?)<\/table>/gi, (match) => {
      return match.replace(/>\s+</g, "><");
    })
    // Final cleanup: remove any remaining unclosed HTML tags
    .replace(/<(em|strong|b|i|u|span|div|li)>/gi, "")
    .replace(/<\/(em|strong|b|i|u|span|div|li)>/gi, "")
    // Clean up multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return md;
}

/**
 * Convert split section (sidebar pages)
 */
function convertSplitSection(block) {
  const column1 = block.column_1 || [];
  const column2 = block.column_2 || [];

  let sidebarNav = null;
  let content = "";
  let heading = "";

  // Extract sidebar from column_1
  for (const item of column1) {
    if (item._bookshop_name === "ContentComponent/SidebarNav") {
      sidebarNav = {
        title: item.title || "",
        items: (item.nav_items || []).map((nav) => ({
          text: nav.text || "",
          url: nav.url || "",
          active: nav.is_bold || nav.is_highlighted || false,
        })),
      };
    }
  }

  // Extract content from column_2
  for (const item of column2) {
    if (item._bookshop_name === "ContentComponent/MediumHeading") {
      heading = item.text || "";
    } else if (item._bookshop_name === "ContentComponent/RichTextBlock") {
      content += `${htmlToMarkdown(item.content_html)}\n\n`;
    } else if (item._bookshop_name === "ContentComponent/YouTubeEmbed") {
      // Check if it's actually a Vimeo embed (full HTML) or YouTube (just ID)
      const videoId = item.video_id || "";

      if (videoId.includes("<iframe") || videoId.includes("vimeo")) {
        // It's a Vimeo embed - extract the Vimeo ID or use raw HTML
        const vimeoMatch = videoId.match(/vimeo\.com\/video\/(\d+)/);

        if (vimeoMatch) {
          content += `<Video type="vimeo" id="${vimeoMatch[1]}" title="${item.title || "Video"}" />\n\n`;
        } else {
          // Can't extract ID, skip or use a placeholder
          content += `<!-- Vimeo embed - manual review needed -->\n\n`;
        }
      } else {
        // Regular YouTube embed
        content += `<Video type="youtube" id="${videoId}" title="${item.title || "Video"}" />\n\n`;
      }
    }
  }

  // Only return as sidebar page if there's actually a sidebar nav
  // If no sidebar, return null so it doesn't get treated as a sidebar page
  if (!sidebarNav) {
    return null;
  }

  return {
    sidebarNav,
    heading,
    content: content.trim(),
  };
}

/**
 * Convert entry kit long page (special case)
 */
function convertEntryKitLongPage(block) {
  return {
    _component: "page-sections/builders/custom-section",
    label: "",
    contentSections: [
      {
        _component: "building-blocks/core-elements/embed",
        html: ENGLISH_FORMS.entryKitLong,
        aspectRatio: "landscape",
      },
    ],
    maxContentWidth: "3xl",
    paddingHorizontal: "md",
    paddingVertical: "md",
    colorScheme: "light",
    backgroundColor: "base",
    backgroundImage: {
      source: "",
      alt: "",
      positionVertical: "top",
      positionHorizontal: "center",
    },
    rounded: false,
    useDefaultEditableBinding: true,
  };
}

/**
 * Convert a single content block
 */
function convertContentBlock(block) {
  const bookshopName = block._bookshop_name;

  if (!bookshopName) {
    return null;
  }

  switch (bookshopName) {
    case "ContentComponent/SectionComponent/splitsectionforhero":
      return convertHeroSection(block);

    case "ContentComponent/AwardCategoriesWithForm":
      return convertAwardCategoriesSection(block);

    case "ContentComponent/LogoMarquee":
      return convertLogoMarquee(block);

    case "ContentComponent/FeaturedContentWithForm":
      return convertFeaturedContentSection(block);

    case "ContentComponent/3YTVideos":
      return convertYouTubeVideos(block);

    case "ContentComponent/TestimonialCarousel":
    case "ContentComponent/TestimonialsCarousel":
    case "ContentComponent/Testimonials":
      return convertTestimonials(block);

    case "ContentComponent/StaffCardWithNavBox":
      return convertStaffCardWithNavBox(block);

    case "ContentComponent/ImageCarousel":
      return convertImageCarousel(block);

    case "ContentComponent/CardsExplorer":
      return convertCardsExplorer(block);

    case "ContentComponent/SectionComponent/splitsection":
      return convertSplitSection(block);

    case "ContentComponent/EntryKitLongPage":
    case "ContentComponent/EntryKit":
      return convertEntryKitLongPage(block);

    case "hero":
      // Skip generic hero blocks
      return null;

    case "ContentComponent/Breadcrumbs":
      // Skip breadcrumbs
      return null;

    case "ContentComponent/StaffCard":
      // Skip individual staff cards (handled by StaffCardWithNavBox)
      return null;

    default:
      if (!bookshopName.startsWith("ContentComponent")) {
        return null;
      }
      console.warn(`⚠️  Unknown component: ${bookshopName}`);
      return null;
  }
}

/**
 * Convert a page file
 */
function convertPage(sourcePath, targetPath, filename) {
  try {
    const content = fs.readFileSync(sourcePath, "utf8");

    // Extract frontmatter and body
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      console.warn(`⚠️  No frontmatter found in ${sourcePath}`);
      return false;
    }

    const frontmatter = yaml.load(frontmatterMatch[1]);
    const body = content.slice(frontmatterMatch[0].length).trim();

    // Special handling for entry-kit-long-page
    const isEntryKitLongPage = filename === "entry-kit-long-page";

    // Convert content blocks to page sections
    const pageSections = [];
    let simpleContent = null;
    let markdownBody = body;

    if (isEntryKitLongPage) {
      // Special case: entry-kit-long-page should have embed section
      pageSections.push(convertEntryKitLongPage({}));
    } else if (frontmatter.content_blocks) {
      for (const block of frontmatter.content_blocks) {
        const converted = convertContentBlock(block);

        if (converted) {
          // Check if this is a sidebar split section
          if (converted.sidebarNav) {
            // This has sidebar navigation - treat the content as simple content, ignore the sidebar
            simpleContent = {
              heading: converted.heading || "",
              content: converted.content || "",
            };
          } else {
            pageSections.push(converted);
          }
        } else if (block._bookshop_name === "ContentComponent/SectionComponent/splitsection") {
          // This is a split section without sidebar - extract the content
          const column2 = block.column_2 || [];
          let heading = "";
          let content = "";

          for (const item of column2) {
            if (item._bookshop_name === "ContentComponent/MediumHeading") {
              heading = item.text || "";
            } else if (item._bookshop_name === "ContentComponent/RichTextBlock") {
              content += `${htmlToMarkdown(item.content_html)}\n\n`;
            } else if (item._bookshop_name === "ContentComponent/YouTubeEmbed") {
              // Check if it's actually a Vimeo embed (full HTML) or YouTube (just ID)
              const videoId = item.video_id || "";

              if (videoId.includes("<iframe") || videoId.includes("vimeo")) {
                // It's a Vimeo embed - extract the Vimeo ID or use raw HTML
                const vimeoMatch = videoId.match(/vimeo\.com\/video\/(\d+)/);

                if (vimeoMatch) {
                  content += `<Video type="vimeo" id="${vimeoMatch[1]}" title="${item.title || "Video"}" />\n\n`;
                } else {
                  // Can't extract ID, skip or use a placeholder
                  content += `<!-- Vimeo embed - manual review needed -->\n\n`;
                }
              } else {
                // Regular YouTube embed
                content += `<Video type="youtube" id="${videoId}" title="${item.title || "Video"}" />\n\n`;
              }
            }
          }

          if (content.trim()) {
            simpleContent = {
              heading,
              content: content.trim(),
            };
          }
        }
      }
    }

    // Determine page type
    const isSimplePage = pageSections.length === 0 && simpleContent !== null;

    // Build new frontmatter
    let newFrontmatter;

    if (isSimplePage) {
      // Simple page with just content (no sections, no sidebar) - like English about pages
      newFrontmatter = {
        title: frontmatter.title || "",
        pageHeading: simpleContent.heading || frontmatter.title || "",
        description: "",
        image: "",
      };
      markdownBody = simpleContent.content || "";
    } else {
      // Regular page with sections (including entry-kit-long-page)
      newFrontmatter = {
        title: frontmatter.title || "",
        pageSections,
      };
      markdownBody = "";
    }

    // Add SEO if present
    if (frontmatter.seo && frontmatter.seo.page_description) {
      newFrontmatter.seo = {
        description: frontmatter.seo.page_description,
      };
    }

    // Determine file extension
    const ext = isSimplePage ? ".mdx" : isEntryKitLongPage ? ".mdx" : ".md";
    const finalTargetPath = targetPath.replace(/\.md(x?)$/, ext);

    // Generate new content
    const newContent = `---\n${yaml.dump(newFrontmatter)}---\n${markdownBody || ""}`;

    // Ensure target directory exists
    const targetDir = path.dirname(finalTargetPath);

    fs.mkdirSync(targetDir, { recursive: true });

    // Write file
    fs.writeFileSync(finalTargetPath, newContent, "utf8");

    return true;
  } catch (error) {
    console.error(`❌ Error converting ${sourcePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively process directory
 */
function processDirectory(sourceDir, targetDir) {
  let successCount = 0;
  let failCount = 0;

  function walkDir(dir, baseDir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const sourcePath = path.join(dir, file);
      const relativePath = path.relative(baseDir, sourcePath);

      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        walkDir(sourcePath, baseDir);
      } else if (file.endsWith(".md")) {
        // Skip test pages in new/ directory
        if (relativePath.startsWith("new/test") || relativePath.startsWith("new/ComponetnTest")) {
          console.log(`⏭️  Skipping (test page): ${relativePath}`);
          continue;
        }

        // Normalize the path (lowercase subdirectories)
        const normalizedPath = normalizeDirectoryPath(relativePath.replace(/\.md$/, ""));

        // Target goes to pages/{lang}/{normalizedPath}.md
        const targetPath = path.join(targetDir, `${normalizedPath}.md`);

        console.log(`📄 Converting: ${relativePath}`);
        const filename = path.basename(file, ".md");
        const success = convertPage(sourcePath, targetPath, filename);

        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }
  }

  walkDir(sourceDir, sourceDir);

  return { successCount, failCount };
}

/**
 * Main function
 */
function main() {
  console.log("🚀 Starting page conversion...\n");
  console.log(`🌍 Language: ${LANG}`);
  console.log(`📂 Source: ${SOURCE_DIR}`);
  console.log(`📂 Target: ${TARGET_DIR}\n`);

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    console.log("\n💡 Tip: Make sure the source directory path is correct");
    console.log(`   Usage: node scripts/convert-spanish-pages.js <source-directory> <lang-code>`);
    console.log(
      `   Example: node scripts/convert-spanish-pages.js /path/to/old-site/src/content/pages es`
    );
    process.exit(1);
  }

  // Remove existing target directory to start fresh
  if (fs.existsSync(TARGET_DIR)) {
    console.log("🗑️  Removing existing target directory for fresh conversion...\n");
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }

  const { successCount, failCount } = processDirectory(SOURCE_DIR, TARGET_DIR);

  console.log("\n✅ Conversion complete!");
  console.log(`   Success: ${successCount} files`);
  console.log(`   Failed: ${failCount} files`);
  console.log(`   📸 Images copied: ${copiedImages.size}`);

  if (failCount > 0) {
    console.log("\n⚠️  Some files failed to convert. Check the logs above for details.");
  }

  console.log("\n📋 Next steps:");
  console.log("   1. Review converted files in", TARGET_DIR);
  console.log("   2. Test pages in browser with: npm run dev");
  console.log(`   3. Visit http://localhost:4321/${LANG}/`);
  console.log("   4. Check images are loading correctly");
  console.log("   5. Verify forms are working");
}

// Run the script
main();

export { convertContentBlock, convertPage };
