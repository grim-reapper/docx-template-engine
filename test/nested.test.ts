import { processTemplateString } from "../src";

describe("Nested add_more", () => {
  it("renders parent and child blocks", () => {
    const tpl = `
      <<add_more parents>>
        Parent: {{name}}
        <<add_more children>>
          Child: {{name}}, Age: {{age}}
        <<end:add_more>>
      <<end:add_more>>
    `;
    const data = {
      parents: [
        {
          name: "John",
          children: [
            { name: "Emma", age: 10 },
            { name: "Alex", age: 7 }
          ]
        }
      ]
    };
    expect(processTemplateString(tpl, data).replace(/\s+/g, " ").trim()).toBe(
      "Parent: John Child: Emma, Age: 10 Child: Alex, Age: 7"
    );
  });
});
