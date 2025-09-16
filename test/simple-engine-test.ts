import { TemplateEngine } from '../src/engine';

describe("Simple Engine Test", () => {
  it("should test mergeSplitPlaceholders with real TemplateEngine", () => {
    // Create a simple XML with split placeholders
    const testXml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Hello {{name</w:t></w:r>
      <w:r><w:t>}}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    // Create engine and test the method
    const engine = new TemplateEngine(Buffer.from('<dummy></dummy>'));

    // Access the private method
    const result = (engine as any).mergeSplitPlaceholders(testXml);

    console.log('🔍 Input XML:');
    console.log(testXml);
    console.log('\n📝 Output XML:');
    console.log(result);

    // Check if the merge worked
    expect(result).toContain('{{name}}');
    expect(result).not.toContain('{{name</w:t></w:r>');
    expect(result).not.toContain('<w:r><w:t>}}');
  });

  it("should test the actual document.xml problematic paragraph", () => {
    // Read the actual problematic paragraph from document.xml
    const fs = require('fs');
    const path = require('path');
    const docXmlPath = path.join(__dirname, '..', 'document.xml');

    if (fs.existsSync(docXmlPath)) {
      const xmlContent = fs.readFileSync(docXmlPath, 'utf-8');

      // Extract the problematic paragraph
      const paragraphMatch = xmlContent.match(/<w:p w14:paraId="20CDE098"[\s\S]*?<\/w:p>/);
      if (paragraphMatch) {
        console.log('🔍 Testing problematic paragraph from document.xml:');
        console.log(paragraphMatch[0]);

        const engine = new TemplateEngine(Buffer.from('<dummy></dummy>'));
        const result = (engine as any).mergeSplitPlaceholders(paragraphMatch[0]);

        console.log('\n📝 After mergeSplitPlaceholders:');
        console.log(result);

        // Check for merged placeholders
        expect(result).toContain('{{current_rent}}');
        expect(result).toContain('{{new_rent}}');
        expect(result).toContain('{{new_rent_frequency}}');

        // Check that fragments are gone
        expect(result).not.toContain('{{new_re');
        expect(result).not.toContain('nt}}');
        expect(result).not.toContain('{{new_rent_frequency');
      }
    }
  });
});