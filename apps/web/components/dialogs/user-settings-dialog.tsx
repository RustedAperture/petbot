import { useState, useEffect } from "react";
import { useSession } from "@/hooks/use-session";
import { useOptOut } from "@/hooks/use-opt-out";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "../ui/field";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

export function UserSettingsDialog({
  open,
  onOpenChange,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onDelete: () => Promise<void>;
}) {
  const { session } = useSession();
  const {
    optedOut,
    isLoading,
    error: optOutError,
    fetchStatus,
    toggle,
  } = useOptOut();
  const [typedId, setTypedId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalText, setFinalText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) void fetchStatus();
  }, [open, fetchStatus]);

  // load initial opt-out state when dialog opens
  const handleDeleteClick = () => {
    if (typedId.trim() !== session?.user.id) {
      setError("IDs do not match");
      return;
    }
    setError(null);
    setConfirmOpen(true);
  };

  const handleFinalConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl p-0 pt-6">
          <DialogHeader className="px-6">
            <DialogTitle>User Settings</DialogTitle>
          </DialogHeader>
          <Separator />
          <FieldGroup className="px-6">
            <FieldSet>
              <FieldLegend>Opt-Out of PetBot</FieldLegend>
              <FieldDescription>
                If you wish to opt-out of PetBot, please click the button below.
                This will prevent PetBot from interacting with your user on
                Discord. You can opt back in at any time by clicking the button
                again.
              </FieldDescription>
              <Button
                variant="outline"
                onClick={async () => {
                  // toggle opt-out status via hook
                  await toggle();
                }}
                disabled={isLoading}
              >
                {optedOut === null
                  ? "Loading…"
                  : optedOut
                    ? "Opt In"
                    : "Opt Out"}
              </Button>
              {optOutError && (
                <p className="text-sm text-destructive mt-1">
                  {optOutError.message}
                </p>
              )}
            </FieldSet>
          </FieldGroup>
          <Separator />
          <FieldGroup className="px-6">
            <FieldSet>
              <FieldLegend className="text-destructive">
                Delete My Data
              </FieldLegend>
              <FieldDescription>
                Deleting your data will permanently remove all Petbot
                information tied to your account, including your personal stats,
                any guild statistics and your opt-out status. This cannot be
                undone. To confirm, please type your Discord user ID (
                <code className="font-mono">{session?.user.id}</code>) in the
                field below.
              </FieldDescription>
              <Field orientation="horizontal">
                <Input
                  type="text"
                  placeholder={"User ID"}
                  value={typedId}
                  onChange={(e) => setTypedId(e.target.value)}
                />
                <Button
                  variant="destructive"
                  onClick={handleDeleteClick}
                  disabled={
                    !session?.user.id || typedId.trim() !== session?.user.id
                  }
                >
                  Delete
                </Button>
              </Field>
              {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
              )}
            </FieldSet>
          </FieldGroup>
          <DialogFooter
            showCloseButton
            className="bg-muted/50 p-6 border-t rounded-b-4xl"
          />
        </DialogContent>
      </Dialog>

      {/* confirmation dialog shown after the id check passes */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm bg-destructive text-destructive-foreground p-0 pt-6">
          <DialogHeader className="px-6">
            <DialogTitle>Are you absolutely sure?</DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="px-6 flex flex-col gap-6">
            <p>
              This will delete <strong>all</strong> of your Petbot data and
              cannot be undone. Please confirm that you want to proceed.
            </p>
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                Type <code className="font-mono">DELETE</code> to continue.
              </p>
              <Input
                type="text"
                placeholder="DELETE"
                value={finalText}
                onChange={(e) => setFinalText(e.target.value)}
              />
            </div>
            {deleteError && (
              <p className="text-sm font-medium mt-1">{deleteError}</p>
            )}
          </div>
          <DialogFooter className="bg-muted/50 p-6 border-t rounded-b-4xl">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleFinalConfirm()}
              disabled={finalText !== "DELETE" || isDeleting}
              className="bg-background text-destructive-foreground hover:bg-background/90 border ring"
            >
              {isDeleting ? "Deleting…" : "Yes, delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
