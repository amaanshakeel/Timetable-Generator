import { generateCandidate } from "./search";
import type { Project } from "../domain/types";
self.onmessage = (e: MessageEvent<{ project: Project; runId: string }>) => {
  const { project, runId } = e.data;
  try {
    const result = generateCandidate(project, { budgetMs: 2500 }, (progress) =>
      self.postMessage({ kind: "progress", runId, progress }),
    );
    self.postMessage({ kind: "result", runId, result });
  } catch (error) {
    self.postMessage({
      kind: "error",
      runId,
      error: error instanceof Error ? error.message : "Generation failed",
    });
  }
};
