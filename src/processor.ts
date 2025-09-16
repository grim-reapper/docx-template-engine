// src/processor.ts
import {TemplateEngine} from './engine';
import { TemplateParser } from './parser';
import { JsonObject, TemplateEngineOptions } from './types';

/**
 * Render a .docx template (path or Buffer) using TemplateEngine
 * @param templateInput - path to .docx or Buffer of .docx
 * @param data - JSON data binding for template
 * @param options - engine options (e.g. companyName)
 */
export async function renderDocx(
  templateInput: Buffer | string,
  data: JsonObject,
  options: TemplateEngineOptions = {}
): Promise<Buffer> {
  const engine = new TemplateEngine(templateInput, options);
  return engine.generate(data);
}

/**
 * Process a plain template string (not a .docx) and return processed string.
 * This runs add_more repeaters, conditional blocks and variable replacements.
 *
 * Useful for unit tests, previews, or templates stored as plain text.
 *
 * @param template - template string (may include {{var}}, [[cond]]...[[end:cond]], <<add_more path>>...<<end:add_more>>)
 * @param data - JSON data to bind to template
 * @param options - options (currently supports companyName)
 */
export function processTemplateString(
  template: string,
  data: JsonObject,
  options: TemplateEngineOptions = {}
): string {
  const parser = new TemplateParser(data);

  let out = template;

  // optional company_name replacement
  if (options.companyName) {
    out = parser.replaceSimplePlaceholder(out, 'company_name', options.companyName);
  }

  // run repeaters first so nested conditions/vars inside repeaters get proper scope
  out = parser.processAddMoreRaw(out, data);

  // run conditions (which will in turn re-run nested repeaters/vars)
  out = parser.processConditionsRaw(out, data);

  // final pass for remaining simple variables
  out = parser.replaceAllVariables(out, data);

  return out;
}

export default {
  renderDocx,
  processTemplateString
};
