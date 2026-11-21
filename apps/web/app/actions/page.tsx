"use client";

import { InfoIcon } from "lucide-react";
import ActionImagesCard from "@/components/action-images-card";
import CustomActionsManager from "@/components/custom-actions-manager";
import { StatsLoading } from "@/components/stats/stats-request-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCustomActions } from "@/hooks/use-custom-actions";
import { useSession } from "@/hooks/use-session";

export default function ActionsPage() {
  const { session, loading } = useSession();

  if (!session) {
    return (
      <main className="w-full">
        {loading ? (
          <StatsLoading label="Loading…" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign in to manage your actions.
          </p>
        )}
      </main>
    );
  }

  return <ActionsContent userId={session.user.id} />;
}

function ActionsContent({ userId }: { userId: string }) {
  const { isBanned, banReason, isLoading } = useCustomActions({
    kind: "user",
    userId,
  });

  // Waiting for the first load keeps the custom actions card from flashing up for a banned user.
  if (isLoading) {
    return (
      <main className="w-full">
        <StatsLoading label="Loading…" />
      </main>
    );
  }

  if (isBanned) {
    return (
      <main className="flex w-full flex-col gap-6">
        <Alert variant="destructive">
          <InfoIcon className="size-4" aria-hidden="true" />
          <AlertTitle>You can&apos;t create custom actions</AlertTitle>
          {banReason && <AlertDescription>{banReason}</AlertDescription>}
        </Alert>
        <ActionImagesCard userId={userId} />
      </main>
    );
  }

  return (
    <main className="grid w-full items-start gap-6 xl:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Your custom actions</CardTitle>
          <CardDescription>
            Actions you can use on anyone, and anyone can use on you, with
            /action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomActionsManager scope={{ kind: "user", userId }} />
        </CardContent>
      </Card>
      <ActionImagesCard userId={userId} className="min-w-0" />
    </main>
  );
}
