import {
  AspectRatio,
  Card,
  CardContent,
  CardOverflow,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/joy";
import { ACTIONS } from "../../src/types/constants";

interface ActionCardProps {
  title: string;
  percent: number;
  k: string;
  a: {
    totalHasPerformed: number;
    totalUsers: number;
  };
}

export default function ActionCard({ title, percent, k, a }: ActionCardProps) {
  return (
    <Card variant="outlined" sx={{ minWidth: 100 }}>
      <CardOverflow variant="soft">
        <AspectRatio ratio="1">
          <img
            src={ACTIONS[k as keyof typeof ACTIONS]?.defaultImage}
            alt={`${title} default`}
            loading="lazy"
          />
        </AspectRatio>
        <Divider inset="context" />
        <CardContent sx={{ textAlign: "center" }}>
          <Typography level="title-md">{title}</Typography>
        </CardContent>
        <Divider inset="context" />
      </CardOverflow>
      <CardContent>
        <Grid
          container
          spacing={2}
          justifyContent={"space-around"}
          sx={{ textAlign: "center" }}
          padding={1}
        >
          <Stack justifyContent={"space-evenly"}>
            <Typography level="body-sm">
              {a.totalHasPerformed.toLocaleString()} total
            </Typography>
            <Typography level="body-sm">
              {a.totalUsers.toLocaleString()} users
            </Typography>
          </Stack>
          <CircularProgress
            size="lg"
            thickness={8}
            value={percent}
            aria-hidden
            determinate
          >
            <Typography>{percent}%</Typography>
          </CircularProgress>
        </Grid>
      </CardContent>
    </Card>
  );
}
