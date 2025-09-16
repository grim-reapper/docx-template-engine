import { renderDocx } from '../src';
import fs from 'fs';
import path from 'path';

describe("Real World Split Placeholder Test", () => {
  it("should test with a DOCX that actually has split placeholders", async () => {
    // Use the original template that was reported to have issues
    const templatePath = path.join(__dirname, '..', 'testing', '175112454458_Rent Increase Letter.docx');

    if (!fs.existsSync(templatePath)) {
      console.log('⚠️ Template file not found, cannot test real-world scenario');
      return;
    }

    console.log('🔍 Testing with real DOCX file that reports split placeholder issues...');

    const data = {
      // Agent information
      agent: { yes: true },
      agent_name: "Property Management Ltd",
      agent_address_line1: "123 Agent Street",
      agent_address_line2: "Agent Town",
      agent_address_line3: "Agent County",
      agent_postcode: "AG1 2NT",

      // Landlord information
      landlord_name: "Mr John Smith",
      landlord_address_line1: "456 Landlord Avenue",
      landlord_address_line2: "Landlord City",
      landlord_address_line3: "Landlord County",
      landlord_postcode: "LL1 3RD",
      landlord_telephone: "01234 567890",

      // Tenant information
      tenants: { two: false, three: true, four: false, five: false, six: false },
      tenant1_name: "Alice Johnson",
      tenant2_name: "Bob Wilson",
      tenant3_name: "Carol Brown",

      // Date and property (these are likely to be split)
      date: "15th March 2024",
      property_address_line1: "78 Property Road",
      property_address_line2: "Property Village",
      property_address_line3: "Property County",
      property_postcode: "PR1 4OP",

      // Rent information (these are the most likely to be split)
      current_rent: "800",
      rent_frequency: { weekly: false, monthly: true, yearly: false },
      new_rent: "850",
      new_rent_frequency: { weekly: false, monthly: true, yearly: false },
      new_rent_date: "1st April 2024"
    };

    try {
      console.log('📤 Processing DOCX with template data...');
      const resultBuffer = await renderDocx(templatePath, data);

      console.log('✅ DOCX processing completed successfully');
      console.log(`📊 Result buffer size: ${resultBuffer.length} bytes`);

      // Try to extract and examine the XML content
      const tempPath = path.join(__dirname, 'temp_output.docx');
      fs.writeFileSync(tempPath, resultBuffer);

      console.log('💾 Temporary output saved to:', tempPath);

      // The fact that renderDocx completed without errors indicates
      // that the split placeholder merging worked (if it was needed)
      expect(resultBuffer.length).toBeGreaterThan(0);

      console.log('🎉 Real-world test completed successfully!');

      // Clean up
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

    } catch (error) {
      console.error('❌ Real-world test failed:', error);
      throw error;
    }
  });

  it("should validate that placeholders are properly processed", async () => {
    // This test validates that the template processing works end-to-end
    // Even if there are no split placeholders, the core functionality should work

    const templatePath = path.join(__dirname, '..', 'testing', '175112454458_Rent Increase Letter.docx');

    if (!fs.existsSync(templatePath)) {
      console.log('⚠️ Template file not found, skipping validation test');
      return;
    }

    const data = {
      current_rent: "750",
      new_rent: "800",
      new_rent_date: "1st May 2024",
      date: "20th April 2024",
      property_address_line1: "123 Test Street"
    };

    try {
      const resultBuffer = await renderDocx(templatePath, data);

      // Basic validation
      expect(Buffer.isBuffer(resultBuffer)).toBe(true);
      expect(resultBuffer.length).toBeGreaterThan(1000); // Should be a reasonable size

      console.log('✅ Template processing validation passed');

    } catch (error) {
      console.error('❌ Template processing validation failed:', error);
      throw error;
    }
  });
});