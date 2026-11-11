import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "./api";
import { errorMessage } from "./data";
import { useSession } from "./session";

type PageOptions<T, Item> = {
  items: (data: T) => Item[];
  more: (data: T, page: number) => boolean;
  key: (item: Item) => string;
};
type PageState<T, Item> = {
  identity: string;
  data: T | null;
  items: Item[];
  page: number;
  more: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string;
};

export function usePagedResource<T, Item>(
  path: string | null,
  options: PageOptions<T, Item>,
) {
  const { user } = useSession();
  const identity = `${user?.idUser ?? "guest"}:${path}`;
  const fresh = useCallback(
    (): PageState<T, Item> => ({
      identity,
      data: null,
      items: [],
      page: 0,
      more: false,
      loading: !!path,
      loadingMore: false,
      error: "",
    }),
    [identity, path],
  );
  const [state, setState] = useState(fresh);
  const snapshot = useRef(state);
  const generation = useRef(0),
    busy = useRef(false);
  const failed = useRef({ target: 0, append: false });
  const publish = useCallback((next: PageState<T, Item>) => {
    snapshot.current = next;
    setState(next);
  }, []);

  const fetchPages = useCallback(
    async (target: number, append: boolean, force = false) => {
      if (busy.current && !force) return;
      const current = ++generation.current;
      const base =
        snapshot.current.identity === identity ? snapshot.current : fresh();
      if (!path) {
        busy.current = false;
        publish({ ...fresh(), loading: false });
        return;
      }
      busy.current = true;
      failed.current = { target, append };
      publish({ ...base, loading: !append, loadingMore: append, error: "" });
      try {
        const merged = new Map<string, Item>();
        if (append)
          for (const item of base.items) merged.set(options.key(item), item);
        let data: T | null = null,
          more = false,
          page = 0;
        for (let index = append ? target : 0; index <= target; index++) {
          const separator = path.includes("?") ? "&" : "?";
          const url = /([?&])page=/.test(path)
            ? path.replace(/([?&])page=[^&]*/, `$1page=${index}`)
            : `${path}${separator}page=${index}`;
          data = await api.request<T>(url);
          if (generation.current !== current) return;
          const items = options.items(data);
          for (const item of items) merged.set(options.key(item), item);
          page = index;
          more = items.length > 0 && options.more(data, index);
          if (!more) break;
        }
        publish({
          identity,
          data,
          items: [...merged.values()],
          page,
          more,
          loading: false,
          loadingMore: false,
          error: "",
        });
      } catch (error) {
        if (generation.current === current)
          publish({
            ...base,
            loading: false,
            loadingMore: false,
            error: errorMessage(error),
          });
      } finally {
        if (generation.current === current) busy.current = false;
      }
    },
    [identity, path, options, fresh, publish],
  );

  useFocusEffect(
    useCallback(() => {
      const loaded =
        snapshot.current.identity === identity ? snapshot.current.page : 0;
      void fetchPages(loaded, false, true);
      return () => {
        generation.current++;
        busy.current = false;
      };
    }, [fetchPages, identity]),
  );

  return {
    ...(state.identity === identity ? state : fresh()),
    loadMore: useCallback(() => {
      const value = snapshot.current;
      if (
        value.identity === identity &&
        value.more &&
        !value.error &&
        !value.loading
      )
        void fetchPages(value.page + 1, true);
    }, [fetchPages, identity]),
    reload: useCallback(() => void fetchPages(0, false, true), [fetchPages]),
    refreshLoaded: useCallback(
      (force = false) => {
        const loaded =
          snapshot.current.identity === identity ? snapshot.current.page : 0;
        void fetchPages(loaded, false, force);
      },
      [fetchPages, identity],
    ),
    retry: useCallback(
      () => void fetchPages(failed.current.target, failed.current.append, true),
      [fetchPages],
    ),
  };
}
