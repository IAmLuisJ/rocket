import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const pkg = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf-8"),
);

describe("npm publish settings", () => {
  it("has a files field with required entries", () => {
    expect(pkg.files).toBeDefined();
    expect(pkg.files).toContain("dist/");
    expect(pkg.files).toContain("bin/");
    expect(pkg.files).toContain("templates/");
    expect(pkg.files).toContain("README.md");
    expect(pkg.files).toContain("CHANGELOG.md");
  });

  it("has publishConfig with public access", () => {
    expect(pkg.publishConfig).toBeDefined();
    expect(pkg.publishConfig.access).toBe("public");
  });

  it("has prepublishOnly script that runs build", () => {
    expect(pkg.scripts.prepublishOnly).toBe("npm run build");
  });

  it("files field does not include test files or .agent", () => {
    for (const entry of pkg.files) {
      expect(entry).not.toMatch(/\.test\./);
      expect(entry).not.toMatch(/\.agent/);
    }
  });
});
