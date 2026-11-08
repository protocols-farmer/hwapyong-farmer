//src/components/shared/PostContent.tsx
"use client";

import React, { useMemo, useState } from "react";
import GithubSlugger from "github-slugger";
import { Check, Copy } from "lucide-react";
import { lowlight } from "@/lib/markdown/codeLanguages";
function renderHastNodes(nodes: any[], keyPrefix = "hast"): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "text") {
      return node.value;
    }
    if (node.type === "element") {
      const Tag = (node.tagName || "span") as React.ElementType;
      const className = Array.isArray(node.properties?.className)
        ? node.properties.className.join(" ")
        : node.properties?.className;
      return (
        <Tag key={key} className={className}>
          {node.children ? renderHastNodes(node.children, key) : null}
        </Tag>
      );
    }
    return null;
  });
}

function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const normalizedCode = code.replace(/\n$/, "");

  const { highlightedNodes, detectedLanguage } = useMemo(() => {
    try {
      const cleanLang = language?.trim().toLowerCase() || "";
      if (cleanLang && lowlight.registered(cleanLang)) {
        const tree = lowlight.highlight(cleanLang, normalizedCode);
        return {
          highlightedNodes: renderHastNodes(tree.children, "hl"),
          detectedLanguage: cleanLang,
        };
      }
      const autoTree = lowlight.highlightAuto(normalizedCode);
      return {
        highlightedNodes: renderHastNodes(autoTree.children, "hl-auto"),
        detectedLanguage: cleanLang || autoTree.data?.language || "code",
      };
    } catch (err) {
      console.error("[PostContent.CodeBlock] Syntax highlight failed", err);
      return {
        highlightedNodes: [normalizedCode],
        detectedLanguage: language || "code",
      };
    }
  }, [normalizedCode, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[PostContent.CodeBlock] Clipboard write failed", err);
    }
  };

  return (
    <div className="my-4 border-3 border-double bg-card">
      <div className="flex items-center justify-between border-b-3 border-double px-3 py-1.5 bg-background/60">
        <span className="bg-primary text-primary-foreground font-bold px-1.5 py-0.5 text-xs border-2 border-double uppercase">
          {detectedLanguage || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="border-2 border-double bg-background px-2 py-0.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-sm leading-6 m-0 border-0 bg-transparent">
        <code className="hljs">{highlightedNodes}</code>
      </pre>
    </div>
  );
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "del",
  "strike",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

export default function PostContent({ content }: { content: string }) {
  const renderedElements = useMemo(() => {
    if (!content || !content.trim()) return null;

    const trimmed = content.trim();
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(trimmed);

    if (!looksLikeHtml || typeof DOMParser === "undefined") {
      return trimmed.split(/\n{2,}/).map((paragraph, idx) => (
        <p key={`plain-${idx}`} className="whitespace-pre-line">
          {paragraph}
        </p>
      ));
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, "text/html");
    const slugger = new GithubSlugger();

    const convertDomNode = (node: Node, key: string): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const el = node as Element;
      const rawTag = el.tagName.toLowerCase();

      if (
        rawTag === "script" ||
        rawTag === "style" ||
        rawTag === "iframe" ||
        rawTag === "object" ||
        rawTag === "embed" ||
        rawTag === "form"
      ) {
        return null;
      }

      if (!ALLOWED_TAGS.has(rawTag)) {
        return Array.from(el.childNodes).map((child, idx) =>
          convertDomNode(child, `${key}-${idx}`),
        );
      }

      if (rawTag === "pre") {
        const codeEl = el.querySelector("code");
        const rawCode = codeEl
          ? codeEl.textContent || ""
          : el.textContent || "";

        let lang: string | null = null;
        const classAttr =
          codeEl?.getAttribute("class") || el.getAttribute("class") || "";
        const langMatch = classAttr.match(/language-([a-z0-9_+-]+)/i);
        if (langMatch?.[1]) {
          lang = langMatch[1].toLowerCase();
        } else if (el.getAttribute("data-language")) {
          lang = el.getAttribute("data-language");
        }

        return <CodeBlock key={key} code={rawCode} language={lang} />;
      }

      if (rawTag === "br") {
        return <br key={key} />;
      }

      if (rawTag === "hr") {
        return <hr key={key} />;
      }

      if (rawTag === "img") {
        const src = el.getAttribute("src")?.trim() || "";
        if (!/^https?:\/\//i.test(src)) return null;
        const alt = el.getAttribute("alt") || "";
        return (
          <img
            key={key}
            src={src}
            alt={alt}
            loading="lazy"
            className="border-3 border-double max-w-full h-auto my-3"
          />
        );
      }

      const children = Array.from(el.childNodes).map((child, idx) =>
        convertDomNode(child, `${key}-${idx}`),
      );

      if (
        rawTag === "h1" ||
        rawTag === "h2" ||
        rawTag === "h3" ||
        rawTag === "h4" ||
        rawTag === "h5" ||
        rawTag === "h6"
      ) {
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        const headingId = text ? slugger.slug(text) : undefined;
        const HeadingTag =
          rawTag === "h1" || rawTag === "h2"
            ? "h2"
            : rawTag === "h3"
              ? "h3"
              : "h4";
        return (
          <HeadingTag key={key} id={headingId}>
            {children}
          </HeadingTag>
        );
      }

      if (rawTag === "a") {
        const href = el.getAttribute("href")?.trim() || "";
        const isHash = href.startsWith("#");
        const isHttp = /^https?:\/\//i.test(href);

        if (!isHash && !isHttp) {
          return <span key={key}>{children}</span>;
        }

        return (
          <a
            key={key}
            href={href}
            {...(isHttp
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {children}
          </a>
        );
      }

      if (rawTag === "table") {
        return (
          <div key={key} className="overflow-x-auto my-4">
            <table>{children}</table>
          </div>
        );
      }

      const SafeTag = rawTag as React.ElementType;
      return <SafeTag key={key}>{children}</SafeTag>;
    };

    return Array.from(doc.body.childNodes).map((node, index) =>
      convertDomNode(node, `root-${index}`),
    );
  }, [content]);

  return <div className="post-prose max-w-3xl">{renderedElements}</div>;
}
