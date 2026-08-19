import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { installDeferred } from "./lazy-extension.js";

export default function (pi: ExtensionAPI) {
	installDeferred(pi, () => import("./index.js"), {
		commands: [{ name: "todos", description: "Show the session todo list" }],
	});
}
