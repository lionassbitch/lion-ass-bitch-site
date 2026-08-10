// Registers the TypeScript-aware resolve hook for the test runner.
import { register } from "node:module";
register("./ts-resolver.mjs", import.meta.url);
