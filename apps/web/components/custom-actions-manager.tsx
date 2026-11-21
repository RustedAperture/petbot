"use client";

import { useId, useState, type FormEvent } from "react";
import Image from "next/image";
import { PencilIcon, XIcon } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { ImageLightbox } from "@/components/dialogs/image-lightbox";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { useCommonPhrase, useCustomActions } from "@/hooks/use-custom-actions";
import {
  MAX_CUSTOM_ACTIONS,
  type CustomAction,
  type CustomActionInput,
  type CustomActionsScope,
} from "@/types/custom-actions";

/** Lists, adds and removes the custom actions of a person or a server. */
export default function CustomActionsManager({
  scope,
}: {
  scope: CustomActionsScope;
}) {
  const {
    actions,
    isLoading,
    error: loadError,
    save,
    remove,
  } = useCustomActions(scope);
  const id = useId();
  const [name, setName] = useState("");
  const [phrase, setPhrase] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewing, setViewing] = useState<CustomAction | null>(null);
  // Kept apart from `viewing` so the image stays visible while the dialog closes.
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomAction | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const trimmedName = name.trim().toLowerCase();
  const isUpdate = actions.some((a) => a.name === trimmedName);
  const isAtLimit = actions.length >= MAX_CUSTOM_ACTIONS && !isUpdate;
  const commonPhrase = useCommonPhrase(trimmedName);
  const suggestedPhrase =
    commonPhrase && commonPhrase !== phrase.trim().toLowerCase()
      ? commonPhrase
      : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const message = await save({
      name: trimmedName,
      phrase: phrase.trim(),
      image: image.trim(),
    });
    setIsSaving(false);
    if (message) {
      setError(message);
      return;
    }
    setName("");
    setPhrase("");
    setImage("");
  }

  async function confirmRemove() {
    const actionName = pendingRemove;
    if (!actionName || isRemoving) {
      return;
    }
    setIsRemoving(true);
    setError(await remove(actionName));
    setIsRemoving(false);
    setPendingRemove(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {actions.length} of {MAX_CUSTOM_ACTIONS} used
      </p>

      {loadError ? (
        <p className="text-sm text-destructive">{loadError.message}</p>
      ) : actions.length === 0 && !isLoading ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No custom actions yet</EmptyTitle>
            <EmptyDescription>
              Add one below, then use it with /action.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup>
          {actions.map((action) => (
            <Item key={action.id} variant="outline" size="sm">
              <ItemMedia>
                <ActionIcon actionType={action.name} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{`${action.name} — ${action.phrase}`}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <button
                  type="button"
                  aria-label={`View ${action.name} image`}
                  className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => {
                    setViewing(action);
                    setIsViewOpen(true);
                  }}
                >
                  <Image
                    src={action.image}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 rounded-lg border object-cover transition-opacity hover:opacity-80"
                  />
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${action.name}`}
                  onClick={() => setEditing(action)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${action.name}`}
                  onClick={() => setPendingRemove(action.name)}
                >
                  <XIcon />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
            <Input
              id={`${id}-name`}
              placeholder="boop"
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-phrase`}>Phrase</FieldLabel>
            <Input
              id={`${id}-phrase`}
              placeholder="booped"
              value={phrase}
              maxLength={32}
              onChange={(e) => setPhrase(e.target.value)}
            />
            {suggestedPhrase && (
              <FieldDescription className="flex flex-wrap items-center gap-x-1">
                <span>{`Suggested phrase: “${suggestedPhrase}”.`}</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => setPhrase(suggestedPhrase)}
                >
                  Use this phrase
                </Button>
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-image`}>Image URL</FieldLabel>
            <Input
              id={`${id}-image`}
              placeholder="https://example.com/boop.gif"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" disabled={isAtLimit || isSaving}>
            {isUpdate ? "Update" : "Add"}
          </Button>
        </FieldGroup>
      </form>

      <ImageLightbox
        key={`view:${viewing?.id ?? ""}`}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        title={viewing ? `${viewing.name} — ${viewing.phrase}` : ""}
        images={viewing ? [viewing.image] : []}
        startIndex={0}
      />

      <EditCustomActionDialog
        key={`edit:${editing?.id ?? ""}`}
        action={editing}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPendingRemove(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove custom action</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{pendingRemove}</strong>? It stops working with
              /action. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRemoving}
              onClick={() => void confirmRemove()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Changes an action's phrase and image; the name is fixed because stats are stored under it. */
function EditCustomActionDialog({
  action,
  onClose,
  onSave,
}: {
  action: CustomAction | null;
  onClose: () => void;
  onSave: (input: CustomActionInput) => Promise<string | null>;
}) {
  const id = useId();
  const [phrase, setPhrase] = useState(action?.phrase ?? "");
  const [image, setImage] = useState(action?.image ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!action || isSaving) {
      return;
    }
    setIsSaving(true);
    const message = await onSave({
      name: action.name,
      phrase: phrase.trim(),
      image: image.trim(),
    });
    setIsSaving(false);
    if (message) {
      setError(message);
      return;
    }
    onClose();
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
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Edit {action?.name}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-phrase`}>Phrase</FieldLabel>
              <Input
                id={`${id}-phrase`}
                value={phrase}
                maxLength={32}
                onChange={(e) => setPhrase(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-image`}>Image URL</FieldLabel>
              <Input
                id={`${id}-image`}
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
