import * as React from "react";
import useSWR from "swr";
import { Container, Card, Typography, Grid, Box } from "@mui/joy";
import Sidebar from "../components/Sidebar";
import ActionCard from "../components/ActionCard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const { data, error } = useSWR("/api/stats/global", fetcher);

  if (error) return <Container sx={{ mt: 6 }}>Error loading stats</Container>;
  if (!data) return <Container sx={{ mt: 6 }}>Loading...</Container>;

  const { totalsByAction, totalLocations, totalUniqueUsers } = data as any;

  const totalActionsSum = Object.keys(totalsByAction || {}).reduce(
    (acc, k) => acc + ((totalsByAction[k]?.totalHasPerformed as number) || 0),
    0,
  );
  const showNoData = totalLocations === 0 && totalActionsSum === 0;

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Sidebar selected="global" />

      <Box
        component="main"
        className="MainContent"
        sx={{
          px: { xs: 2, md: 6 },
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100dvh",
          gap: 1,
        }}
      >
        {showNoData ? (
          <Card variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography level="h4">No data available</Typography>
            <Typography sx={{ mt: 1 }}>
              It looks like there are no stats available. Make sure the bot is
              running and reachable. If you're running locally, ensure the bot's
              database is accessible or set <code>DATABASE_STORAGE</code> or
              configure <code>BOT_INTERNAL_URL</code> and{" "}
              <code>INTERNAL_TOKEN</code>.
            </Typography>
          </Card>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid xs={12} sm={6}>
                <Card
                  variant="outlined"
                  sx={{ p: 2, display: "flex", alignItems: "center" }}
                >
                  <Typography>
                    Community Reach: {totalLocations.toLocaleString()} locations
                  </Typography>
                </Card>
              </Grid>

              <Grid xs={12} sm={6}>
                <Card
                  variant="outlined"
                  sx={{ p: 2, display: "flex", alignItems: "center" }}
                >
                  <Typography>
                    Total Users: {(totalUniqueUsers ?? 0).toLocaleString()}{" "}
                    users
                  </Typography>
                </Card>
              </Grid>

              {Object.keys(totalsByAction).map((k) => {
                const a = totalsByAction[k] as any;
                const title = k.charAt(0).toUpperCase() + k.slice(1);

                const percent = totalUniqueUsers
                  ? Math.min(
                      100,
                      Math.round((a.totalUsers / totalUniqueUsers) * 100),
                    )
                  : 0;

                return (
                  <Grid xs={12} sm={2.4} key={k}>
                    <ActionCard title={title} percent={percent} k={k} a={a} />
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}
      </Box>
    </Box>
  );
}
