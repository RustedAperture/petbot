"use client";

import { useEffect, useState, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ActionIcon } from "@/components/action-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsOwner } from "@/hooks/use-is-owner";

type OwnerAction = {
  id: number;
  name: string;
  phrase: string;
  scope: "user" | "guild";
  ownerId: string;
  createdBy: string | null;
  createdAt: string;
};

type Ban = { userId: string; createdAt: string };

const DISCORD_ID = /^\d{17,20}$/;
const FALLBACK_ERROR = "Something went wrong. Please try again.";

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      typeof json?.error === "string" ? json.error : FALLBACK_ERROR,
    );
  }
  return json as T;
}

const fetcher = async <T,>(url: string): Promise<T> =>
  readJson<T>(await fetch(url));

/** Owner-only moderation of custom actions and banned creators. */
export default function OwnerPage() {
  const { isOwner, isLoading } = useIsOwner();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (!isOwner && !isLoading) {
      void mutate(
        (key) => typeof key === "string" && key.startsWith("/api/owner/"),
        undefined,
        { revalidate: false },
      );
    }
  }, [isOwner, isLoading, mutate]);

  if (isLoading) {
    return null;
  }
  if (!isOwner) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>You don&apos;t have access to this page.</EmptyTitle>
          <EmptyDescription>Only the site owner can moderate.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <OwnerDashboard />;
}

function OwnerDashboard() {
  const [filterInput, setFilterInput] = useState("");
  const [scopeInput, setScopeInput] = useState("");
  const [ownerInput, setOwnerInput] = useState("");
  const [query, setQuery] = useState("");
  const [banError, setBanError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [banInput, setBanInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState<OwnerAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const actionsKey = `/api/owner/customActions${query}`;
  const actions = useSWR<{ actions: OwnerAction[] }>(actionsKey, fetcher);
  const bans = useSWR<{ bans: Ban[] }>("/api/owner/bans", fetcher);

  async function send(url: string, method: "PUT" | "DELETE"): Promise<boolean> {
    setActionError(null);
    try {
      await readJson(await fetch(url, { method }));
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : FALLBACK_ERROR);
      return false;
    }
  }

  function handleFilter(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    const name = filterInput.trim().toLowerCase();
    const ownerId = ownerInput.trim();
    if (name) {
      params.set("name", name);
    }
    if (scopeInput) {
      params.set("scope", scopeInput);
    }
    if (ownerId) {
      params.set("ownerId", ownerId);
    }
    setQuery(params.size > 0 ? `?${params}` : "");
  }

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target || isDeleting) {
      return;
    }
    setIsDeleting(true);
    const isDeleted = await send(
      `/api/owner/customActions/${encodeURIComponent(target.id)}`,
      "DELETE",
    );
    setIsDeleting(false);
    setPendingDelete((current) => (current?.id === target.id ? null : current));
    if (isDeleted) {
      await actions.mutate();
    }
  }

  async function handleBan(event: FormEvent) {
    event.preventDefault();
    const userId = banInput.trim();
    if (!DISCORD_ID.test(userId)) {
      setBanError("Enter a valid Discord user ID.");
      return;
    }
    setBanError(null);
    if (await send(`/api/owner/bans/${encodeURIComponent(userId)}`, "PUT")) {
      setBanInput("");
      await bans.mutate();
    }
  }

  async function handleUnban(userId: string) {
    if (await send(`/api/owner/bans/${encodeURIComponent(userId)}`, "DELETE")) {
      await bans.mutate();
    }
  }

  const rows = actions.data?.actions ?? [];
  const banList = bans.data?.bans ?? [];

  return (
    <main className="flex flex-col gap-8 p-4">
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Custom actions</h1>
        <form onSubmit={handleFilter} className="flex gap-2">
          <Input
            aria-label="Filter by name"
            placeholder="Filter by name"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
          />
          <NativeSelect
            aria-label="Scope"
            value={scopeInput}
            onChange={(e) => setScopeInput(e.target.value)}
          >
            <NativeSelectOption value="">All</NativeSelectOption>
            <NativeSelectOption value="guild">Server</NativeSelectOption>
            <NativeSelectOption value="user">Personal</NativeSelectOption>
          </NativeSelect>
          <Input
            aria-label="Owner ID"
            placeholder="Owner ID"
            value={ownerInput}
            onChange={(e) => setOwnerInput(e.target.value)}
          />
          <Button type="submit">Filter</Button>
        </form>
        {actionError && (
          <p className="text-sm text-destructive">{actionError}</p>
        )}
        {actions.error ? (
          <p className="text-sm text-destructive">{actions.error.message}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phrase</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Owner ID</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((action) => (
                <TableRow key={action.id}>
                  <TableCell>
                    <ActionIcon actionType={action.name} />
                  </TableCell>
                  <TableCell>{action.name}</TableCell>
                  <TableCell>{action.phrase}</TableCell>
                  <TableCell>{action.scope}</TableCell>
                  <TableCell>{action.ownerId}</TableCell>
                  <TableCell>{action.createdBy ?? "-"}</TableCell>
                  <TableCell>{action.createdAt.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      aria-label={`Delete ${action.name}`}
                      onClick={() => setPendingDelete(action)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Banned creators</h2>
        <form onSubmit={handleBan} className="flex gap-2">
          <Input
            aria-label="User ID"
            placeholder="User ID"
            value={banInput}
            onChange={(e) => setBanInput(e.target.value)}
          />
          <Button type="submit">Ban</Button>
        </form>
        {banError && <p className="text-sm text-destructive">{banError}</p>}
        {bans.error ? (
          <p className="text-sm text-destructive">{bans.error.message}</p>
        ) : (
          <ItemGroup>
            {banList.map((ban) => (
              <Item key={ban.userId} variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>{ban.userId}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Unban ${ban.userId}`}
                    onClick={() => void handleUnban(ban.userId)}
                  >
                    Unban
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
      </section>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom action</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{pendingDelete?.name}</strong>? This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
