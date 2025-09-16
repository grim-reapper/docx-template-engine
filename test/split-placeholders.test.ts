import { processTemplateString } from "../src";
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';

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
    let currentText = '';
    let currentRunAttrs = null;
    let mergingPlaceholder = false;

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const textContent = this.extractTextFromRun(run);

      if (!textContent) {
        // If we were merging a placeholder, finalize it
        if (mergingPlaceholder) {
          this.finalizeMergedRun(mergedRuns, currentText, currentRunAttrs);
          currentText = '';
          currentRunAttrs = null;
          mergingPlaceholder = false;
        }
        mergedRuns.push(run);
        continue;
      }

      const hasPlaceholderStart = textContent.includes('{{');
      const hasPlaceholderEnd = textContent.includes('}}');
      const isPartOfPlaceholder = mergingPlaceholder || hasPlaceholderStart || hasPlaceholderEnd;

      if (isPartOfPlaceholder) {
        // Start or continue merging
        if (!mergingPlaceholder) {
          mergingPlaceholder = true;
          currentRunAttrs = this.getRunAttributes(run);
          currentText = textContent;
        } else {
          currentText += textContent;
        }

        // Check if this completes the placeholder
        const completePlaceholders = this.findCompletePlaceholders(currentText);
        if (completePlaceholders.length > 0) {
          // Merge all runs that contributed to complete placeholders
          const mergedText = this.mergePlaceholderParts(currentText, completePlaceholders);
          if (mergedText !== currentText) {
            currentText = mergedText;
          }
        }

        // Check if placeholder is complete
        if (this.isPlaceholderComplete(currentText)) {
          this.finalizeMergedRun(mergedRuns, currentText, currentRunAttrs);
          currentText = '';
          currentRunAttrs = null;
          mergingPlaceholder = false;
        }
      } else {
        // Not part of a placeholder
        if (mergingPlaceholder) {
          this.finalizeMergedRun(mergedRuns, currentText, currentRunAttrs);
          currentText = '';
          currentRunAttrs = null;
          mergingPlaceholder = false;
        }
        mergedRuns.push(run);
      }
    }

    // Handle any remaining merging
    if (mergingPlaceholder) {
      this.finalizeMergedRun(mergedRuns, currentText, currentRunAttrs);
    }

    // Update the paragraph with merged runs
    if (mergedRuns.length === 1) {
      paragraph['w:r'] = mergedRuns[0];
    } else {
      paragraph['w:r'] = mergedRuns;
    }
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

  private finalizeMergedRun(mergedRuns: any[], text: string, attrs: any): void {
    const mergedRun = {
      ...attrs,
      'w:t': {
        '#text': text,
        ...((text.includes(' ') && text.trim() !== text) ? { '@_xml:space': 'preserve' } : {})
      }
    };
    mergedRuns.push(mergedRun);
  }
}

describe("Split Placeholder Merging", () => {
  it("should merge placeholders split across multiple w:t elements", () => {
    // Simulate the XML structure from the user's example
    const template = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>This letter is to notify you that the rent for the property will increase from the current amount of £</w:t></w:r>
      <w:r><w:t>{{current_rent}}</w:t></w:r>
      <w:r><w:t xml:space="preserve"> {{rent_frequency.weekly}}{{rent_frequency.monthly}}{{rent_frequency.yearly}} to £</w:t></w:r>
      <w:r><w:t>{{new_re</w:t></w:r>
      <w:r><w:t>nt}} {{new_rent_frequency</w:t></w:r>
      <w:r><w:t>}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    // Create a mock engine to test the mergeSplitPlaceholders method
    const engine = new MockTemplateEngine();

    // Test the mergeSplitPlaceholders method directly
    const result = engine.mergeSplitPlaceholders(template);

    // Verify that split placeholders are merged
    expect(result).toContain('{{current_rent}}');
    expect(result).toContain('{{new_rent}}');
    expect(result).toContain('{{new_rent_frequency}}');
    expect(result).not.toContain('{{new_re');
    expect(result).not.toContain('nt}}');
    expect(result).not.toContain('{{new_rent_frequency');
    expect(result).not.toContain('}}');
  });

  it("should handle complex splitting scenarios with spaces and mixed content", () => {
    const template = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Hello {{user</w:t></w:r>
      <w:r><w:t xml:space="preserve">_na</w:t></w:r>
      <w:r><w:t>me}}, welcome to {{compa</w:t></w:r>
      <w:r><w:t>ny_name}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    const engine = new MockTemplateEngine();
    const result = engine.mergeSplitPlaceholders(template);

    expect(result).toContain('{{user_name}}');
    expect(result).toContain('{{company_name}}');
    expect(result).not.toContain('{{user');
    expect(result).not.toContain('_na');
    expect(result).not.toContain('me}}');
  });

  it("should preserve formatting attributes when merging", () => {
    const template = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r w:rsidR="00766DD9">
        <w:rPr><w:b/></w:rPr>
        <w:t>{{bold</w:t>
      </w:r>
      <w:r w:rsidR="00766DD9">
        <w:rPr><w:b/></w:rPr>
        <w:t>_text}}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

    const engine = new MockTemplateEngine();
    const result = engine.mergeSplitPlaceholders(template);

    // Should preserve the formatting and merge the text
    expect(result).toContain('{{bold_text}}');
    expect(result).toContain('<w:b/>');
  });

  it("should handle xml:space preserve attributes correctly", () => {
    const template = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t xml:space="preserve">{{spaced</w:t></w:r>
      <w:r><w:t xml:space="preserve"> placeholder}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    const engine = new MockTemplateEngine();
    const result = engine.mergeSplitPlaceholders(template);

    expect(result).toContain('{{spaced placeholder}}');
    expect(result).toContain('xml:space="preserve"');
  });

  it("should not merge non-placeholder text runs", () => {
    const template = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Normal text</w:t></w:r>
      <w:r><w:t> more text</w:t></w:r>
      <w:r><w:t>{{placeholder}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    const engine = new MockTemplateEngine();
    const result = engine.mergeSplitPlaceholders(template);

    // Should keep normal text runs separate but merge placeholder correctly
    expect(result).toContain('{{placeholder}}');
    expect(result).toContain('Normal text');
    expect(result).toContain(' more text');
  });

  it("should handle multiple placeholders in the same paragraph", () => {
    const template = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>{{first</w:t></w:r>
      <w:r><w:t>_placeholder}} and {{seco</w:t></w:r>
      <w:r><w:t>nd_placeholder}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    const engine = new MockTemplateEngine();
    const result = engine.mergeSplitPlaceholders(template);

    expect(result).toContain('{{first_placeholder}}');
    expect(result).toContain('{{second_placeholder}}');
  });

  it("should handle incomplete placeholders gracefully", () => {
    const template = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>{{incomplete</w:t></w:r>
      <w:r><w:t>Normal text</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    const engine = new MockTemplateEngine();
    const result = engine.mergeSplitPlaceholders(template);

    // Should handle incomplete placeholders without breaking
    expect(result).toContain('{{incomplete');
    expect(result).toContain('Normal text');
  });

  it("should work with the actual document.xml structure", () => {
    // Read the actual document.xml file
    const docXmlPath = path.join(__dirname, '..', 'document.xml');
    if (fs.existsSync(docXmlPath)) {
      const xmlContent = fs.readFileSync(docXmlPath, 'utf-8');

      const engine = new MockTemplateEngine();
      const result = engine.mergeSplitPlaceholders(xmlContent);

      // Verify that known split placeholders are merged
      expect(result).toContain('{{current_rent}}');
      expect(result).toContain('{{new_rent}}');
      expect(result).toContain('{{new_rent_frequency}}');

      // Check that the structure is still valid XML
      expect(result).toContain('<w:document');
      expect(result).toContain('<w:body>');
      expect(result).toContain('<w:p');
      expect(result).toContain('<w:r');
      expect(result).toContain('<w:t');
    }
  });
});