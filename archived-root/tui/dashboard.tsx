export * from "../src/tui/dashboard.js";
import fs from "node:fs";
import { metrics } from "./bus.js";
import { ActionData, BotData } from "../utilities/db.js";
import { Op } from "sequelize";

function fmtTime(t: number | string): string {
  const d = new Date(typeof t === "string" ? Number(t) : t);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(
    d.getMilliseconds(),
  ).padStart(3, "0")}`;
}

type Counts = Record<string, number>;

function useEventMetrics() {
  const [counts, setCounts] = useState<Counts>({});
  const [perMinute, setPerMinute] = useState<number>(0);
  const timestampsRef = useRef<number[]>([]);

  useEffect(() => {
    const onEvent = (name: string) => {
      setCounts((c) => ({ ...c, [name]: (c[name] || 0) + 1 }));
      const now = Date.now();
      timestampsRef.current.push(now);
    };
    metrics.on("event", onEvent);
    const timer = setInterval(() => {
      const cutoff = Date.now() - 60_000;
      timestampsRef.current = timestampsRef.current.filter((t) => t >= cutoff);
      setPerMinute(timestampsRef.current.length);
    }, 1000);
    return () => {
      metrics.off("event", onEvent);
      clearInterval(timer);
    };
  }, []);

  const top = useMemo(() => {
    const entries = Object.entries(counts) as [string, number][];
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [counts]);

  return { counts, top, perMinute };
}

type LogEntry = {
  time: number | string | undefined;
  level: number | string | undefined;
  msg: string;
  meta?: any;
};

function useLogs() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const append = (entry: LogEntry) =>
    setEntries((prev) =>
      prev.length > 1000 ? [...prev.slice(-900), entry] : [...prev, entry],
    );

  useEffect(() => {
    const normalizeTextLine = (line: string): string => {
      return line.replace(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s+/, "[$1] ");
    };

    const extractMeta = (obj: Record<string, unknown>) => {
      const omit = new Set([
        "level",
        "time",
        "msg",
        "message",
        "pid",
        "hostname",
      ]);
      const meta: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (!omit.has(k)) meta[k] = v as unknown;
      }
      return Object.keys(meta).length ? meta : undefined;
    };

    const formatFromPino = (obj: any): LogEntry | null => {
      try {
        if (!obj || typeof obj !== "object") return null;
        if (!("level" in obj) || !("time" in obj)) return null;
        const msg = (obj as any).msg ?? (obj as any).message ?? "";
        return {
          time: (obj as any).time,
          level: (obj as any).level,
          msg: String(msg),
          meta: extractMeta(obj as any),
        };
      } catch {
        return null;
      }
    };

    const onLog = (raw: unknown) => {
      try {
        if (typeof raw === "string") {
          const s = raw.replace(/\n+$/, "").trim();
          if (!s) return;

          try {
            const obj = JSON.parse(s);
            const formatted = formatFromPino(obj);
            if (formatted) {
              append(formatted);
              return;
            }
          } catch {}

          append({
            time: undefined,
            level: undefined,
            msg: normalizeTextLine(s),
          });
        } else if (raw && typeof raw === "object") {
          const formatted = formatFromPino(raw);
          if (formatted) {
            append(formatted);
          } else {
            append({
              time: undefined,
              level: undefined,
              msg: JSON.stringify(raw),
            });
          }
        } else if (raw != null) {
          append({ time: undefined, level: undefined, msg: String(raw) });
        }
      } catch {
        append({ time: undefined, level: undefined, msg: String(raw) });
      }
    };
    metrics.on("log", onLog);

    let tailStream: fs.ReadStream | undefined;
    if (process.env.TUI_TAIL_FILE === "1") {
      const logPath = process.env.LOG_FILE || "app.json.log";
      if (fs.existsSync(logPath)) {
        tailStream = fs.createReadStream(logPath, {
          encoding: "utf8",
          flags: "r",
        });
        let buf = "";
        tailStream.on("data", (chunk) => {
          buf += chunk as string;
          let idx;
          while ((idx = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              const formatted = formatFromPino(obj);
              append(
                formatted ?? { time: undefined, level: undefined, msg: line },
              );
            } catch {
              append({
                time: undefined,
                level: undefined,
                msg: normalizeTextLine(line),
              });
            }
          }
        });
      }
    }

    return () => {
      metrics.off("log", onLog);
      tailStream?.destroy();
    };
  }, []);

  return entries;
}

function useDbStats() {
  const [totalHasPet, setTotalHasPet] = useState<number>(0);
  const [totalHasBitten, setTotalHasBitten] = useState<number>(0);
  const [totalGuilds, setTotalGuilds] = useState<number>(0);
  const [totalPetUsers, setTotalPetUsers] = useState<number>(0);
  const [totalBiteUsers, setTotalBiteUsers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalLocations, setTotalLocations] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const results = await Promise.all([
          ActionData.sum("has_performed", { where: { action_type: "pet" } }),
          ActionData.sum("has_performed", { where: { action_type: "bite" } }),
          BotData.count(),
          ActionData.count({
            distinct: true,
            col: "user_id",
            where: { action_type: "pet" },
          }),
          ActionData.count({
            distinct: true,
            col: "location_id",
            where: { action_type: "pet" },
          }),
          ActionData.count({
            distinct: true,
            col: "user_id",
            where: {
              action_type: "pet",
              has_performed: { [Op.gt]: 0 },
            },
          }),
          ActionData.count({
            distinct: true,
            col: "user_id",
            where: {
              action_type: "bite",
              has_performed: { [Op.gt]: 0 },
            },
          }),
        ]);
        if (!mounted) return;
        setTotalHasPet(Number(results[0]) || 0);
        setTotalHasBitten(Number(results[1]) || 0);
        setTotalGuilds(Number(results[2]) || 0);
        setTotalUsers(Number(results[3]) || 0);
        setTotalLocations(Number(results[4]) || 0);
        setTotalPetUsers(Number(results[5]) || 0);
        setTotalBiteUsers(Number(results[6]) || 0);
      } catch {}
    };
    fetchStats();
    const t = setInterval(fetchStats, 5000);
    const onEvent = () => {
      fetchStats();
    };
    metrics.on("event", onEvent);
    return () => {
      mounted = false;
      clearInterval(t);
      metrics.off("event", onEvent);
    };
  }, []);

  return {
    totalHasPet,
    totalHasBitten,
    totalGuilds,
    totalPetUsers,
    totalBiteUsers,
    totalUsers,
    totalLocations,
  };
}

const Dashboard: React.FC = () => {
  const { exit } = useApp();
  const { top } = useEventMetrics();
  const entries = useLogs();
  const {
    totalHasPet,
    totalHasBitten,
    totalGuilds,
    totalPetUsers,
    totalBiteUsers,
    totalUsers,
    totalLocations,
  } = useDbStats();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [hScrollOffset, setHScrollOffset] = useState(0);
  const windowEntries = 10;

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === "c") || input === "q") {
      exit();
      process.exit(0);
    }

    if (key.upArrow) {
      setScrollOffset((o) =>
        Math.min(o + 1, Math.max(0, entries.length - windowEntries)),
      );
    } else if (key.downArrow) {
      setScrollOffset((o) => Math.max(0, o - 1));
    } else if (key.pageUp) {
      setScrollOffset((o) =>
        Math.min(o + 5, Math.max(0, entries.length - windowEntries)),
      );
    } else if (key.pageDown) {
      setScrollOffset((o) => Math.max(0, o - 5));
    } else if (key.rightArrow) {
      setHScrollOffset((o) => o + 2);
    } else if (key.leftArrow) {
      setHScrollOffset((o) => Math.max(0, o - 2));
    } else if (input?.toLowerCase() === "h") {
      setHScrollOffset((o) => o + 2);
    } else if (input?.toLowerCase() === "l") {
      setHScrollOffset((o) => Math.max(0, o - 2));
    } else if (input === "g" && key.shift) {
      setScrollOffset(0);
    } else if (input === "g") {
      setScrollOffset(Math.max(0, entries.length - windowEntries));
    }
  });

  const levelColor = (lvl?: string) => {
    switch (lvl) {
      case "TRACE":
        return "gray" as any;
      case "DEBUG":
        return "cyan" as any;
      case "INFO":
        return "green" as any;
      case "WARN":
        return "yellow" as any;
      case "ERROR":
        return "red" as any;
      case "FATAL":
        return "magenta" as any;
      default:
        return undefined;
    }
  };

  const termCols = (process.stdout && process.stdout.columns) || 80;

  const logInnerWidth = Math.max(10, termCols - 6);

  type Seg = { text: string; props?: Parameters<typeof Text>[0] };
  function sliceSegments(segments: Seg[], start: number, width: number): Seg[] {
    let remainingSkip = Math.max(0, start);
    let remainingTake = Math.max(0, width);
    const out: Seg[] = [];
    for (const seg of segments) {
      if (remainingTake <= 0) break;
      const len = seg.text.length;
      if (remainingSkip >= len) {
        remainingSkip -= len;
        continue;
      }
      const from = remainingSkip;
      const take = Math.min(len - from, remainingTake);
      const piece = seg.text.slice(from, from + take);
      out.push({ text: piece, props: seg.props });
      remainingTake -= take;
      remainingSkip = 0;
    }
    if (out.length === 0) {
      out.push({ text: "" });
    }
    return out;
  }

  const renderEntry = (e: LogEntry, i: number) => {
    const lvl =
      e.level !== undefined
        ? typeof e.level === "string"
          ? e.level.toUpperCase()
          : undefined
        : undefined;
    const lvlLabel =
      lvl ??
      (typeof e.level === "number"
        ? ((): string => {
            switch (e.level as number) {
              case 10:
                return "TRACE";
              case 20:
                return "DEBUG";
              case 30:
                return "INFO";
              case 40:
                return "WARN";
              case 50:
                return "ERROR";
              case 60:
                return "FATAL";
              default:
                return String(e.level);
            }
          })()
        : undefined);
    const timeStr = e.time != null ? fmtTime(e.time) : undefined;

    const timestampText = timeStr ? `[${timeStr}]` : "";
    const lvlText = (lvlLabel ?? "LOG").toString();

    const badgeVisualWidth = (lvlText ? lvlText.length : 3) + 4; // heuristic padding for Badge
    const prefixLen =
      (timestampText ? timestampText.length : 0) + 1 + badgeVisualWidth + 1;

    const msgWidth = Math.max(0, logInnerWidth - prefixLen);

    const msgSegments: Seg[] = [{ text: e.msg } as any];
    const slicedMsg = sliceSegments(msgSegments, hScrollOffset, msgWidth);

    const metaLines =
      e.meta && typeof e.meta === "object" && Object.keys(e.meta).length > 0
        ? JSON.stringify(e.meta, null, 2).split("\n")
        : null;

    return (
      <Box key={String(i)} flexDirection="column">
        <Box flexDirection="row" width={logInnerWidth}>
          {}
          {timestampText ? (
            <Text color={"gray" as any} dimColor>
              {timestampText}
            </Text>
          ) : null}
          {}
          <Text> </Text>
          {}
          <Box marginRight={1}>
            <Badge color={(levelColor(lvlLabel) as any) || ("gray" as any)}>
              {lvlLabel ?? "LOG"}
            </Badge>
          </Box>
          {}
          {slicedMsg.map((seg, idx) => (
            <Text key={`seg-${idx}`} {...(seg.props || {})}>
              {seg.text}
            </Text>
          ))}
        </Box>
        {metaLines ? (
          <Box flexDirection="column">
            {metaLines.map((line, li) => {
              const segs: Seg[] = [
                { text: line, props: { dimColor: true } as any },
              ];
              const s = sliceSegments(segs, hScrollOffset, logInnerWidth - 2);
              return (
                <Text key={`json-${li}`} dimColor>
                  {s.map((p) => p.text).join("") || ""}
                </Text>
              );
            })}
          </Box>
        ) : null}
      </Box>
    );
  };

  const start = Math.max(0, entries.length - windowEntries - scrollOffset);
  const end = Math.max(0, entries.length - scrollOffset);
  const headerRight =
    entries.length === 0
      ? ""
      : ` ${Math.max(0, entries.length - windowEntries - scrollOffset)}–${Math.max(
          0,
          entries.length - 1 - scrollOffset,
        )} / ${entries.length - 1}  | H+${hScrollOffset} (←/→)`;

  return (
    <Box flexDirection="column" padding={1}>
      {}
      <Box>
        {}
        <Box flexGrow={1} flexBasis={0} flexDirection="column" marginRight={2}>
          <Text>DB Stats</Text>
          <Box borderStyle="round" borderColor="gray" paddingX={1}>
            <Box flexDirection="column">
              <Box flexDirection="row">
                <Text color="green">Pets:</Text>
                <Text> {totalHasPet}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="red">Bites:</Text>
                <Text> {totalHasBitten}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="blue">Users </Text>
                <Text color="gray">(</Text>
                <Text color="green">P </Text>
                <Text color="gray">/ </Text>
                <Text color="red">B </Text>
                <Text color="gray">/ </Text>
                <Text color="blue">T</Text>
                <Text color="gray">):</Text>
                <Text>
                  {" "}
                  {totalPetUsers} / {totalBiteUsers} / {totalUsers}
                </Text>
              </Box>
              <Box flexDirection="row">
                <Text color="yellow">Registered Servers:</Text>
                <Text> {totalGuilds}</Text>
              </Box>
              <Box flexDirection="row">
                <Text color="cyan">Places:</Text>
                <Text> {totalLocations}</Text>
              </Box>
            </Box>
          </Box>
        </Box>

        {}
        <Box flexGrow={1} flexBasis={0} flexDirection="column">
          <Text>Top Commands</Text>
          <Box borderStyle="round" borderColor="gray" paddingX={1}>
            <Box flexDirection="column">
              {top.length === 0 ? (
                <Text dimColor>No commands yet</Text>
              ) : (
                top.map(([name, count]) => (
                  <Text
                    key={name}
                  >{`${name.padEnd(24, " ")} ${String(count).padStart(6, " ")}`}</Text>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Box justifyContent="space-between">
          <Text>Logs</Text>
          <Text dimColor>{headerRight}</Text>
        </Box>
        <Box
          borderStyle="round"
          borderColor="gray"
          flexDirection="column"
          paddingX={1}
        >
          {entries.slice(start, end).map((e, i) => renderEntry(e, i))}
        </Box>
      </Box>

      {}
    </Box>
  );
};

render(<Dashboard />);
