import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { formatNumber } from "@/lib/format";

interface StatsCardProps {
  statString: string;
  value: number;
}

export default function StatsCardSimple({ statString, value }: StatsCardProps) {
  return (
    <Card className="relative mx-auto w-full">
      <CardContent>
        <b>{statString}:</b> {formatNumber(value)}
      </CardContent>
    </Card>
  );
}
