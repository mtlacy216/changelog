// RSS Feed Field Mapper & Analyzer for Xano Backend
// Drop this into a Xano Function Stack as an API endpoint
// Endpoint: POST /api/rss_feed_analyzer

// === MAIN FUNCTION ===
export interface AnalyzeRSSInputs {
  feed_url: string;
  sample_size?: number;
  deep_scan?: boolean;
}

export function analyzeRSSFeed(inputs: AnalyzeRSSInputs) {
  // Expected inputs:
  // - feed_url: string (required) - The RSS feed URL to analyze
  // - sample_size: number (optional, default 5) - Number of items to sample
  // - deep_scan: boolean (optional, default true) - Whether to do deep content analysis

  const { feed_url, sample_size = 5, deep_scan = true } = inputs;

  if (!feed_url) {
    return {
      success: false,
      error: "feed_url is required",
    };
  }

  try {
    // Step 1: Fetch the RSS feed
    const feedContent = fetchFeed(feed_url);

    // Step 2: Parse and analyze the feed structure
    const analysis = analyzeFeedStructure(feedContent, sample_size, deep_scan);

    // Step 3: Generate field mapping recommendations
    const mappings = generateFieldMappings(analysis);

    // Step 4: Validate data quality
    const validation = validateDataQuality(analysis);

    // Step 5: Generate compatibility report
    const compatibility = checkCompatibility(analysis);

    return {
      success: true,
      feed_url: feed_url,
      analysis: analysis,
      recommended_mappings: mappings,
      validation: validation,
      compatibility: compatibility,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to analyze feed",
      details: error.stack || null,
    };
  }
}

// === HELPER FUNCTIONS ===

// Fetch RSS feed with proper error handling
function fetchFeed(url: string) {
  // In Xano, use the HTTP Request function
  // This is pseudo-code - adapt to Xano's HTTP request syntax
  const response: any = http_request({
    method: "GET",
    url: url,
    headers: {
      "User-Agent": "Nashville-Civic-News-Bot/1.0",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    timeout: 10000,
  });

  if (!response.success) {
    throw new Error(`Failed to fetch feed: ${response.status || "Unknown error"}`);
  }

  return response.body;
}

// Analyze the feed structure and extract all available fields
function analyzeFeedStructure(xmlContent: string, sampleSize: number, deepScan: boolean) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");

  // Check for parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid XML: " + parseError.textContent);
  }

  // Detect feed type
  const feedType = detectFeedType(doc);

  // Get channel/feed metadata
  const channelInfo = extractChannelInfo(doc, feedType);

  // Get all items/entries
  const items = doc.querySelectorAll(feedType === "atom" ? "entry" : "item");
  const itemCount = items.length;

  // Sample items for analysis
  const samplesToAnalyze = Math.min(sampleSize, itemCount);
  const itemAnalysis: any[] = [];
  const allFields = new Set<string>();
  const fieldOccurrences: Record<string, number> = {};
  const fieldSamples: Record<string, any[]> = {};
  const fieldPatterns: Record<string, any> = {};

  for (let i = 0; i < samplesToAnalyze; i++) {
    const item = items[i] as Element;
    const itemFields = extractAllFields(item, deepScan);

    // Track all unique fields
    Object.keys(itemFields).forEach((field) => {
      allFields.add(field);

      // Count occurrences
      fieldOccurrences[field] = (fieldOccurrences[field] || 0) + 1;

      // Collect samples
      if (!fieldSamples[field]) {
        fieldSamples[field] = [];
      }
      if (fieldSamples[field].length < 3 && itemFields[field]) {
        fieldSamples[field].push(itemFields[field]);
      }

      // Detect patterns
      if (deepScan && itemFields[field]) {
        fieldPatterns[field] = analyzeFieldPattern(itemFields[field], fieldPatterns[field]);
      }
    });

    itemAnalysis.push({
      index: i,
      fields: itemFields,
      fieldCount: Object.keys(itemFields).length,
    });
  }

  // Calculate field reliability (appears in what % of items)
  const fieldReliability: Record<string, number> = {};
  allFields.forEach((field) => {
    fieldReliability[field] = (fieldOccurrences[field] / samplesToAnalyze) * 100;
  });

  return {
    feedType: feedType,
    channelInfo: channelInfo,
    itemCount: itemCount,
    samplesAnalyzed: samplesToAnalyze,
    uniqueFields: Array.from(allFields),
    fieldReliability: fieldReliability,
    fieldSamples: fieldSamples,
    fieldPatterns: fieldPatterns,
    items: itemAnalysis,
    namespaces: extractNamespaces(doc),
    encoding: (doc as any).characterSet || "UTF-8",
  };
}

// Detect if it's RSS 1.0, RSS 2.0, or Atom
function detectFeedType(doc: Document) {
  if (doc.querySelector("rss")) {
    const version = doc.querySelector("rss")?.getAttribute("version");
    return `rss${version || "2.0"}`;
  } else if (doc.querySelector("feed")) {
    return "atom";
  } else if (doc.querySelector("rdf\\:RDF, RDF")) {
    return "rss1.0";
  }
  return "unknown";
}

// Extract channel/feed level information
function extractChannelInfo(doc: Document, feedType: string) {
  const info: Record<string, any> = {};

  if (feedType === "atom") {
    const feed = doc.querySelector("feed");
    if (feed) {
      info.title = feed.querySelector("title")?.textContent;
      info.subtitle = feed.querySelector("subtitle")?.textContent;
      info.updated = feed.querySelector("updated")?.textContent;
      info.id = feed.querySelector("id")?.textContent;
      info.link =
        feed.querySelector('link[rel="alternate"]')?.getAttribute("href") ||
        feed.querySelector("link")?.getAttribute("href");
    }
  } else {
    const channel = doc.querySelector("channel");
    if (channel) {
      info.title = channel.querySelector("title")?.textContent;
      info.description = channel.querySelector("description")?.textContent;
      info.link = channel.querySelector("link")?.textContent;
      info.language = channel.querySelector("language")?.textContent;
      info.lastBuildDate = channel.querySelector("lastBuildDate")?.textContent;
      info.pubDate = channel.querySelector("pubDate")?.textContent;
    }
  }

  return info;
}

// Extract all fields from an item/entry
function extractAllFields(item: Element, deepScan: boolean) {
  const fields: Record<string, any> = {};

  // Standard RSS/Atom fields
  const standardFields = [
    "title",
    "link",
    "description",
    "pubDate",
    "published",
    "updated",
    "summary",
    "content",
    "author",
    "creator",
    "category",
    "guid",
    "id",
    "comments",
    "source",
  ];

  // Check standard fields
  standardFields.forEach((fieldName) => {
    const element = item.querySelector(fieldName);
    if (element) {
      fields[fieldName] = element.textContent?.trim();
    }
  });

  // Check for link as attribute (Atom)
  const linkEl = item.querySelector("link");
  if (linkEl) {
    fields["link"] = linkEl.getAttribute("href") || linkEl.textContent;
    fields["link_rel"] = linkEl.getAttribute("rel");
    fields["link_type"] = linkEl.getAttribute("type");
  }

  // Check for namespaced elements
  const namespaceElements = [
    "content\\:encoded, content",
    "dc\\:creator, creator",
    "dc\\:date, date",
    "media\\:content, media",
    "media\\:thumbnail",
    "enclosure",
    "itunes\\:image",
    "itunes\\:summary",
    "itunes\\:subtitle",
  ];

  namespaceElements.forEach((selector) => {
    const element = item.querySelector(selector);
    if (element) {
      const fieldName = selector.replace("\\:", "_").split(",")[0];

      // Handle different element types
      if (element.tagName.toLowerCase() === "enclosure") {
        fields[fieldName] = {
          url: element.getAttribute("url"),
          type: element.getAttribute("type"),
          length: element.getAttribute("length"),
        };
      } else if (element.tagName.toLowerCase().includes("media")) {
        fields[fieldName] = {
          url: element.getAttribute("url"),
          medium: element.getAttribute("medium"),
          width: element.getAttribute("width"),
          height: element.getAttribute("height"),
          type: element.getAttribute("type"),
        };
      } else {
        fields[fieldName] = element.textContent?.trim() || element.getAttribute("url");
      }
    }
  });

  // Deep scan for all child elements
  if (deepScan) {
    const allElements = item.querySelectorAll("*");
    allElements.forEach((el) => {
      const tagName = el.tagName.toLowerCase();
      if (!fields[tagName] && el.textContent?.trim()) {
        // Check if it has useful content
        const hasChildElements = el.children.length > 0;
        if (!hasChildElements) {
          fields[`auto_${tagName}`] = el.textContent.trim();

          // Also capture attributes
          if (el.attributes.length > 0) {
            const attrs: Record<string, string> = {};
            for (let attr of Array.from(el.attributes)) {
              attrs[attr.name] = attr.value;
            }
            fields[`auto_${tagName}_attrs`] = attrs;
          }
        }
      }
    });
  }

  // Extract images from content
  if (fields.description || fields.content || fields["content_encoded"]) {
    const contentToScan = fields["content_encoded"] || fields.content || fields.description;
    const images = extractImagesFromHTML(contentToScan);
    if (images.length > 0) {
      fields["extracted_images"] = images;
    }
  }

  return fields;
}

// Extract images from HTML content
function extractImagesFromHTML(html: string) {
  const images: any[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];
    const src = match[1];

    // Try to extract alt text
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
    const alt = altMatch ? altMatch[1] : null;

    // Try to extract dimensions
    const widthMatch = imgTag.match(/width=["'](\d+)["']/i);
    const heightMatch = imgTag.match(/height=["'](\d+)["']/i);

    images.push({
      src: src,
      alt: alt,
      width: widthMatch ? parseInt(widthMatch[1]) : null,
      height: heightMatch ? parseInt(heightMatch[1]) : null,
    });
  }

  return images;
}

// Analyze field patterns to understand data format
function analyzeFieldPattern(value: any, existingPattern?: any) {
  const pattern =
    existingPattern || {
      types: new Set<string>(),
      formats: new Set<string>(),
      hasHTML: false,
      hasURL: false,
      hasDate: false,
      avgLength: 0,
      samples: 0,
    };

  // Detect type
  if (typeof value === "string") {
    pattern.types.add("string");

    // Check for HTML
    if (/<[^>]+>/.test(value)) {
      pattern.hasHTML = true;
      pattern.formats.add("html");
    }

    // Check for URLs
    if (/https?:\/\/[^\s]+/.test(value)) {
      pattern.hasURL = true;
      pattern.formats.add("url");
    }

    // Check for date patterns
    if (isValidDate(value)) {
      pattern.hasDate = true;
      pattern.formats.add("date");
    }

    // Update average length
    pattern.avgLength = ((pattern.avgLength * pattern.samples) + value.length) / (pattern.samples + 1);
  } else if (typeof value === "object") {
    pattern.types.add("object");
    pattern.formats.add("structured");
  }

  pattern.samples++;
  return pattern;
}

// Check if string is a valid date
function isValidDate(str: string) {
  const date = new Date(str);
  return date instanceof Date && !isNaN(date as any);
}

// Extract namespaces from document
function extractNamespaces(doc: Document) {
  const namespaces: Record<string, string> = {};
  const root = doc.documentElement;

  if (root) {
    for (let attr of Array.from(root.attributes)) {
      if (attr.name.startsWith("xmlns:")) {
        const prefix = attr.name.replace("xmlns:", "");
        namespaces[prefix] = attr.value;
      }
    }
  }

  return namespaces;
}

// Generate recommended field mappings
function generateFieldMappings(analysis: any) {
  const mappings: any = {
    title: null,
    link: null,
    description: null,
    date: null,
    image: null,
    author: null,
    category: null,
    content: null,
  };

  const { fieldReliability, fieldSamples } = analysis;

  // Map title
  const titleCandidates = ["title", "auto_title"];
  mappings.title = findBestField(titleCandidates, fieldReliability, 90);

  // Map link
  const linkCandidates = ["link", "guid", "id", "auto_link"];
  mappings.link = findBestField(linkCandidates, fieldReliability, 90);

  // Map description
  const descCandidates = ["description", "summary", "content", "content_encoded", "auto_description"];
  mappings.description = findBestField(descCandidates, fieldReliability, 70);

  // Map content (full content)
  const contentCandidates = ["content_encoded", "content", "description"];
  mappings.content = findBestField(contentCandidates, fieldReliability, 50);

  // Map date
  const dateCandidates = ["pubDate", "published", "updated", "dc_date", "auto_pubdate"];
  mappings.date = findBestField(dateCandidates, fieldReliability, 70);

  // Map image
  mappings.image = findImageMapping(analysis);

  // Map author
  const authorCandidates = ["author", "dc_creator", "creator", "auto_author"];
  mappings.author = findBestField(authorCandidates, fieldReliability, 30);

  // Map category
  const categoryCandidates = ["category", "auto_category", "tags"];
  mappings.category = findBestField(categoryCandidates, fieldReliability, 30);

  // Add confidence scores
  Object.keys(mappings).forEach((key) => {
    const value = mappings[key];
    if (value && typeof value === "string") {
      mappings[key] = {
        field: value,
        reliability: fieldReliability[value] || 0,
        sample: fieldSamples[value]?.[0] || null,
      };
    }
  });

  return mappings;
}

// Find best field based on reliability threshold
function findBestField(
  candidates: string[],
  reliability: Record<string, number>,
  threshold: number
) {
  for (let field of candidates) {
    if (reliability[field] >= threshold) {
      return field;
    }
  }
  // If none meet threshold, return the most reliable one
  let best: string | null = null;
  let bestScore = 0;
  for (let field of candidates) {
    if (reliability[field] > bestScore) {
      best = field;
      bestScore = reliability[field];
    }
  }
  return best;
}

// Find best image mapping
function findImageMapping(analysis: any) {
  const { fieldReliability, fieldSamples } = analysis;
  const imageFields: any[] = [];

  // Check media namespace
  if (fieldReliability["media_content"] > 50) {
    imageFields.push({
      source: "media_content",
      type: "media",
      reliability: fieldReliability["media_content"],
    });
  }

  if (fieldReliability["media_thumbnail"] > 50) {
    imageFields.push({
      source: "media_thumbnail",
      type: "media",
      reliability: fieldReliability["media_thumbnail"],
    });
  }

  // Check enclosure
  if (fieldReliability["enclosure"] > 50) {
    const sample = fieldSamples["enclosure"]?.[0];
    if (sample?.type?.startsWith("image")) {
      imageFields.push({
        source: "enclosure",
        type: "enclosure",
        reliability: fieldReliability["enclosure"],
      });
    }
  }

  // Check extracted images from content
  if (fieldReliability["extracted_images"] > 30) {
    imageFields.push({
      source: "extracted_images",
      type: "html_extraction",
      reliability: fieldReliability["extracted_images"],
    });
  }

  // Check iTunes namespace (for podcasts that might have images)
  if (fieldReliability["itunes_image"] > 50) {
    imageFields.push({
      source: "itunes_image",
      type: "itunes",
      reliability: fieldReliability["itunes_image"],
    });
  }

  // Sort by reliability and return best option
  imageFields.sort((a, b) => b.reliability - a.reliability);
  return imageFields[0] || null;
}

// Validate data quality
function validateDataQuality(analysis: any) {
  const issues: any[] = [];
  const warnings: any[] = [];
  const suggestions: any[] = [];

  const { fieldReliability, fieldPatterns, itemCount } = analysis;

  // Check if feed has items
  if (itemCount === 0) {
    issues.push({
      level: "error",
      message: "Feed contains no items",
      field: "items",
    });
  } else if (itemCount < 5) {
    warnings.push({
      level: "warning",
      message: `Feed only contains ${itemCount} items`,
      field: "items",
    });
  }

  // Check for required fields
  const requiredFields = ["title", "link", "description"];
  requiredFields.forEach((field) => {
    if (!fieldReliability[field] || fieldReliability[field] < 50) {
      issues.push({
        level: "error",
        message: `Missing or unreliable field: ${field}`,
        field: field,
        reliability: fieldReliability[field] || 0,
      });
    }
  });

  // Check for date fields
  const dateFields = ["pubDate", "published", "updated", "dc_date"];
  const hasReliableDate = dateFields.some((field) => fieldReliability[field] > 70);
  if (!hasReliableDate) {
    warnings.push({
      level: "warning",
      message: "No reliable date field found",
      field: "date",
    });
  }

  // Check for images
  const imageFields = ["media_content", "media_thumbnail", "enclosure", "extracted_images"];
  const hasImages = imageFields.some((field) => fieldReliability[field] > 30);
  if (!hasImages) {
    suggestions.push({
      level: "info",
      message: "No image sources found in feed",
      field: "image",
    });
  }

  // Check for HTML in fields that shouldn't have it
  Object.entries(fieldPatterns).forEach(([field, pattern]: any) => {
    if (field === "title" && pattern.hasHTML) {
      warnings.push({
        level: "warning",
        message: "Title field contains HTML markup",
        field: field,
      });
    }
  });

  // Check encoding issues
  if (analysis.encoding !== "UTF-8") {
    warnings.push({
      level: "warning",
      message: `Feed uses ${analysis.encoding} encoding instead of UTF-8`,
      field: "encoding",
    });
  }

  return {
    isValid: issues.length === 0,
    issues: issues,
    warnings: warnings,
    suggestions: suggestions,
    qualityScore: calculateQualityScore(issues, warnings),
  };
}

// Calculate overall quality score
function calculateQualityScore(issues: any[], warnings: any[]) {
  let score = 100;
  score -= issues.length * 20;
  score -= warnings.length * 5;
  return Math.max(0, Math.min(100, score));
}

// Check compatibility with your system
function checkCompatibility(analysis: any) {
  const compatibility: any = {
    isCompatible: true,
    requiresProcessing: [],
    recommendations: [],
  };

  // Check feed type compatibility
  if (!["rss2.0", "atom", "rss1.0"].includes(analysis.feedType)) {
    compatibility.isCompatible = false;
    compatibility.requiresProcessing.push({
      issue: "Unknown feed type",
      solution: "Manual parsing may be required",
    });
  }

  // Check for namespace support
  if (analysis.namespaces && Object.keys(analysis.namespaces).length > 0) {
    const supportedNamespaces = ["dc", "content", "media", "atom"];
    Object.keys(analysis.namespaces).forEach((ns) => {
      if (!supportedNamespaces.includes(ns)) {
        compatibility.recommendations.push({
          namespace: ns,
          message: `Custom namespace '${ns}' detected - may need special handling`,
        });
      }
    });
  }

  // Check field mapping completeness
  const mappings = generateFieldMappings(analysis);
  Object.entries(mappings).forEach(([field, mapping]: any) => {
    if (!mapping || (mapping.reliability && mapping.reliability < 50)) {
      compatibility.requiresProcessing.push({
        issue: `Weak mapping for ${field}`,
        solution: `Consider fallback processing for ${field}`,
      });
    }
  });

  // Generate processing recommendations
  if (analysis.fieldPatterns) {
    Object.entries(analysis.fieldPatterns).forEach(([field, pattern]: any) => {
      if (pattern.hasHTML && field !== "content" && field !== "description") {
        compatibility.recommendations.push({
          field: field,
          message: "Contains HTML - consider stripping tags",
        });
      }
    });
  }

  return compatibility;
}

// === UTILITY FUNCTIONS FOR XANO ===

// Store mapping configuration
export function storeMappingConfig(feed_id: string, mappings: any, analysis: any) {
  // Store in your Xano database
  return {
    table: "rss_feed_mappings",
    data: {
      feed_id: feed_id,
      mappings: JSON.stringify(mappings),
      field_list: analysis.uniqueFields,
      reliability_scores: analysis.fieldReliability,
      last_analyzed: new Date().toISOString(),
      quality_score: calculateQualityScore([], []),
    },
  };
}

// Generate parsing function based on mappings
export function generateParsingInstructions(mappings: any) {
  const instructions: any = {
    title: `item.querySelector('${mappings.title.field}')?.textContent`,
    link: `item.querySelector('${mappings.link.field}')?.textContent || item.querySelector('${mappings.link.field}')?.getAttribute('href')`,
    description: `item.querySelector('${mappings.description.field}')?.textContent`,
    date: `item.querySelector('${mappings.date.field}')?.textContent`,
    image: null,
  };

  // Special handling for images
  if (mappings.image) {
    switch (mappings.image.type) {
      case "media":
        instructions.image = `item.querySelector('${mappings.image.source}')?.getAttribute('url')`;
        break;
      case "enclosure":
        instructions.image = `item.querySelector('enclosure[type^="image"]')?.getAttribute('url')`;
        break;
      case "html_extraction":
        instructions.image = `extractFirstImage(item.querySelector('description')?.textContent)`;
        break;
    }
  }

  return instructions;
}

// === EXPORT FOR XANO ===
// In Xano, this would be your main function
// return analyzeRSSFeed(inputs);

