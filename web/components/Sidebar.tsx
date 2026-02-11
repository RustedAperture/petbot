import * as React from "react";
import {
  Sheet,
  Typography,
  List,
  ListItem,
  ListItemDecorator,
  Box,
  IconButton,
  Divider,
  Button,
  ListItemButton,
} from "@mui/joy";
import { useColorScheme } from "@mui/joy/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import PublicIcon from "@mui/icons-material/Public";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";

interface SidebarProps {
  selected?: string;
  onSelect?: (value: string) => void;
}

export default function Sidebar({
  selected = "global",
  onSelect,
}: SidebarProps) {
  const { mode, setMode } = useColorScheme();
  const [open, setOpen] = React.useState(false);
  const isMobile = useMediaQuery("(max-width:900px)");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("petbot-color-scheme");
      if (stored && stored !== mode) {
        setMode(stored as "light" | "dark");
      }
    } catch (err) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDark = mode === "dark";

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setMode(next);
    try {
      localStorage.setItem("petbot-color-scheme", next);
    } catch (err) {
      // ignore
    }
  };

  const handleSelect = (value: string) => {
    onSelect?.(value);
    if (isMobile) setOpen(false);
  };

  const sheetSx = isMobile
    ? {
        position: "fixed",
        left: 0,
        top: 0,
        width: 260,
        height: "100dvh",
        zIndex: 1300,
        p: 2,
        bgcolor: "background.surface",
      }
    : {
        width: 220,
        minHeight: "100dvh",
        position: "sticky",
        top: 0,
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        borderRight: "1px solid",
        borderColor: "divider",
      };

  return (
    <>
      {isMobile && !open && (
        <IconButton
          onClick={() => setOpen(true)}
          size="md"
          aria-label="Open menu"
          sx={{ position: "fixed", left: 12, top: 12, zIndex: 1400 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {(open || !isMobile) && (
        <>
          {isMobile && open && (
            <Box
              onClick={() => setOpen(false)}
              sx={{
                position: "fixed",
                inset: 0,
                bgcolor: "rgba(0,0,0,0.3)",
                zIndex: 1299,
              }}
            />
          )}

          <Sheet variant="outlined" sx={sheetSx}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography level="h4">PetBot</Typography>

              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <IconButton
                  variant="soft"
                  color="neutral"
                  size="sm"
                  onClick={toggleTheme}
                  aria-label={
                    isDark ? "Switch to light mode" : "Switch to dark mode"
                  }
                >
                  {isDark ? (
                    <LightModeIcon fontSize="small" />
                  ) : (
                    <DarkModeIcon fontSize="small" />
                  )}
                </IconButton>

                {isMobile && (
                  <IconButton
                    size="sm"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                  >
                    <CloseIcon />
                  </IconButton>
                )}
              </Box>
            </Box>

            <Divider />

            <List
              size="sm"
              sx={{
                gap: 1,
                "--List-nestedInsetStart": "30px",
                "--ListItem-radius": (theme) => theme.vars.radius.sm,
              }}
            >
              <ListItem>
                <ListItemButton
                  selected={selected === "global"}
                  onClick={() => handleSelect("global")}
                >
                  <ListItemDecorator>
                    <PublicIcon />
                  </ListItemDecorator>
                  <Typography level="title-sm">Global</Typography>
                </ListItemButton>
              </ListItem>

              <ListItem>
                <ListItemButton
                  selected={selected === "guild"}
                  onClick={() => handleSelect("guild")}
                >
                  <ListItemDecorator>
                    <GroupsIcon />
                  </ListItemDecorator>
                  <Typography level="title-sm">Guild</Typography>
                </ListItemButton>
              </ListItem>

              <ListItem>
                <ListItemButton
                  selected={selected === "user"}
                  onClick={() => handleSelect("user")}
                >
                  <ListItemDecorator>
                    <PersonIcon />
                  </ListItemDecorator>
                  <Typography level="title-sm">User</Typography>
                </ListItemButton>
              </ListItem>
            </List>

            <Box sx={{ flex: 1 }} />

            <Typography level="body-xs" sx={{ color: "text.secondary" }}>
              v1 — Stats viewer
            </Typography>
          </Sheet>
        </>
      )}
    </>
  );
}
