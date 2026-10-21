import { describe, expect, it } from "vitest";
import { md, plain } from "../../src/lib/inline-md";

describe("inline markdown", () => {
  it("bold, links per locale, docs, escaping", () => {
    expect(md("**a** [S](page:surec#oncesi)", "tr")).toBe('<strong>a</strong> <a href="/staj/surec/#oncesi">S</a>');
    expect(md("[S](page:surec#oncesi)", "en")).toBe('<a href="/staj/en/surec/#oncesi">S</a>');
    expect(md("[H](doc:Revised-Handbook-of-Internship.pdf)", "en")).toBe('<a href="/staj/belgeler/Revised-Handbook-of-Internship.pdf">H</a>');
    expect(md("<script>x</script>", "tr")).toBe("&lt;script&gt;x&lt;/script&gt;");
    expect(md("{n} gün", "tr", { n: 3 })).toBe("3 gün");
    expect(() => md("[x](javascript:alert(1))", "tr")).toThrow();
    expect(plain("**a** [b](page:x)")).toBe("a b");
  });
});
