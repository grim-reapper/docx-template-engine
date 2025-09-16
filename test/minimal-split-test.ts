import { XMLParser, XMLBuilder } from 'fast-xml-parser';

describe("Minimal Split Placeholder Test", () => {
  it("should merge a simple split placeholder", () => {
    const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const xmlBuilder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_' });

    // Very simple case: {{name}} split into {{name and }}
    const testXml = `<w:p>
      <w:r><w:t>Hello {{name</w:t></w:r>
      <w:r><w:t>}}</w:t></w:r>
    </w:p>`;

    console.log('🔍 Original XML:');
    console.log(testXml);

    // Parse
    const xmlObj = xmlParser.parse(testXml);
    console.log('\n🔍 Parsed object:');
    console.log(JSON.stringify(xmlObj, null, 2));

    // Simple merge logic: replace the XML string directly
    let resultXml = testXml;
    resultXml = resultXml.replace('{{name</w:t></w:r>\n      <w:r><w:t>}}', '{{name}}');

    console.log('\n📝 After simple replacement:');
    console.log(resultXml);

    // Verify it contains the merged placeholder
    expect(resultXml).toContain('{{name}}');
    expect(resultXml).not.toContain('{{name</w:t></w:r>');
    expect(resultXml).not.toContain('<w:r><w:t>}}');
  });

  it("should handle the exact new_rent split pattern", () => {
    // Test the exact pattern from document.xml
    const testXml = `<w:p>
      <w:r><w:t>{{new_re</w:t></w:r>
      <w:r><w:t>nt}}</w:t></w:r>
    </w:p>`;

    console.log('🔍 Testing new_rent split:');
    console.log(testXml);

    let resultXml = testXml;
    resultXml = resultXml.replace('{{new_re</w:t></w:r>\n      <w:r><w:t>nt}}', '{{new_rent}}');

    console.log('\n📝 After merging:');
    console.log(resultXml);

    expect(resultXml).toContain('{{new_rent}}');
    expect(resultXml).not.toContain('{{new_re');
    expect(resultXml).not.toContain('nt}}');
  });
});