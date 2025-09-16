import { readFileSync, writeFileSync } from 'fs';

class WordDocumentParser {
  /**
   * Parse and merge text runs in a Word document XML by processing the XML as a string
   */
  public parseAndMergeTextRuns(xmlContent: string): string {
    let result = xmlContent;
    
    // First pass: merge text runs
    const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
    
    result = result.replace(paragraphRegex, (paragraphMatch: string) => {
      return this.processParagraph(paragraphMatch);
    });
    
    // Second pass: clean up empty runs
    result = this.cleanEmptyRuns(result);
    
    return result;
  }

  /**
   * Process a single paragraph to merge consecutive text runs
   */
  private processParagraph(paragraphXml: string): string {
    // Find all text runs in this paragraph
    const runRegex = /<w:r(?:\s+[^>]*)?>([\s\S]*?)<\/w:r>/g;
    const runs: Array<{ fullMatch: string; content: string; start: number; end: number }> = [];
    
    let match;
    while ((match = runRegex.exec(paragraphXml)) !== null) {
      runs.push({
        fullMatch: match[0],
        content: match[1],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    if (runs.length <= 1) {
      return paragraphXml; // No merging needed
    }

    // Group runs that should be merged
    const mergedGroups: Array<{ runs: number[]; content: string; properties: string | null }> = [];
    let currentGroup: number[] = [];
    let currentContent = '';
    let currentProperties: string | null = null;

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const textContent = this.extractTextFromRun(run.content);
      
      if (textContent !== null) {
        const runProperties = this.extractRunProperties(run.content);
        
        // Check if we can merge with current group
        if (currentGroup.length > 0 && this.canMergeRuns(currentProperties, runProperties)) {
          currentGroup.push(i);
          currentContent += textContent;
        } else {
          // Finish current group and start new one
          if (currentGroup.length > 0) {
            mergedGroups.push({
              runs: [...currentGroup],
              content: currentContent,
              properties: currentProperties
            });
          }
          currentGroup = [i];
          currentContent = textContent;
          currentProperties = runProperties;
        }
      } else {
        // Non-text run, finish current group
        if (currentGroup.length > 0) {
          mergedGroups.push({
            runs: [...currentGroup],
            content: currentContent,
            properties: currentProperties
          });
          currentGroup = [];
          currentContent = '';
          currentProperties = null;
        }
      }
    }

    // Add the last group if it exists
    if (currentGroup.length > 0) {
      mergedGroups.push({
        runs: currentGroup,
        content: currentContent,
        properties: currentProperties
      });
    }

    // Build the replacement map
    const replacementMap: Map<number, string> = new Map();
    
    for (const group of mergedGroups) {
      if (group.runs.length > 1) {
        // Create merged run for this group
        const mergedRun = this.createRunXml(group.content, group.properties);
        // Replace the first run with merged content
        replacementMap.set(group.runs[0], mergedRun);
        // Mark other runs in the group for deletion (empty string)
        for (let i = 1; i < group.runs.length; i++) {
          replacementMap.set(group.runs[i], '');
        }
      }
    }

    // Build the new paragraph content by replacing runs
    let newParagraph = paragraphXml;
    
    // Process replacements from last to first to maintain correct indices
    for (let i = runs.length - 1; i >= 0; i--) {
      const run = runs[i];
      const replacement = replacementMap.get(i);
      
      if (replacement !== undefined) {
        newParagraph = newParagraph.substring(0, run.start) + 
                       replacement + 
                       newParagraph.substring(run.end);
      }
    }

    return newParagraph;
  }

  /**
   * Clean up empty runs from the XML
   */
  protected cleanEmptyRuns(xmlContent: string): string {
    // Remove empty run elements (both self-closing and with empty content)
    const emptyRunRegex = /<w:r(?:\s+[^>]*)?>\s*<\/w:r>/g;
    const selfClosingEmptyRunRegex = /<w:r(?:\s+[^>]*)?\s*\/>/g;
    
    let result = xmlContent
      .replace(emptyRunRegex, '')
      .replace(selfClosingEmptyRunRegex, '');
    
    // Also remove runs that only contain whitespace
    const whitespaceOnlyRunRegex = /<w:r(?:\s+[^>]*)?>\s*<w:t(?:\s+[^>]*)?>\s*<\/w:t>\s*<\/w:r>/g;
    result = result.replace(whitespaceOnlyRunRegex, '');
    
    return result;
  }

  /**
   * Extract text content from a run
   */
  private extractTextFromRun(runContent: string): string | null {
    const textRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/;
    const match = runContent.match(textRegex);
    return match ? match[1] : null;
  }

  /**
   * Extract run properties
   */
  private extractRunProperties(runContent: string): string | null {
    const propertiesRegex = /<w:rPr>([\s\S]*?)<\/w:rPr>/;
    const match = runContent.match(propertiesRegex);
    return match ? match[0] : null;
  }

  /**
   * Check if two runs can be merged based on their properties
   */
  private canMergeRuns(properties1: string | null, properties2: string | null): boolean {
    if (properties1 === properties2) return true;
    if (!properties1 || !properties2) return properties1 === properties2;
    return properties1 === properties2;
  }

  /**
   * Create a new run XML with the given content and properties
   */
  private createRunXml(content: string, properties: string | null): string {
    let runXml = '<w:r>';
    
    if (properties) {
      runXml += properties;
    }
    
    // Check if content contains spaces that need preservation
    const needsSpacePreservation = content.trim() !== content;
    const spaceAttr = needsSpacePreservation ? ' xml:space="preserve"' : '';
    
    runXml += `<w:t${spaceAttr}>${content}</w:t>`;
    runXml += '</w:r>';
    
    return runXml;
  }

  /**
   * Process a file and save the result
   */
  public processFile(inputPath: string, outputPath: string): void {
    try {
      const xmlContent = readFileSync(inputPath, 'utf-8');
      const result = this.parseAndMergeTextRuns(xmlContent);
      writeFileSync(outputPath, result, 'utf-8');
      console.log(`Successfully processed and saved to ${outputPath}`);
    } catch (error) {
      throw new Error(`File processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// More aggressive cleaner that handles various empty XML patterns
class CleanWordDocumentParser extends WordDocumentParser {
  /**
   * Enhanced cleaning to remove all types of empty XML elements
   */
  protected cleanEmptyRuns(xmlContent: string): string {
    let result = xmlContent;
    
    // Pattern 1: Completely empty runs <w:r></w:r>
    result = result.replace(/<w:r[^>]*>\s*<\/w:r>/g, '');
    
    // Pattern 2: Self-closing empty runs <w:r/>
    result = result.replace(/<w:r[^>]*\/>/g, '');
    
    // Pattern 3: Runs with only whitespace text <w:r>...<w:t>   </w:t>...</w:r>
    result = result.replace(/<w:r[^>]*>(\s*<w:rPr[^>]*>.*?<\/w:rPr>)?\s*<w:t[^>]*>\s*<\/w:t>\s*<\/w:r>/g, '');
    result = result.replace(/<w:r[^>]*>(\s*<w:rPr[^>]*>.*?<\/w:rPr>)?\s*<w:t[^>]*>\s*<\/w:t>(\s*<[^>]*>)*\s*<\/w:r>/g, '');
    
    // Pattern 4: Runs with empty text elements but other empty elements
    result = result.replace(/<w:r[^>]*>(\s*<[^>]*>)*\s*<w:t[^>]*>\s*<\/w:t>(\s*<[^>]*>)*\s*<\/w:r>/g, '');
    
    // Pattern 5: Remove any remaining empty paragraphs that might have been created
    result = result.replace(/<w:p[^>]*>\s*<\/w:p>/g, '');
    result = result.replace(/<w:p[^>]*>(\s*<w:pPr[^>]*>.*?<\/w:pPr>)?\s*<\/w:p>/g, '');
    
    // Clean up extra whitespace that might be left after removal
    result = result.replace(/>\s+</g, '><');
    result = result.replace(/\s+<\/w:p>/g, '</w:p>');
    result = result.replace(/<w:p[^>]*>\s+/g, (match) => match.replace(/\s+$/, ''));
    
    return result;
  }
}

// Utility function with enhanced cleaning
export function mergeWordTextRuns(xmlContent: string): string {
  const parser = new CleanWordDocumentParser();
  return parser.parseAndMergeTextRuns(xmlContent);
}

// // Example usage
// if (require.main === module) {
//   const parser = new CleanWordDocumentParser();
//   parser.processFile('document.xml', 'document_merged.xml');
// }

export { WordDocumentParser, CleanWordDocumentParser };