import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },

  vite: {
    server: {
      allowedHosts: ["https://b2b.mandarina-group.cc", "nexori.onrender.com"],
    },
  },
});