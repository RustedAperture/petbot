import Image from "next/image";
import { Badge } from "../ui/badge";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { formatNumber, formatPercentage } from "@/lib/format";
import { NativeCounterUp } from "../uitripled/native-counter-up-carbon";

interface StatsCardProps {
  actionName: string;
  actionImageUrl: string;
  performedCount: number;
  userCount: number;
  totalUniqueUsers: number;
  totalActionsPerformed: number;
}

export default function StatsCard({
  actionName,
  actionImageUrl,
  performedCount,
  userCount,
  totalUniqueUsers,
  totalActionsPerformed,
}: StatsCardProps) {
  const displayName = actionName
    ? actionName[0].toUpperCase() + actionName.slice(1)
    : actionName;

  return (
    <Card className="pb-0 dark:bg-linear-to-t from-primary/20 to-15%">
      <Image
        src={actionImageUrl}
        alt={displayName}
        width={400}
        height={400}
        sizes="(min-width: 768px) 384px, 100vw"
        className="block w-full aspect-square object-cover rounded-xl"
      />
      <CardHeader>
        <CardTitle>{displayName}</CardTitle>
      </CardHeader>
      <CardFooter className="border-t bg-muted/50 pb-6">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-1 flex-wrap">
            <p className="shrink">
              <b>Performed:</b>
            </p>
            <div className="flex justify-between grow">
              <NativeCounterUp value={performedCount} className="font-normal" />
              <Badge variant="outline">
                {formatPercentage(performedCount, totalActionsPerformed)} of
                actions
              </Badge>
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            <p className="shrink">
              <b>Users:</b>
            </p>
            <div className="flex justify-between grow">
              <NativeCounterUp value={userCount} className="font-normal" />
              <Badge variant="outline">
                {formatPercentage(userCount, totalUniqueUsers)} of users
              </Badge>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
