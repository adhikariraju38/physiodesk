"use client";

import { useEffect, useState } from "react";

import { useDebounced } from "@/lib/use-debounced";
import { useQueryParams } from "@/lib/use-query-params";

/**
 * A search box backed by a url parameter.
 *
 * The input stays local so typing feels immediate, and the url catches up once
 * the typing stops. The effect the other way round keeps the box honest when
 * the url changes from outside, which is what the back button does.
 */
export function useUrlSearch(key = "search") {
  const { get, set } = useQueryParams();
  const fromUrl = get(key);

  const [value, setValue] = useState(fromUrl);
  const settled = useDebounced(value);

  useEffect(() => {
    if (settled !== fromUrl) {
      set({ [key]: settled || null }, { resetPage: true, history: "replace" });
    }
  }, [settled, fromUrl, key, set]);

  useEffect(() => {
    setValue(fromUrl);
  }, [fromUrl]);

  return { value, setValue, settled: fromUrl };
}
