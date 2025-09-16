describe("Exact Pattern Test", () => {
  it("should test the exact pattern from document.xml", () => {
    // The exact pattern from document.xml (based on the search result)
    const testPattern = '{{new_re</w:t></w:r><w:r><w:t>nt}}';

    console.log('🔍 Testing exact pattern:', testPattern);

    // Test the regex pattern I'm using
    const pattern = '{{new_re</w:t></w:r><w:r><w:t>nt}}';
    const regex = new RegExp(pattern, 'g');

    const testString = `Some text before {{new_re</w:t></w:r><w:r><w:t>nt}} some text after`;
    console.log('🔍 Test string:', testString);

    const matches = testString.match(regex);
    console.log('🔍 Regex matches:', matches);

    if (matches) {
      console.log('✅ Regex found matches!');
      const result = testString.replace(regex, '{{new_rent}}');
      console.log('📝 After replacement:', result);
    } else {
      console.log('❌ Regex found no matches');
    }

    expect(matches).toBeTruthy();
  });

  it("should test the actual document.xml pattern", () => {
    // Read the actual problematic part from document.xml
    const fs = require('fs');
    const path = require('path');
    const docXmlPath = path.join(__dirname, '..', 'document.xml');

    if (fs.existsSync(docXmlPath)) {
      const xmlContent = fs.readFileSync(docXmlPath, 'utf-8');

      // Find the exact pattern
      const newRePattern = /\{\{new_re[\s\S]*?nt\}\}/;
      const match = xmlContent.match(newRePattern);

      if (match) {
        console.log('🔍 Found new_re pattern in document.xml:');
        console.log(match[0]);

        // Test replacement
        const result = xmlContent.replace(newRePattern, '{{new_rent}}');
        const newMatch = result.match(/\{\{new_re[\s\S]*?nt\}\}/);

        if (!newMatch) {
          console.log('✅ Successfully replaced new_re pattern!');
        } else {
          console.log('❌ Pattern still exists after replacement');
        }
      } else {
        console.log('⚠️  new_re pattern not found in document.xml');
      }
    }
  });
});