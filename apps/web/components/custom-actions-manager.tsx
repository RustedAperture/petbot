"use client";

import { useId, useState, type FormEvent } from "react";
import { XIcon } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { useCustomActions } from "@/hooks/use-custom-actions";
import {
  MAX_CUSTOM_ACTIONS,
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

  const trimmedName = name.trim().toLowerCase();
  const isUpdate = actions.some((a) => a.name === trimmedName);
  const isAtLimit = actions.length >= MAX_CUSTOM_ACTIONS && !isUpdate;

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
            <EmptyDescription>Add one below.</EmptyDescription>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${action.name}`}
                  onClick={() => void remove(action.name)}
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
    </div>
  );
}
