import { processTemplateString } from "../src";

describe("Variable replacements", () => {
  it("replaces basic variables", () => {
    const tpl = "Hello {{name}}!";
    const data = { name: "World" };
    expect(processTemplateString(tpl, data)).toBe("Hello World!");
  });

  it("handles variable prefixes", () => {
    const tpl = "{{ls.name}}{{rs.name}}{{bs.name}}{{,name}}";
    const data = { name: "test" };
    expect(processTemplateString(tpl, data)).toBe(" testtest  test ,test");
  });

  it("handles case transformation prefixes", () => {
    const tpl = "{{uc.name}}{{lc.name}}{{tc.name}}{{fc.name}}";
    const data = { name: "hello world" };
    expect(processTemplateString(tpl, data)).toBe("HELLO WORLDhello worldHello WorldHello world");
  });

  it("handles nested property access", () => {
    const tpl = "{{user.name}} is {{user.age}} years old.";
    const data = { user: { name: "John", age: 30 } };
    expect(processTemplateString(tpl, data)).toBe("John is 30 years old.");
  });
});
