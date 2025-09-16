import { processTemplateString } from "../src";

describe("Add More blocks", () => {
  it("repeats block for each item", () => {
    const tpl = `<<add_more dependents>>{{name}};<<end:add_more>>`;
    const data = { dependents: [{ name: "Alice" }, { name: "Bob" }] };
    expect(processTemplateString(tpl, data)).toBe("Alice;Bob;");
  });

  it("handles count1 condition (single item)", () => {
    const tpl = `<<add_more items>>[[count1]]Single item[[end:count1]]{{name}}<<end:add_more>>`;
    const data = { items: [{ name: "Only" }] };
    expect(processTemplateString(tpl, data)).toBe("Single itemOnly");
  });

  it("handles count1 condition (multiple items)", () => {
    const tpl = `<<add_more items>>[[count1]]Single item[[end:count1]]{{name}}<<end:add_more>>`;
    const data = { items: [{ name: "First" }, { name: "Second" }] };
    expect(processTemplateString(tpl, data)).toBe("FirstSecond");
  });

  it("handles count2 condition (always true)", () => {
    const tpl = `<<add_more items>>[[count2]]Item: {{name}}[[end:count2]]<<end:add_more>>`;
    const data = { items: [{ name: "A" }, { name: "B" }] };
    expect(processTemplateString(tpl, data)).toBe("Item: AItem: B");
  });

  it("handles common condition (first item only)", () => {
    const tpl = `<<add_more items>>[[common]]First: [[end:common]]{{name}}<<end:add_more>>`;
    const data = { items: [{ name: "A" }, { name: "B" }, { name: "C" }] };
    expect(processTemplateString(tpl, data)).toBe("First:ABC");
  });

  it("handles nested add_more with special conditions", () => {
    const tpl = `
      <<add_more parents>>
        [[common]]Family: [[end:common]]{{name}}
        <<add_more children>>
          [[count2]]Child: {{name}}[[end:count2]]
        <<end:add_more>>
      <<end:add_more>>
    `;
    const data = {
      parents: [
        { name: "John", children: [{ name: "Emma" }, { name: "Alex" }] },
        { name: "Jane", children: [{ name: "Tom" }] }
      ]
    };
    const expected = "\n        Family:John\n        Child: Emma\n        Child: Alex\n      \n        Jane\n        Child: Tom\n      ";
    expect(processTemplateString(tpl, data).replace(/\s+/g, " ").trim()).toBe(expected.replace(/\s+/g, " ").trim());
  });
});
