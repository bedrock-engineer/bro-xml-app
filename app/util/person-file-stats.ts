import type { PostHog } from "posthog-js";
import { type BROData, getFileType } from "~/types/bro-data";

const STORAGE_KEY = "bro_file_stats";

interface FileStats {
  maxFilesLoaded: number;
  fileTypesEverLoaded: Array<string>;
}

const emptyStats: FileStats = { maxFilesLoaded: 0, fileTypesEverLoaded: [] };

/**
 * Person-level usage summary: the most files ever loaded at once and every
 * file type ever viewed. The running values live in localStorage so they
 * survive reloads; PostHog `$set` would otherwise overwrite rather than
 * take a maximum or a union. Sent on every change to the loaded set (loads
 * are infrequent), so a fresh anonymous person gets the properties too.
 */
export function recordLoadedFiles(
  posthog: PostHog,
  files: Array<BROData>,
): void {
  if (files.length === 0) {
    return;
  }
  const previous = readStats();
  const types = new Set([
    ...previous.fileTypesEverLoaded,
    ...files.map((file) => getFileType(file)),
  ]);
  const next: FileStats = {
    maxFilesLoaded: Math.max(previous.maxFilesLoaded, files.length),
    fileTypesEverLoaded: [...types].toSorted(),
  };
  writeStats(next);
  posthog.setPersonProperties({
    max_files_loaded: next.maxFilesLoaded,
    file_types_ever_loaded: next.fileTypesEverLoaded,
  });
}

function readStats(): FileStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return emptyStats;
    }
    const parsed = JSON.parse(raw) as Partial<FileStats>;
    return {
      maxFilesLoaded:
        typeof parsed.maxFilesLoaded === "number" ? parsed.maxFilesLoaded : 0,
      fileTypesEverLoaded: Array.isArray(parsed.fileTypesEverLoaded)
        ? parsed.fileTypesEverLoaded.filter((t) => typeof t === "string")
        : [],
    };
  } catch {
    return emptyStats;
  }
}

function writeStats(stats: FileStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Quota exceeded / private browsing — the session-only values still go out.
  }
}
