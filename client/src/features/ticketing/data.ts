import { useCallback, useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import api from "../../lib/api";
export const money = (value: string | number = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
export const when = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export function message(e: unknown) {
  return axios.isAxiosError(e)
    ? String(e.response?.data?.message ?? "Không kết nối được máy chủ.")
    : e instanceof Error
      ? e.message
      : "Có lỗi xảy ra.";
}
export async function get<T>(url: string): Promise<T> {
  return (await api.get<{ data: T }>(url)).data.data;
}
export function useLoad<T>(url: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    get<T>(url)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, version]);
  return {
    data,
    error,
    loading,
    reload: useCallback(() => setVersion((v) => v + 1), []),
  };
}
export function values(e: FormEvent<HTMLFormElement>) {
  return Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<
    string,
    string
  >;
}
