import { Card, CardContent } from "../ui/card";
import { formatNumber } from "@/lib/format";

interface StatsCardProps {
  statString: string;
  value: number;
}

export default function StatsCardSimple({ statString, value }: StatsCardProps) {
  return (
    <Card className="relative mx-auto w-full justify-center bg-linear-to-l from-primary/10 to-50%">
      <CardContent className="flex items-center justify-between gap-1">
        <b>{statString}</b>
        {formatNumber(value)}
      </CardContent>
    </Card>
  );
}
