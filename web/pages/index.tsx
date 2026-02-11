import * as React from "react";
import useSWR from "swr";
import { Container, Card, Typography, Grid, Box, CircularProgress } from "@mui/joy";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const { data, error } = useSWR("/api/stats/global", fetcher);

  if (error) return <Container sx={{ mt: 6 }}>Error loading stats</Container>;
  if (!data) return <Container sx={{ mt: 6 }}>Loading...</Container>;

  const { totalsByAction, totalLocations, totalUniqueUsers } = data as any;

  // If the DB is empty we may get all zeros — show a helpful message
  const totalActionsSum = Object.keys(totalsByAction || {}).reduce(
    (acc, k) => acc + ((totalsByAction[k]?.totalHasPerformed as number) || 0),
    0,
  );
  const showNoData = totalLocations === 0 && totalActionsSum === 0;

  return (
    <Container sx={{ mt: 6 }}>
      <Typography level="h2">PetBot Global Stats</Typography>

      {showNoData ? (
        <Card variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography level="h4">No data available</Typography>
          <Typography sx={{ mt: 1 }}>
            It looks like there are no stats available. Make sure the bot is
            running and reachable. If you're running locally, ensure the bot's
            database is accessible or set <code>DATABASE_STORAGE</code> or
            configure <code>BOT_INTERNAL_URL</code> and <code>INTERNAL_TOKEN</code>.
          </Typography>
        </Card>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2, display: "flex", alignItems: "center" }}>
                <Typography>Community Reach: {totalLocations.toLocaleString()} locations</Typography>
              </Card>
            </Grid>

            <Grid xs={12} sm={6}>
              <Card variant="outlined" sx={{ p: 2, display: "flex", alignItems: "center" }}>
                <Typography>Total Users: {(
                  totalUniqueUsers ?? 0
                ).toLocaleString()} users</Typography>
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
                <Grid key={k} xs={12} sm={6} md={4}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: 2,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                      <Typography level="title-md">{title}</Typography>
                      <Typography>{a.totalHasPerformed.toLocaleString()} total</Typography>
                      <Typography>{a.totalUsers.toLocaleString()} users</Typography>
                    </Box>

                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                      aria-hidden={false}
                      aria-label={`${percent}% of users have used ${title}`}
                    >
                      <CircularProgress
                        size="lg"
                        thickness={8}
                        value={percent}
                        aria-hidden
                        determinate
                      />
                      <Typography
                        sx={{
                          position: "absolute",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {percent}%
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </Container>
  );
}
