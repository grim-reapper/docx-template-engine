# DOCX Template Engine

A lightweight template engine for .docx files with support for variables, conditionals, and nested repeaters. This library allows you to create dynamic Word documents by processing custom template tags within DOCX files or plain text templates.

## Features

- **Variable Replacement**: Replace placeholders with data values
- **Conditional Logic**: Show/hide content based on conditions
- **Repeaters**: Generate repeating content from arrays
- **Prefix Modifiers**: Format variables with spaces, commas, case transformations
- **DOCX Support**: Process Microsoft Word documents directly
- **Plain Text Support**: Process template strings for testing or simple use cases
- **TypeScript Support**: Full TypeScript definitions included
- **XML Text Run Merging**: Automatically merges consecutive text runs in DOCX files for cleaner processing
- **Document Preprocessing**: Integrated document-xml-parser merges text runs before placeholder replacement

## Installation

```bash
npm install docx-template-engine
```

## Quick Start

```javascript
import { renderDocx, processTemplateString, mergeWordTextRuns } from 'docx-template-engine';

// For DOCX files (automatically merges text runs before processing)
const docxBuffer = await renderDocx('template.docx', data);
fs.writeFileSync('output.docx', docxBuffer);

// For plain text templates
const result = processTemplateString(templateString, data);
console.log(result);

// Manual XML processing (optional - done automatically in renderDocx)
const mergedXml = mergeWordTextRuns(rawXmlContent);
```

## Template Syntax

### Variables

Variables are enclosed in double curly braces `{{variable}}`. They can include path notation for nested objects and arrays.

```javascript
const data = {
  name: 'John Doe',
  address: {
    street: '123 Main St',
    city: 'Anytown'
  },
  items: ['item1', 'item2']
};

const template = `
Hello {{name}},

Your address: {{address.street}}, {{address.city}}

Items: {{items[0]}}, {{items[1]}
`;
```

### Variable Prefixes

Variables support prefix modifiers that are applied in reverse order:

- `ls.` - Leading space: `{{ls.variable}}` → ` value`
- `rs.` - Trailing space: `{{rs.variable}}` → `value `
- `bs.` - Both spaces: `{{bs.variable}}` → ` value `
- `,` - Comma: `{{,variable}}` → `,value`
- `uc.` - Uppercase: `{{uc.variable}}` → `VALUE`
- `lc.` - Lowercase: `{{lc.variable}}` → `value`
- `tc.` - Title case: `{{tc.variable}}` → `Value`
- `fc.` - First letter uppercase: `{{fc.variable}}` → `Value`

**Combined prefixes** are applied from right to left:

```javascript
// {{,ls.address.city}} with value "Anytown" → ", Anytown"
const template = "Address: {{address.street}}{{,ls.address.city}}";
// Result: "Address: 123 Main St, Anytown"
```

### Conditional Blocks

Conditional blocks show or hide content based on data values:

```javascript
const template = `
[[showHeader]]
# Header
This header will only appear if showHeader is truthy.
[[end:showHeader]]

[[user.isAdmin]]
Admin content here
[[end:user.isAdmin]]
`;

const data = {
  showHeader: true,
  user: { isAdmin: false }
};
```

**Complex conditions** support AND/OR logic:

```javascript
[[user.isLoggedIn and user.hasPermission]]
You have access!
[[end:user.isLoggedIn and user.hasPermission]]

[[status.active or status.pending]]
Status is active or pending
[[end:status.active or status.pending]]
```

### Repeaters (Add More)

Repeaters generate content for each item in an array:

```javascript
const template = `
<<add_more items>>
- {{value}} ({{_index}} of {{_length}})
<<end:add_more>>
`;

const data = {
  items: ['Apple', 'Banana', 'Orange']
};

// Result:
// - Apple (0 of 3)
// - Banana (1 of 3)
// - Orange (2 of 3)
```

**Object arrays** work with nested properties:

```javascript
const template = `
<<add_more products>>
Product: {{name}} - ${{price}}
[[inStock]]
In stock: {{quantity}} units
[[end:inStock]]
<<end:add_more>>
`;

const data = {
  products: [
    { name: 'Widget', price: 10.99, inStock: true, quantity: 5 },
    { name: 'Gadget', price: 25.50, inStock: false, quantity: 0 }
  ]
};
```

**Special repeater conditions**:

- `count1` - True when array has exactly 1 item
- `count2` - True when array has 2 or more items
- `common` - True for the first item only (`_index === 0`)

## XML Text Run Merging

The engine automatically processes DOCX files to merge consecutive text runs before applying template logic. This ensures cleaner processing and better compatibility with Word documents.

### What are Text Runs?

In Microsoft Word documents, text is stored as separate "runs" (elements) even when they appear as continuous text. The document-xml-parser merges these runs to consolidate text with the same formatting properties.

### Automatic Integration

When you use `renderDocx()`, the engine automatically:
1. Extracts the `document.xml` from the DOCX file
2. Merges consecutive text runs with identical properties
3. Applies your template processing on the cleaned XML
4. Reassembles the DOCX with the processed content

### Manual XML Processing

You can also use the XML merging functionality directly:

```javascript
import { mergeWordTextRuns } from 'docx-template-engine';
```

### Exported Functions and Classes

The main entry point exports the following:

- `renderDocx()` - Process DOCX files
- `processTemplateString()` - Process plain text templates
- `mergeWordTextRuns()` - XML text run merging utility
- `TemplateEngine` - Main engine class
- `TemplateParser` - Template parsing class
- `TemplateEngineOptions` - TypeScript interface for options
- `JsonObject`, `JsonArray`, `JsonValue` - TypeScript types for data

const rawXml = `<w:document>...raw XML content...</w:document>`;
const mergedXml = mergeWordTextRuns(rawXml);
// Now process mergedXml with your template logic
```

## API Reference

### renderDocx(templateInput, data, options?)

Processes a DOCX file and returns a Buffer with the processed content.

```javascript
import { renderDocx } from 'docx-template-engine';

const buffer = await renderDocx('template.docx', data, {
  companyName: 'My Company' // Optional: replaces {{company_name}}
});
```

**Parameters:**
- `templateInput`: Path to DOCX file (string) or Buffer containing DOCX data
- `data`: JSON object with template variables
- `options.companyName`: Optional company name replacement

**Returns:** Promise<Buffer> - Processed DOCX file as buffer

### processTemplateString(template, data, options?)

Processes a plain text template string and returns the result.

```javascript
import { processTemplateString } from 'docx-template-engine';

const result = processTemplateString(templateString, data, {
  companyName: 'My Company'
});
```

**Parameters:**
- `template`: Template string with placeholders
- `data`: JSON object with template variables
- `options.companyName`: Optional company name replacement

**Returns:** string - Processed template

### mergeWordTextRuns(xmlContent)

Merges consecutive text runs in Word document XML content. This function processes XML strings and consolidates text runs with identical formatting properties.

```javascript
import { mergeWordTextRuns } from 'docx-template-engine';

const xmlContent = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Hello</w:t></w:r>
      <w:r><w:t> World</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

const mergedXml = mergeWordTextRuns(xmlContent);
// Result: XML with "Hello World" in a single text run where possible
```

**Parameters:**
- `xmlContent`: string - The raw Word document XML content

**Returns:** string - XML content with merged text runs

### TemplateEngine Class

For advanced usage, you can use the TemplateEngine class directly:

```javascript
import { TemplateEngine } from 'docx-template-engine';

const engine = new TemplateEngine('template.docx', {
  companyName: 'My Company'
});

const buffer = await engine.generate(data);
```

## Available Classes and Methods

### TemplateEngine Class

The main class for processing DOCX templates.

**Constructor:**
```javascript
new TemplateEngine(templateInput: Buffer | string, options?: TemplateEngineOptions)
```

**Methods:**
- `generate(data: JsonObject): Promise<Buffer>` - Processes the template and returns a DOCX buffer

### TemplateParser Class

Handles the core template parsing and replacement logic.

**Constructor:**
```javascript
new TemplateParser(data: JsonObject, globalScope?: any)
```

**Methods:**
- `replaceSimplePlaceholder(xml: string, key: string, value: string): string`
- `replaceAllVariables(xml: string, localScope?: any): string`
- `processConditionsRaw(xml: string, localScope?: any): string`
- `processAddMoreRaw(xml: string, localScope?: any): string`

### Document XML Parser Classes

**WordDocumentParser Class:**
- `parseAndMergeTextRuns(xmlContent: string): string` - Main method to merge text runs
- `processFile(inputPath: string, outputPath: string): void` - Process files directly

**CleanWordDocumentParser Class (extends WordDocumentParser):**
- Enhanced cleaning with more aggressive empty element removal

## Data Types

The engine accepts standard JSON data types:

```typescript
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
interface JsonArray extends Array<JsonValue> { }
```

## Examples

### Complete DOCX Template Example

```javascript
import { renderDocx } from 'docx-template-engine';
import fs from 'fs';

const data = {
  companyName: 'ABC Corp',
  invoice: {
    number: 'INV-2024-001',
    date: '2024-01-15',
    customer: {
      name: 'John Smith',
      address: '123 Main St, Anytown, USA'
    }
  },
  items: [
    { description: 'Widget A', quantity: 2, price: 10.99 },
    { description: 'Widget B', quantity: 1, price: 25.50 }
  ],
  showDiscount: true,
  discount: 5.00
};

const buffer = await renderDocx('invoice-template.docx', data);
fs.writeFileSync('invoice-2024-001.docx', buffer);
```

### Plain Text Template Example

```javascript
import { processTemplateString } from 'docx-template-engine';

const template = `
Invoice {{invoice.number}}

Date: {{invoice.date}}

Customer: {{invoice.customer.name}}
Address: {{invoice.customer.address}}

Items:
<<add_more items>>
- {{description}}: {{quantity}} x ${{price}} = ${{quantity * price}}
<<end:add_more>>

[[showDiscount]]
Discount: ${{discount}}
[[end:showDiscount]]

Total: $999.99
`;

const result = processTemplateString(template, data);
console.log(result);
```

## Building and Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build TypeScript
npm run build
```

## Dependencies

- **pizzip**: ZIP file manipulation for DOCX processing
- **fast-xml-parser**: XML parsing and building
- **date-fns**: Date formatting utilities

## Document XML Parser Integration

This engine includes an integrated document-xml-parser that automatically processes DOCX files to merge consecutive text runs before template processing. This ensures:

- Cleaner XML processing
- Better compatibility with Word documents
- Consolidated text runs with identical formatting
- Improved template replacement accuracy

The parser works transparently when using `renderDocx()` and can also be used standalone via the `mergeWordTextRuns()` function for custom XML processing workflows.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
