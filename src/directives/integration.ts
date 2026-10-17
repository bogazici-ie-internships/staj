import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";

export default function paintDirective(): AstroIntegration {
  return {
    name: "staj:client-paint",
    hooks: {
      "astro:config:setup": ({ addClientDirective }) => {
        addClientDirective({ name: "paint", entrypoint: fileURLToPath(new URL("./paint.ts", import.meta.url)) });
      },
    },
  };
}
