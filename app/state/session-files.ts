import type { BROData } from "~/types/bro-data";

/**
 * One file loaded this session, whatever its origin. Uploads and sample
 * files carry their original XML as a Blob for the download button;
 * route-loaded objects arrive parsed (their XML is served by the
 * edge-cached /api/bro/:broId endpoint instead).
 */
export interface SessionFile {
  data: BROData;
  xml?: Blob;
}

/**
 * Session store of every loaded file, keyed by filename (uploads) or BRO ID
 * (route-loaded objects). Writers: the file-upload handlers and the /:broId
 * clientLoader. The App renders the file table from it via
 * useSyncExternalStore; removing a file deletes its entry.
 */
const files = new Map<string, SessionFile>();
const listeners = new Set<() => void>();
let snapshot: Record<string, SessionFile> = {};

const EMPTY_SNAPSHOT: Record<string, SessionFile> = {};

function emit(): void {
  snapshot = Object.fromEntries(files);
  for (const listener of listeners) {
    listener();
  }
}

export const sessionFilesStore = {
  get: (name: string): SessionFile | undefined => files.get(name),
  set: (name: string, file: SessionFile): void => {
    const previous = files.get(name);
    if (previous?.data === file.data && previous.xml === file.xml) {
      return;
    }
    files.set(name, file);
    emit();
  },
  /** Add several files with a single notification (multi-file uploads). */
  setMany: (entries: Record<string, SessionFile>): void => {
    const added = Object.entries(entries);
    if (added.length === 0) {
      return;
    }
    for (const [name, file] of added) {
      files.set(name, file);
    }
    emit();
  },
  delete: (name: string): void => {
    if (files.delete(name)) {
      emit();
    }
  },
  clear: (): void => {
    if (files.size > 0) {
      files.clear();
      emit();
    }
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): Record<string, SessionFile> => snapshot,
  /** SSR renders the current route object explicitly; the store is empty. */
  getServerSnapshot: (): Record<string, SessionFile> => EMPTY_SNAPSHOT,
};
