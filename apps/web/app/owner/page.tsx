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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
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
  image: string | null;
  createdAt: string;
};

type Ban = { userId: string; createdAt: string; reason: string | null };

const DISCORD_ID = /^\d{17,20}$/;
const MAX_BAN_REASON_LENGTH = 200;
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
  const [pendingBan, setPendingBan] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState<OwnerAction | null>(null);
  const [banReason, setBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const actionsKey = `/api/owner/customActions${query}`;
  const actions = useSWR<{ actions: OwnerAction[] }>(actionsKey, fetcher);
  const bans = useSWR<{ bans: Ban[] }>("/api/owner/bans", fetcher);

  async function send(
    url: string,
    method: "PUT" | "DELETE",
    body?: object,
  ): Promise<boolean> {
    setActionError(null);
    try {
      await readJson(
        await fetch(url, {
          method,
          ...(body
            ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
            : {}),
        }),
      );
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
    openBan(userId);
  }

  function openBan(userId: string) {
    setBanReason("");
    setPendingBan(userId);
  }

  async function confirmBan() {
    const userId = pendingBan;
    if (!userId || isBanning) {
      return;
    }
    setIsBanning(true);
    const isBanned = await send(
      `/api/owner/bans/${encodeURIComponent(userId)}`,
      "PUT",
      { reason: banReason.trim() || null },
    );
    setIsBanning(false);
    setPendingBan(null);
    if (isBanned) {
      setBanInput((current) => (current.trim() === userId ? "" : current));
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
  const bannedIds = new Set(banList.map((b) => b.userId));

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
            className="shrink-0"
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
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`Edit ${action.name}`}
                        onClick={() => setEditingAction(action)}
                      >
                        Edit
                      </Button>
                      {action.createdBy && (
                        <BanToggle
                          userId={action.createdBy}
                          isBanned={bannedIds.has(action.createdBy)}
                          onBan={openBan}
                          onUnban={handleUnban}
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        aria-label={`Delete ${action.name}`}
                        onClick={() => setPendingDelete(action)}
                      >
                        Delete
                      </Button>
                    </div>
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
                  {ban.reason && (
                    <ItemDescription>{ban.reason}</ItemDescription>
                  )}
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

      <EditActionDialog
        key={editingAction?.id ?? "none"}
        action={editingAction}
        onClose={() => setEditingAction(null)}
        onSaved={() => void actions.mutate()}
      />

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

      <AlertDialog
        open={pendingBan !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPendingBan(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban {pendingBan}</AlertDialogTitle>
            <AlertDialogDescription>
              They won&apos;t be able to create or update custom actions. The
              reason is shown to them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            aria-label="Ban reason"
            placeholder="Reason (optional)"
            maxLength={MAX_BAN_REASON_LENGTH}
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isBanning}
              onClick={() => void confirmBan()}
            >
              Ban user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function BanToggle({
  userId,
  isBanned,
  onBan,
  onUnban,
}: {
  userId: string;
  isBanned: boolean;
  onBan: (userId: string) => void;
  onUnban: (userId: string) => Promise<void>;
}) {
  const label = isBanned ? "Unban" : "Ban";
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={`${label} ${userId}`}
      onClick={() => void (isBanned ? onUnban(userId) : onBan(userId))}
    >
      {label}
    </Button>
  );
}

/** Owner moderation: change an action's phrase and image; its name stays. */
function EditActionDialog({
  action,
  onClose,
  onSaved,
}: {
  action: OwnerAction | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [phrase, setPhrase] = useState(action?.phrase ?? "");
  const [image, setImage] = useState(action?.image ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!action || isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await readJson(
        await fetch(
          `/api/owner/customActions/${encodeURIComponent(action.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phrase, image }),
          },
        ),
      );
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : FALLBACK_ERROR);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={action !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSave} className="flex flex-col gap-6" noValidate>
          <DialogHeader>
            <DialogTitle>Edit {action?.name}</DialogTitle>
            <DialogDescription>
              The name stays the same so people keep their images and stats.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="owner-edit-phrase">Phrase</FieldLabel>
              <Input
                id="owner-edit-phrase"
                value={phrase}
                maxLength={32}
                onChange={(e) => setPhrase(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="owner-edit-image">Image URL</FieldLabel>
              <Input
                id="owner-edit-image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
