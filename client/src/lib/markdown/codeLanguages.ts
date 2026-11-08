//src/lib/markdown/codeLanguages.ts
import { common, createLowlight } from "lowlight";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import nginx from "highlight.js/lib/languages/nginx";

export const codeLanguagesMap = {
  ...common,
  dockerfile,
  nginx,
};

export const lowlight = createLowlight(codeLanguagesMap);

export const CODE_LANGUAGE_OPTIONS = [
  "bash",
  "c",
  "cpp",
  "css",
  "diff",
  "dockerfile",
  "go",
  "graphql",
  "ini",
  "java",
  "javascript",
  "json",
  "kotlin",
  "lua",
  "makefile",
  "markdown",
  "nginx",
  "php",
  "plaintext",
  "python",
  "r",
  "ruby",
  "rust",
  "scss",
  "shell",
  "sql",
  "swift",
  "toml",
  "typescript",
  "xml",
  "yaml",
] as const;
