import useSWR from "swr";

const fetcher = async (url: string): Promise<boolean> => {
  const res = await fetch(url);
  if (!res.ok) {
    return false;
  }
  const json = await res.json().catch(() => null);
  return json?.isOwner === true;
};

/** Whether the signed-in user is the site owner; the server enforces it regardless. */
export function useIsOwner() {
  const { data, isLoading } = useSWR("/api/owner/me", fetcher);
  return { isOwner: data === true, isLoading };
}
