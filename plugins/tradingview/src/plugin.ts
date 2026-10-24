import {readFileSync} from "node:fs";
import {bootCompanion, type CompanionConfig} from "../../../shared/companion-plugin.js";
const config=JSON.parse(readFileSync(new URL("../companion-config.json",import.meta.url),"utf8")) as CompanionConfig;
await bootCompanion(config);
