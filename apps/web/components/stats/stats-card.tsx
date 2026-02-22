import Image from "next/image";
import { Badge } from "../ui/badge";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { formatNumber, formatPercentage } from "@/lib/format";

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
    <Card className="relative mx-auto w-full md:max-w-sm pt-0">
      <Image
        src={actionImageUrl}
        alt={displayName}
        width={400}
        height={400}
        sizes="(min-width: 768px) 384px, 100vw"
        className="block w-full aspect-square object-cover rounded-t-xl"
      />
      <CardHeader>
        <CardTitle>{displayName}</CardTitle>
      </CardHeader>
      <CardFooter>
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-1 flex-wrap">
            <p className="shrink">
              <b>Performed:</b>
            </p>
            <div className="flex justify-between grow">
              {formatNumber(performedCount)}
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
              {formatNumber(userCount)}
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
