import fs from 'fs';
import path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

// Mock TemplateEngine class for testing mergeSplitPlaceholders
class MockTemplateEngine {
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;

  constructor() {
    this.xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    this.xmlBuilder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  }

  mergeSplitPlaceholders(xml: string): string {
    // Parse XML into structured format
    const xmlObj = this.xmlParser.parse(xml);

    // Process the document body
    if (xmlObj['w:document']?.['w:body']) {
      this.processBody(xmlObj['w:document']['w:body']);
    }

    // Convert back to XML string
    return this.xmlBuilder.build(xmlObj);
  }

  private processBody(body: any): void {
    if (!body['w:p']) return;

    const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];

    for (const paragraph of paragraphs) {
      this.processParagraph(paragraph);
    }
  }

  private processParagraph(paragraph: any): void {
    if (!paragraph['w:r']) return;

    const runs = Array.isArray(paragraph['w:r']) ? paragraph['w:r'] : [paragraph['w:r']];
    const mergedRuns: any[] = [];

    // Collect all text content and analyze placeholder patterns
    const paragraphText = this.getParagraphText(runs);
    const placeholderFragments = this.findPlaceholderFragments(paragraphText);

    if (placeholderFragments.length === 0) {
      // No placeholders to merge, keep original structure
      return;
    }

    // Process runs and merge placeholders
    let runIndex = 0;
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const textContent = this.extractTextFromRun(run);

      if (!textContent) {
        mergedRuns.push(run);
        continue;
      }

      // Check if this run contains part of a placeholder that needs merging
      const shouldMerge = this.shouldMergeRun(textContent, placeholderFragments);

      if (shouldMerge) {
        // Collect consecutive runs that belong to the same placeholder
        const mergedText = this.mergeRunSequence(runs, i, placeholderFragments);
        const mergedRun = this.createMergedRun(runs.slice(i, i + this.getMergeRunCount(runs, i, placeholderFragments)), mergedText);
        mergedRuns.push(mergedRun);

        // Skip the runs that were merged
        i += this.getMergeRunCount(runs, i, placeholderFragments) - 1;
      } else {
        mergedRuns.push(run);
      }
    }

    // Update the paragraph with merged runs
    if (mergedRuns.length === 1) {
      paragraph['w:r'] = mergedRuns[0];
    } else {
      paragraph['w:r'] = mergedRuns;
    }
  }

  private getParagraphText(runs: any[]): string {
    let fullText = '';
    for (const run of runs) {
      fullText += this.extractTextFromRun(run);
    }
    return fullText;
  }

  private findPlaceholderFragments(text: string): any[] {
    const fragments: any[] = [];
    const regex = /(\{\{[^}]*\}?\}?|\}\})/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      fragments.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        isComplete: match[0].match(/^\{\{[^}]+\}\}$/) !== null
      });
    }

    return fragments;
  }

  private shouldMergeRun(textContent: string, placeholderFragments: any[]): boolean {
    // Check if this text contains placeholder fragments that need merging
    for (const fragment of placeholderFragments) {
      if (textContent.includes(fragment.text) && !fragment.isComplete) {
        return true;
      }
    }
    return false;
  }

  private mergeRunSequence(runs: any[], startIndex: number, placeholderFragments: any[]): string {
    let mergedText = '';
    let currentIndex = startIndex;

    // Find the first incomplete fragment and merge until we complete it
    while (currentIndex < runs.length) {
      const textContent = this.extractTextFromRun(runs[currentIndex]);
      if (!textContent) break;

      mergedText += textContent;

      // Check if we have a complete placeholder now
      if (this.hasCompletePlaceholder(mergedText)) {
        break;
      }

      currentIndex++;
    }

    return mergedText;
  }

  private hasCompletePlaceholder(text: string): boolean {
    const openCount = (text.match(/\{\{/g) || []).length;
    const closeCount = (text.match(/\}\}/g) || []).length;
    return openCount > 0 && openCount === closeCount;
  }

  private getMergeRunCount(runs: any[], startIndex: number, placeholderFragments: any[]): number {
    let count = 1;
    let currentText = '';

    for (let i = startIndex; i < runs.length; i++) {
      const textContent = this.extractTextFromRun(runs[i]);
      if (!textContent) break;

      currentText += textContent;

      if (this.hasCompletePlaceholder(currentText)) {
        count = i - startIndex + 1;
        break;
      }
    }

    return count;
  }

  private createMergedRun(runsToMerge: any[], mergedText: string): any {
    // Use attributes from the first run that has formatting
    let mergedAttrs = {};
    let xmlSpacePreserve = false;

    for (const run of runsToMerge) {
      // Get attributes from the run (excluding w:t)
      const runAttrs = this.getRunAttributes(run);
      if (Object.keys(runAttrs).length > 0 && Object.keys(mergedAttrs).length === 0) {
        mergedAttrs = runAttrs;
      }

      // Check for xml:space preserve
      const textElement = run['w:t'];
      if (textElement && typeof textElement === 'object' && textElement['@_xml:space'] === 'preserve') {
        xmlSpacePreserve = true;
      }
    }

    return {
      ...mergedAttrs,
      'w:t': {
        '#text': mergedText,
        ...(xmlSpacePreserve ? { '@_xml:space': 'preserve' } : {})
      }
    };
  }

  private extractTextFromRun(run: any): string {
    if (!run['w:t']) return '';

    const textElement = run['w:t'];
    if (typeof textElement === 'string') {
      return textElement;
    }

    // Handle object format with attributes
    if (typeof textElement === 'object' && textElement['#text']) {
      return textElement['#text'];
    }

    return '';
  }

  private getRunAttributes(run: any): any {
    const attrs = { ...run };
    delete attrs['w:t'];
    return attrs;
  }

  private findCompletePlaceholders(text: string): string[] {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(text)) !== null) {
      matches.push(match[0]);
    }

    return matches;
  }

  private mergePlaceholderParts(text: string, completePlaceholders: string[]): string {
    let result = text;

    for (const placeholder of completePlaceholders) {
      // Remove any fragmented parts of this placeholder from the text
      const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fragmentRegex = new RegExp(`{{[^}]*${escapedPlaceholder.slice(2, -2)}[^}]*}}`, 'g');
      result = result.replace(fragmentRegex, placeholder);
    }

    return result;
  }

  private isPlaceholderComplete(text: string): boolean {
    const openBraces = (text.match(/\{\{/g) || []).length;
    const closeBraces = (text.match(/\}\}/g) || []).length;
    return openBraces === closeBraces && openBraces > 0;
  }

  private finalizeMergedRun(mergedRuns: any[], text: string, attrs: any, placeholderRuns: any[] = []): void {
    // Preserve xml:space attribute from any of the merged runs
    let xmlSpacePreserve = false;
    if (placeholderRuns.length > 0) {
      for (const run of placeholderRuns) {
        const textElement = run['w:t'];
        if (textElement && typeof textElement === 'object' && textElement['@_xml:space'] === 'preserve') {
          xmlSpacePreserve = true;
          break;
        }
      }
    }

    const mergedRun = {
      ...attrs,
      'w:t': {
        '#text': text,
        ...(xmlSpacePreserve ? { '@_xml:space': 'preserve' } : {})
      }
    };
    mergedRuns.push(mergedRun);
  }
}

describe("Debug Split Placeholder Merging", () => {
  it("should debug the actual document.xml split placeholders", () => {
    // Read the actual document.xml file
    const docXmlPath = path.join(__dirname, '..', 'document.xml');
    if (fs.existsSync(docXmlPath)) {
      const xmlContent = fs.readFileSync(docXmlPath, 'utf-8');

      // Check for the specific problematic paragraph
      const problematicParagraph = xmlContent.match(/<w:p w14:paraId="20CDE098"[\s\S]*?<\/w:p>/);
      if (problematicParagraph) {
        console.log('🔍 Found problematic paragraph:');
        console.log(problematicParagraph[0]);

        const engine = new MockTemplateEngine();
        const result = engine.mergeSplitPlaceholders(problematicParagraph[0]);

        console.log('\n📝 Merged result:');
        console.log(result);

        // Verify that the split placeholders are properly merged
        expect(result).toContain('{{current_rent}}');
        expect(result).toContain('{{new_rent}}');
        expect(result).toContain('{{new_rent_frequency}}');

        // Check that fragmented parts are gone
        expect(result).not.toContain('{{new_re');
        expect(result).not.toContain('nt}}');
        expect(result).not.toContain('{{new_rent_frequency');

        // Verify the structure is still valid XML
        expect(result).toContain('<w:p');
        expect(result).toContain('<w:r');
        expect(result).toContain('<w:t');

        console.log('✅ Split placeholders successfully merged!');
      } else {
        console.log('❌ Could not find the problematic paragraph');
      }
    } else {
      console.log('⚠️  document.xml not found for debugging');
    }
  });

  it("should test the exact split pattern from document.xml", () => {
    const exactSplitPattern = `<w:p w14:paraId="20CDE098" w14:textId="78FCB468" w:rsidR="00766DD9" w:rsidRDefault="004E36FA">
  <w:pPr><w:rPr><w:rFonts w:cs="Arial"/></w:rPr></w:pPr>
  <w:r><w:rPr><w:rFonts w:cs="Arial"/></w:rPr><w:t>This letter is to notify you that the rent for the property will increase from the current amount of £{{current_rent}}</w:t></w:r>
  <w:r><w:t xml:space="preserve"> {{rent_frequency.weekly}}{{rent_frequency.monthly}}{{rent_frequency.yearly}} to £{{new_re</w:t></w:r>
  <w:r><w:t>nt}} {{new_rent_frequency</w:t></w:r>
  <w:r><w:t>}}</w:t></w:r>
</w:p>`;

    console.log('🔍 Testing exact split pattern from document.xml');
    console.log('Original:');
    console.log(exactSplitPattern);

    const engine = new MockTemplateEngine();
    const result = engine.mergeSplitPlaceholders(exactSplitPattern);

    console.log('\n📝 After merging:');
    console.log(result);

    // Verify specific placeholders are merged
    expect(result).toContain('{{current_rent}}');
    expect(result).toContain('{{new_rent}}');
    expect(result).toContain('{{new_rent_frequency}}');

    // Verify fragmentation is fixed
    expect(result).not.toContain('{{new_re');
    expect(result).not.toContain('nt}} ');
    expect(result).not.toContain('{{new_rent_frequency');

    // Make sure we preserved the formatting
    expect(result).toContain('<w:rPr><w:rFonts w:cs="Arial"/></w:rPr>');
    expect(result).toContain('xml:space="preserve"');

    console.log('✅ Exact split pattern successfully fixed!');
  });
});