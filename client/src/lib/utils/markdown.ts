//src/lib/utils/markdown.ts
import GithubSlugger from "github-slugger";

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3 | 4;
}

const decodeBasicEntities = (raw: string): string => {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
};

export function estimateReadingTimeMinutes(content: string): number {
  if (!content || !content.trim()) return 1;

  const withoutPreBlocks = content
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/```[\s\S]*?```/g, " ");

  const plainText = decodeBasicEntities(
    withoutPreBlocks.replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) return 1;

  const wordCount = plainText.split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function extractTocHeadings(content: string): TocHeading[] {
  if (!content || !content.trim()) return [];

  const slugger = new GithubSlugger();
  const headings: TocHeading[] = [];

  const withoutCode = content
    .replace(/<pre[\s\S]*?<\/pre>/gi, "")
    .replace(/```[\s\S]*?```/g, "");

  const htmlHeadingRegex = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null = null;

  while ((match = htmlHeadingRegex.exec(withoutCode)) !== null) {
    const rawLevel = parseInt(match[1] || "2", 10);
    const innerHtml = match[2] || "";
    const text = decodeBasicEntities(innerHtml.replace(/<[^>]+>/g, ""))
      .replace(/\s+/g, " ")
      .trim();

    if (!text) continue;

    const normalizedLevel: 2 | 3 | 4 =
      rawLevel <= 2 ? 2 : rawLevel === 3 ? 3 : 4;
    const id = slugger.slug(text);

    headings.push({
      id,
      text,
      level: normalizedLevel,
    });
  }

  return headings;
}
