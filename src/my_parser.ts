import { readFileSync, writeFileSync } from 'fs';

class WordDocumentParser {
  /**
   * Parse and merge text runs in a Word document XML by processing the XML as a string
   */
  public parseAndMergeTextRuns(xmlContent: string): string {
    let result = xmlContent;
    
    // Process each paragraph to merge text runs
    const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
    
    result = result.replace(paragraphRegex, (paragraphMatch: string) => {
      return this.processParagraph(paragraphMatch);
    });
    
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
        // Mark other runs in the group for deletion
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

// Alternative: Simplified version that might work better
class SimplifiedWordDocumentParser {
  public parseAndMergeTextRuns(xmlContent: string): string {
    // Process paragraph by paragraph
    const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
    
    return xmlContent.replace(paragraphRegex, (paragraphMatch) => {
      return this.processParagraphSimple(paragraphMatch);
    });
  }

  private processParagraphSimple(paragraphXml: string): string {
    // Find all runs and their text content
    const runRegex = /<w:r(?:\s+[^>]*)?>([\s\S]*?)<\/w:r>/g;
    const runs: Array<{ match: string; text: string | null; props: string | null; start: number; end: number }> = [];
    
    let match;
    while ((match = runRegex.exec(paragraphXml)) !== null) {
      const runContent = match[1];
      runs.push({
        match: match[0],
        text: this.extractTextSimple(runContent),
        props: this.extractPropsSimple(runContent),
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // Group consecutive runs with same properties that have text
    const groups: Array<{ indices: number[]; text: string; props: string | null }> = [];
    let currentGroup: number[] = [];
    let currentText = '';
    let currentProps: string | null = null;

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      
      if (run.text !== null) {
        if (currentGroup.length === 0) {
          // Start new group
          currentGroup = [i];
          currentText = run.text;
          currentProps = run.props;
        } else if (this.propsEqual(currentProps, run.props)) {
          // Continue current group
          currentGroup.push(i);
          currentText += run.text;
        } else {
          // Finish current group and start new one
          groups.push({ indices: [...currentGroup], text: currentText, props: currentProps });
          currentGroup = [i];
          currentText = run.text;
          currentProps = run.props;
        }
      } else {
        // Non-text run, finish current group
        if (currentGroup.length > 0) {
          groups.push({ indices: [...currentGroup], text: currentText, props: currentProps });
          currentGroup = [];
          currentText = '';
          currentProps = null;
        }
      }
    }

    // Add the last group
    if (currentGroup.length > 0) {
      groups.push({ indices: currentGroup, text: currentText, props: currentProps });
    }

    // Build replacement map
    const replacements: Map<number, string> = new Map();
    
    for (const group of groups) {
      if (group.indices.length > 1) {
        // Create merged run for the first position
        const mergedRun = this.createRunSimple(group.text, group.props);
        replacements.set(group.indices[0], mergedRun);
        
        // Mark other runs for deletion
        for (let i = 1; i < group.indices.length; i++) {
          replacements.set(group.indices[i], '');
        }
      }
    }

    // Apply replacements from end to beginning
    let result = paragraphXml;
    for (let i = runs.length - 1; i >= 0; i--) {
      if (replacements.has(i)) {
        const run = runs[i];
        result = result.substring(0, run.start) + replacements.get(i) + result.substring(run.end);
      }
    }

    return result;
  }

  private extractTextSimple(runContent: string): string | null {
    const textMatch = runContent.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
    return textMatch ? textMatch[1] : null;
  }

  private extractPropsSimple(runContent: string): string | null {
    const propsMatch = runContent.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    return propsMatch ? propsMatch[0] : null;
  }

  private propsEqual(props1: string | null, props2: string | null): boolean {
    return props1 === props2;
  }

  private createRunSimple(text: string, props: string | null): string {
    const spaceAttr = text.trim() !== text ? ' xml:space="preserve"' : '';
    return `<w:r>${props || ''}<w:t${spaceAttr}>${text}</w:t></w:r>`;
  }
}

// Utility function
export function mergeWordTextRuns(xmlContent: string): string {
  const parser = new SimplifiedWordDocumentParser();
  return parser.parseAndMergeTextRuns(xmlContent);
}

// Example usage
if (require.main === module) {
  const parser = new WordDocumentParser();
  parser.processFile('document.xml', 'document_merged.xml');
}

export { WordDocumentParser, SimplifiedWordDocumentParser };