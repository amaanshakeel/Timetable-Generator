import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import { validateProject } from "../domain/validation";
import type { CloudJob } from "./outbox";

export interface CloudConfig {
  url: string;
  key: string;
}
export function cloudConfig(env: Record<string, unknown>): CloudConfig | null {
  const url = String(env.VITE_SUPABASE_URL || "").trim();
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
  if (!url && !key) return null;
  if (!url || !key || !key.startsWith("sb_publishable_"))
    throw Error(
      "Cloud backup configuration needs a Supabase URL and publishable key.",
    );
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !(
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname)
    )
  )
    throw Error("Cloud backups require a secure connection.");
  return { url: parsed.origin, key };
}
const metadata = z.object({
  id: z.string().uuid(),
  workspace_id: z.string(),
  device_id: z.string().uuid(),
  device_name: z.string(),
  workspace_name: z.string(),
  revision: z.number().int().nonnegative(),
  created_at: z.string(),
});
export type CloudVersion = z.infer<typeof metadata>;
export class SupabaseBackups {
  private client: Promise<SupabaseClient>;
  constructor(config: CloudConfig) {
    this.client = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }),
    );
  }
  async session() {
    const { data, error } = await (await this.client).auth.getSession();
    if (error) throw error;
    return data.session?.user || null;
  }
  async subscribe(callback: (user: User | null) => void) {
    const { data } = (await this.client).auth.onAuthStateChange(
      (_event, session) => callback(session?.user || null),
    );
    return () => data.subscription.unsubscribe();
  }
  async signIn(email: string, redirectTo: string) {
    const { error } = await (
      await this.client
    ).auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  }
  async signOut() {
    const { error } = await (
      await this.client
    ).auth.signOut({ scope: "local" });
    if (error) throw error;
  }
  async save(job: CloudJob) {
    if (
      new TextEncoder().encode(JSON.stringify(job.snapshot)).byteLength >
      10_000_000
    )
      throw Error(
        "This workspace is too large for cloud backup. Export a JSON backup and contact the administrator.",
      );
    const { data, error } = await (
      await this.client
    ).rpc("save_workspace_backup", {
      p_backup_id: job.id,
      p_owner_id: job.ownerId,
      p_device_id: job.deviceId,
      p_device_name: job.deviceName,
      p_workspace_id: job.snapshot.id,
      p_workspace_name:
        `${job.snapshot.settings.term}${job.snapshot.timetableName ? ` - ${job.snapshot.timetableName}` : ""}`.slice(
          0,
          200,
        ),
      p_revision: job.snapshot.revision,
      p_snapshot: job.snapshot,
    });
    if (error) throw Error(error.message);
    if (data !== job.id)
      throw Error(
        "The cloud server did not confirm this backup. It remains queued locally.",
      );
  }
  async list(ownerId: string): Promise<CloudVersion[]> {
    const { data, error } = await (
      await this.client
    )
      .from("workspace_backups")
      .select(
        "id,workspace_id,device_id,device_name,workspace_name,revision,created_at",
      )
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw Error(error.message);
    return metadata.array().parse(data);
  }
  async download(ownerId: string, id: string) {
    const { data, error } = await (
      await this.client
    )
      .from("workspace_backups")
      .select("snapshot")
      .eq("owner_id", ownerId)
      .eq("id", id)
      .single();
    if (error) throw Error(error.message);
    const parsed = validateProject(data.snapshot);
    if (!parsed.ok)
      throw Error(`This cloud backup could not be read: ${parsed.error}`);
    return parsed.value;
  }
}
