// src/index.ts
import { renderDocx, processTemplateString } from "./processor";
import { mergeWordTextRuns } from "./document-xml-parser";
import { TemplateEngineOptions } from "./types";
import { JsonObject } from "./types";
import TemplateEngine from "./engine";

export {
  TemplateEngine,
  renderDocx,
  processTemplateString,
  mergeWordTextRuns,
  TemplateEngineOptions,
  JsonObject
};
