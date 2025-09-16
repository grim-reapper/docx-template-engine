import fs from 'fs';
import PizZip from 'pizzip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { TemplateParser } from '../parser';
import { mergeWordTextRuns } from '../document-xml-parser';
import { TemplateEngineOptions, JsonObject } from '../types';


export class TemplateEngine {
  private zip: PizZip;
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;
  private options: TemplateEngineOptions;


  constructor(templateInput: Buffer | string, options: TemplateEngineOptions = {}) {
    const buf = Buffer.isBuffer(templateInput) ? templateInput : fs.readFileSync(templateInput);
    this.zip = new PizZip(buf);
    this.xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    this.xmlBuilder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    this.options = options;
  }


  public async generate(data: JsonObject): Promise<Buffer> {
    const docXmlFile = this.zip.file('word/document.xml');
    if (!docXmlFile) throw new Error('word/document.xml not found in .docx');
    const xml = docXmlFile.asText();

    // Merge text runs before placeholder replacement
    const mergedXml = mergeWordTextRuns(xml);

    const parser = new TemplateParser(data);


    let out = mergedXml;
    if (this.options.companyName) {
      out = parser.replaceSimplePlaceholder(out, 'company_name', this.options.companyName);
    }
    out = parser.processAddMoreRaw(out, data);
    out = parser.processConditionsRaw(out, data);
    out = parser.replaceAllVariables(out, data);


    this.zip.file('word/document.xml', out);
    return this.zip.generate({ type: 'nodebuffer' });
  }
}


export default TemplateEngine;