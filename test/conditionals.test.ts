import { processTemplateString } from "../src";

describe("Conditional blocks", () => {
  it("shows content when condition is true", () => {
    const tpl = "[[show]]Secret message[[end:show]]";
    const data = { show: true };
    expect(processTemplateString(tpl, data)).toBe("Secret message");
  });

  it("hides content when condition is false", () => {
    const tpl = "[[show]]Secret message[[end:show]]";
    const data = { show: false };
    expect(processTemplateString(tpl, data)).toBe("");
  });

  it("handles AND conditions", () => {
    const tpl = "[[a and b]]Both true[[end:a and b]]";
    expect(processTemplateString(tpl, { a: true, b: true })).toBe("Both true");
    expect(processTemplateString(tpl, { a: true, b: false })).toBe("");
    expect(processTemplateString(tpl, { a: false, b: true })).toBe("");
  });

  it("handles OR conditions", () => {
    const tpl = "[[a or b]]At least one true[[end:a or b]]";
    expect(processTemplateString(tpl, { a: true, b: false })).toBe("At least one true");
    expect(processTemplateString(tpl, { a: false, b: true })).toBe("At least one true");
    expect(processTemplateString(tpl, { a: true, b: true })).toBe("At least one true");
    expect(processTemplateString(tpl, { a: false, b: false })).toBe("");
  });

  it("handles nested property conditions", () => {
    const tpl = "[[user.active]]Welcome back![[end:user.active]]";
    const data = { user: { active: true } };
    expect(processTemplateString(tpl, data)).toBe("Welcome back!");
  });
});
