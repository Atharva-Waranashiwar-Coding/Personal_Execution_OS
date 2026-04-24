"use client";

import {
  type Dispatch,
  type SetStateAction,
  startTransition,
  useEffect,
  useState,
} from "react";

import { getErrorMessage } from "@/lib/format";

export interface UseApiQueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: Dispatch<SetStateAction<T | null>>;
}

export function useApiQuery<T>(loader: () => Promise<T>): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let isActive = true;

    const execute = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await loader();

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setData(result);
        });
      } catch (loaderError) {
        if (isActive) {
          setError(getErrorMessage(loaderError));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void execute();

    return () => {
      isActive = false;
    };
  }, [loader, reloadIndex]);

  return {
    data,
    error,
    loading,
    reload: async () => {
      setReloadIndex((current) => current + 1);
    },
    setData,
  };
}
