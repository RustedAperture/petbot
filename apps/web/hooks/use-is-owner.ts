import useSWR from "swr";
import { useSession } from "@/hooks/use-session";

const fetcher = async ([url]: [string, string]): Promise<boolean> => {
  const res = await fetch(url);
  if (!res.ok) {
    return false;
  }
  const json = await res.json().catch(() => null);
  return json?.isOwner === true;
};

/**
 * Whether the signed-in user is the site owner; the server enforces it regardless.
 * Keyed on the session user so ending the session drops the cached answer.
 */
export function useIsOwner() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const { data, isLoading } = useSWR(
    userId ? (["/api/owner/me", userId] as [string, string]) : null,
    fetcher,
  );
  return {
    isOwner: !!userId && data === true,
    isLoading: loading || (!!userId && isLoading),
  };
}
