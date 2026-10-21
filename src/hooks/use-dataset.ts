"use client";

import { useEffect, useState } from "react";
import { getDB } from "@/lib/storage/db";
import { ensureSeeded } from "@/data/seed";

export interface DatasetState {
  ready: boolean;
  seeding: boolean;
  error: string | null;
}

export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({
    ready: false,
    seeding: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = getDB();
        await ensureSeeded(db);
        if (!cancelled) {
          setState({ ready: true, seeding: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            ready: false,
            seeding: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to initialize the local demo dataset.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
