import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Project } from "../domain/types";
import { CloudOutbox } from "./outbox";
import { CloudBackupQueue, type UploadStatus } from "./queue";
import { cloudConfig, SupabaseBackups, type CloudVersion } from "./supabase";

function enabledFor(id: string) {
  try {
    return localStorage.getItem("uor-cloud-enabled-" + id) === "true";
  } catch {
    return false;
  }
}
export function useCloudBackups(
  project: Project,
  ready: boolean,
  readOnly: boolean,
  localStatus: string,
) {
  const [configuration] = useState(() => {
    try {
      return { config: cloudConfig(import.meta.env) };
    } catch {
      return {
        config: null,
        error:
          "Cloud backup is not configured correctly. Contact the administrator.",
      };
    }
  });
  const [user, setUser] = useState<User | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [device, setDevice] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [status, setStatus] = useState<
    UploadStatus["state"] | "ready" | "pending"
  >("ready");
  const [error, setError] = useState(configuration.error || "");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [versions, setVersions] = useState<CloudVersion[]>([]);
  const [busy, setBusy] = useState(false);
  const service = useRef<SupabaseBackups | null>(null);
  const outbox = useRef<CloudOutbox | null>(null);
  const queue = useRef<CloudBackupQueue | null>(null);
  const owner = useRef<string | null>(null);
  const latest = useRef({ project, ready, readOnly, localStatus });
  latest.current = { project, ready, readOnly, localStatus };
  const retryDelay = useRef(5000);
  const confirmed = useRef(new Map<string, string>());
  useEffect(() => {
    if (!configuration.config) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    const client = new SupabaseBackups(configuration.config);
    const store = new CloudOutbox();
    service.current = client;
    outbox.current = store;
    const worker = new CloudBackupQueue(
      store,
      (job) => client.save(job),
      (update) => {
        if (!disposed && owner.current === update.ownerId) {
          if (update.state === "saved") {
            confirmed.current.set(
              `${update.ownerId}:${update.workspaceId}`,
              `${update.revision}:${update.workspaceSavedAt}`,
            );
            const current = latest.current.project;
            setStatus(
              confirmed.current.get(`${update.ownerId}:${current.id}`) ===
                `${current.revision}:${current.savedAt}`
                ? "saved"
                : "pending",
            );
          } else setStatus(update.state);
          setError(update.message || "");
          if (update.savedAt) {
            setLastSaved(update.savedAt);
            retryDelay.current = 5000;
          }
        }
      },
    );
    queue.current = worker;
    const changeUser = (value: User | null) => {
      if (disposed) return;
      if (owner.current !== (value?.id || null)) {
        worker.setOwner(null);
        setVersions([]);
        setBusy(false);
        setLastSaved(null);
        setError("");
        setStatus("ready");
      }
      owner.current = value?.id || null;
      setUser(value);
      let automatic = false;
      if (value) {
        try {
          const previousOwner = localStorage.getItem("uor-cloud-last-owner");
          if (previousOwner && previousOwner !== value.id)
            localStorage.setItem("uor-cloud-enabled-" + value.id, "false");
          localStorage.setItem("uor-cloud-last-owner", value.id);
          automatic = enabledFor(value.id);
        } catch {
          /* Explicit manual backups remain available without saved preferences. */
        }
      }
      setEnabled(automatic);
    };
    void (async () => {
      try {
        let changed = false;
        unsubscribe = await client.subscribe((value) => {
          changed = true;
          changeUser(value);
        });
        const [currentUser, currentDevice] = await Promise.all([
          client.session(),
          store.device(),
        ]);
        if (disposed) {
          unsubscribe();
          return;
        }
        setDevice(currentDevice);
        if (!changed) changeUser(currentUser);
      } catch (error) {
        if (!disposed)
          setError(
            error instanceof Error
              ? error.message
              : "Cloud backup connection failed.",
          );
      }
    })();
    return () => {
      disposed = true;
      worker.setOwner(null);
      unsubscribe?.();
    };
  }, [configuration]);
  const setAutomatic = useCallback((value: boolean) => {
    if (!owner.current) return;
    try {
      localStorage.setItem("uor-cloud-enabled-" + owner.current, String(value));
      setEnabled(value);
    } catch {
      setError(
        "Could not save the backup preference. Local timetable saving still works.",
      );
    }
  }, []);
  useEffect(() => {
    const refreshPreference = () => {
      if (owner.current) setEnabled(enabledFor(owner.current));
    };
    window.addEventListener("storage", refreshPreference);
    return () => window.removeEventListener("storage", refreshPreference);
  }, []);
  useEffect(() => {
    queue.current?.setOwner(user && !readOnly ? user.id : null);
    if (user && !readOnly && navigator.onLine) void queue.current?.flush();
  }, [user?.id, readOnly]);
  useEffect(() => {
    if (!user) return;
    const acknowledged =
      confirmed.current.get(`${user.id}:${project.id}`) ===
      `${project.revision}:${project.savedAt}`;
    setStatus((previous) =>
      previous === "error" || previous === "uploading"
        ? previous
        : acknowledged
          ? "saved"
          : enabled
            ? "pending"
            : "ready",
    );
  }, [user?.id, project.id, project.revision, project.savedAt, enabled]);
  const backupNow = useCallback(async (manual = false) => {
    const state = latest.current;
    const ownerId = owner.current;
    if (
      !ownerId ||
      !outbox.current ||
      !queue.current ||
      !state.ready ||
      state.readOnly
    )
      return;
    if (!manual && !enabledFor(ownerId)) return;
    if (state.localStatus !== "All changes saved") {
      setError("Wait for the local save to finish before backing up.");
      return;
    }
    try {
      const currentDevice = await outbox.current.device();
      if (
        owner.current !== ownerId ||
        latest.current.readOnly ||
        (!manual && !enabledFor(ownerId))
      )
        return;
      await outbox.current.put(
        ownerId,
        currentDevice.id,
        currentDevice.name,
        state.project,
      );
      if (
        owner.current !== ownerId ||
        latest.current.readOnly ||
        (!manual && !enabledFor(ownerId))
      )
        return;
      queue.current.setOwner(ownerId);
      setStatus("pending");
      if (navigator.onLine) await queue.current.flush();
    } catch (error) {
      if (owner.current === ownerId) {
        setStatus("error");
        setError(
          error instanceof Error
            ? error.message
            : "Cloud backup could not be queued.",
        );
      }
    }
  }, []);
  useEffect(() => {
    if (
      !user ||
      !enabled ||
      !ready ||
      readOnly ||
      localStatus !== "All changes saved"
    )
      return;
    setStatus("pending");
    const timer = setTimeout(() => void backupNow(), 5000);
    return () => clearTimeout(timer);
  }, [
    user?.id,
    enabled,
    ready,
    readOnly,
    localStatus,
    project.id,
    project.revision,
    project.savedAt,
    backupNow,
  ]);
  useEffect(() => {
    if (!user || readOnly) return;
    const online = () => {
      if (enabled) void backupNow();
      else void queue.current?.flush();
    };
    window.addEventListener("online", online);
    const timer =
      status === "error" && navigator.onLine
        ? setTimeout(() => {
            retryDelay.current = Math.min(retryDelay.current * 2, 60000);
            void queue.current?.flush();
          }, retryDelay.current)
        : undefined;
    return () => {
      window.removeEventListener("online", online);
      clearTimeout(timer);
    };
  }, [user?.id, enabled, readOnly, status, backupNow]);
  const refresh = useCallback(async () => {
    const ownerId = owner.current;
    if (!ownerId || !service.current) return;
    setBusy(true);
    setError("");
    try {
      const result = await service.current.list(ownerId);
      if (owner.current === ownerId) setVersions(result);
    } catch (error) {
      if (owner.current === ownerId)
        setError(
          error instanceof Error
            ? error.message
            : "Could not load cloud backups.",
        );
    } finally {
      if (owner.current === ownerId) setBusy(false);
    }
  }, []);
  return {
    configured: Boolean(configuration.config),
    user,
    enabled,
    device,
    status,
    error,
    lastSaved,
    versions,
    busy,
    setAutomatic,
    backupNow: () => backupNow(true),
    refresh,
    signIn: async (email: string) => {
      if (!service.current) throw Error("Cloud backup is not connected.");
      await service.current.signIn(
        email,
        new URL(import.meta.env.BASE_URL, window.location.origin).href,
      );
    },
    signOut: async () => {
      setAutomatic(false);
      queue.current?.setOwner(null);
      await service.current?.signOut();
    },
    renameDevice: async (name: string) => {
      if (outbox.current) setDevice(await outbox.current.nameDevice(name));
    },
    download: async (id: string) => {
      const ownerId = owner.current;
      if (!ownerId || !service.current)
        throw Error("Sign in to recover a backup.");
      const result = await service.current.download(ownerId, id);
      if (owner.current !== ownerId)
        throw Error("The signed-in account changed. Select the backup again.");
      return result;
    },
  };
}
export type CloudBackupsState = ReturnType<typeof useCloudBackups>;
