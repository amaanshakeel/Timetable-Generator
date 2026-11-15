import { createServer } from "vite";
process.env.VITE_SUPABASE_URL = "https://cloud-backup.test";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
const server = await createServer({ mode: "cloud-test", server: { host: "127.0.0.1", port: 5175, strictPort: true } });
await server.listen(); server.printUrls();
