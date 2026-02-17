import fs from "node:fs";
import path from "node:path";
import { buildUiProbeContract } from "../client-web/ui_probe_contract.ts";

const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const OUT_FILE = path.join(ROOT_DIR, "modern", "client-web", "tests", "fixtures", "ui_probe.sample.json");

function usage() {
  process.stdout.write(
    [
      "Usage:",
      "  bun modern/tools/generate_ui_probe_fixture.ts --verify",
      "  bun modern/tools/generate_ui_probe_fixture.ts --write",
      ""
    ].join("\n")
  );
}

function normalizeJsonText(v: unknown): string {
  return `${JSON.stringify(v, null, 2)}\n`;
}

function run(): number {
  const mode = String(process.argv[2] || "--verify").trim();
  if (mode !== "--verify" && mode !== "--write") {
    usage();
    return 2;
  }

  const probe = buildUiProbeContract({ mode: "sample" });
  const generated = normalizeJsonText(probe);

  if (mode === "--write") {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, generated, "utf8");
    process.stdout.write(`ui_probe_fixture: wrote ${path.relative(ROOT_DIR, OUT_FILE)}\n`);
    return 0;
  }

  if (!fs.existsSync(OUT_FILE)) {
    process.stderr.write(
      `ui_probe_fixture: missing fixture ${path.relative(ROOT_DIR, OUT_FILE)} (run with --write)\n`
    );
    return 1;
  }

  const existing = fs.readFileSync(OUT_FILE, "utf8");
  if (existing !== generated) {
    process.stderr.write(
      [
        "ui_probe_fixture: fixture drift detected.",
        `expected: ${path.relative(ROOT_DIR, OUT_FILE)}`,
        "run: bun modern/tools/generate_ui_probe_fixture.ts --write"
      ].join("\n") + "\n"
    );
    return 1;
  }

  process.stdout.write("ui_probe_fixture: ok\n");
  return 0;
}

process.exit(run());
