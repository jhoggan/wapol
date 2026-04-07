import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project:
    process.env.TRIGGER_PROJECT_REF ?? "proj_euuiikzupbcohoocximf",
  dirs: ["./trigger"],
  maxDuration: 3600,
});
