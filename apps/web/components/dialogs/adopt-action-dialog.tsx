"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
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
import { useCustomActions, usePhraseFor } from "@/hooks/use-custom-actions";

/** Makes someone else's custom action one of the user's own, under the same name. */
export function AdoptActionDialog({
  userId,
  name,
  onClose,
}: {
  userId: string;
  name: string | null;
  onClose: () => void;
}) {
  const id = useId();
  const { save } = useCustomActions({ kind: "user", userId });
  const commonPhrase = usePhraseFor(name ?? "");
  const [typedPhrase, setTypedPhrase] = useState<string | null>(null);
  const [image, setImage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Follows the suggested phrase until the user types their own.
  const phrase = typedPhrase ?? commonPhrase ?? "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name || isSaving) {
      return;
    }
    setIsSaving(true);
    const message = await save({
      name,
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
      open={name !== null}
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
            <DialogTitle>Adopt {name}</DialogTitle>
            <DialogDescription>
              Make it one of your own custom actions. Your stats for it stay.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-phrase`}>Phrase</FieldLabel>
              <Input
                id={`${id}-phrase`}
                value={phrase}
                maxLength={32}
                onChange={(e) => setTypedPhrase(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-image`}>Image URL</FieldLabel>
              <Input
                id={`${id}-image`}
                placeholder="https://example.com/image.gif"
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
              {isSaving ? "Adopting…" : "Adopt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
