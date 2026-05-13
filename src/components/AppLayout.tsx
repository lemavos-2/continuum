import { ReactNode, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { searchApi } from "@/lib/api";
import {
  LayoutDashboard,
  StickyNote,
  Network,
  Search,
  LogOut,
  User as UserIcon,
  Menu,
  Loader2,
  GitGraph,
  Settings,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Timer,
  Activity,
  HardDrive,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "@/components/sidebar/MobileSidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SearchResult {
  id: string;
  type: "NOTE" | "ENTITY";
  title: string;
  snippet?: string;
}

const mainItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/entities", icon: Network, label: "Entities" },
  { to: "/vault", icon: HardDrive, label: "Vault" },
];

const trackingChildren = [
  { to: "/projects", icon: Timer, label: "Projects", color: "bg-zinc-400", filter: "PROJECT" },
  { to: "/activities", icon: Activity, label: "Accurrency", color: "bg-zinc-400", filter: "ACCURRENCY" },
];

function NavItem({
  to,
  icon: Icon,
  label,
  collapsed,
  end,
  onClick,
}: {
  to: string;
  icon: any;
  label: string;
  collapsed: boolean;
  end?: boolean;
  onClick?: () => void;
}) {
  const link = (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          "text-zinc-400 hover:text-white hover:bg-white/5",
          isActive && "bg-white/10 text-white",
          collapsed && "justify-center px-0",
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function TrackingGroup({
  collapsed,
  pathname,
  onItemClick,
}: {
  collapsed: boolean;
  pathname: string;
  onItemClick?: () => void;
}) {
  const isActiveBranch = trackingChildren.some((c) => pathname.startsWith(c.to));
  const [open, setOpen] = useState(isActiveBranch);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white",
                isActiveBranch && "bg-white/10 text-white",
              )}
            >
              <Clock className="h-[18px] w-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Tracking</TooltipContent>
        </Tooltip>
        {trackingChildren.map((c) => (
          <Tooltip key={c.to} delayDuration={100}>
            <TooltipTrigger asChild>
              <NavLink
                to={c.to}
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    isActive ? "bg-white/10" : "hover:bg-white/5",
                  )
                }
              >
                <span className={cn("h-2 w-2 rounded-full", c.color)} />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">{c.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white",
          (open || isActiveBranch) && "text-white",
          isActiveBranch && "bg-white/10",
        )}
        aria-expanded={open}
      >
        <Clock className="h-[18px] w-[18px]" />
        <span className="flex-1 text-left">Tracking</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-1 space-y-0.5 pl-3">
          {trackingChildren.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  "text-zinc-400 hover:text-white",
                  isActive && "text-white",
                )
              }
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", c.color)} />
              <span>{c.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {/* Show tracking dots only when the sidebar is collapsed, not when the group is simply closed */}
      {collapsed && (
        <div className="flex items-center gap-1 mt-1 pl-3">
          {trackingChildren.map((c) => (
            <Tooltip key={c.to} delayDuration={100}>
              <TooltipTrigger asChild>
                <NavLink
                  to={c.to}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    cn(
                      "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
                      isActive ? "bg-white/20" : "hover:bg-white/10",
                    )
                  }
                >
                  <span className={cn("h-2 w-2 rounded-full", c.color)} />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">{c.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarBody({
  collapsed,
  onItemClick,
  pathname,
  searchQuery,
  searching,
  searchResults,
  searchFocused,
  setSearchFocused,
  handleSearch,
  handleResultClick,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
  pathname: string;
  searchQuery: string;
  searching: boolean;
  searchResults: SearchResult[];
  searchFocused: boolean;
  setSearchFocused: (v: boolean) => void;
  handleSearch: (q: string) => void;
  handleResultClick: (r: SearchResult) => void;
}) {
  return (
    <div className="flex h-full flex-col px-3 pb-3">
      {!collapsed && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="h-9 rounded-lg border-white/10 bg-white/5 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-500" />
          )}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 space-y-1 rounded-xl border border-white/10 bg-[#0b0b0e] p-2 shadow-2xl">
              {searchResults.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleResultClick(r)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                >
                  {r.type === "NOTE" ? (
                    <StickyNote className="mt-0.5 h-4 w-4 text-zinc-300" />
                  ) : (
                    <Network className="mt-0.5 h-4 w-4 text-zinc-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.title}</p>
                    {r.snippet && (
                      <p className="truncate text-[11px] text-zinc-500">{r.snippet}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!collapsed && (
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          Menu
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-1">
        {mainItems.map((it) => (
          <NavItem
            key={it.to}
            to={it.to}
            icon={it.icon}
            label={it.label}
            end={it.end}
            collapsed={collapsed}
            onClick={onItemClick}
          />
        ))}
        <TrackingGroup
          collapsed={collapsed}
          pathname={pathname}
          onItemClick={onItemClick}
        />
        <NavItem
          to="/graph"
          icon={GitGraph}
          label="Graph"
          collapsed={collapsed}
          onClick={onItemClick}
        />
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await searchApi.search(q);
      setSearchResults(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleResultClick = (r: SearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(false);
    if (r.type === "NOTE") navigate(`/notes/${r.id}`);
    else navigate(`/entities/${r.id}`);
    setSidebarOpen(false);
  };

  const usernameInitial =
    (user?.username || user?.email || "U").trim().charAt(0).toUpperCase();
  const displayName = user?.username || user?.email?.split("@")[0] || "Guest";

  const sidebarHeader = (mobile: boolean) => (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-4",
        collapsed && !mobile && "justify-between px-2",
      )}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
        <img src="/favicon.ico" alt="" className="h-5 w-5 object-contain" />
      </div>
      {(!collapsed || mobile) && (
        <span className="truncate text-[15px] font-semibold tracking-tight text-white">
          Continuum
        </span>
      )}
      {!mobile && (
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );

  const profileFooter = (mobile: boolean) => {
    const showLabel = !collapsed || mobile;
    return (
      <div className={cn("border-t border-white/5 p-3", collapsed && !mobile && "px-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5",
                collapsed && !mobile && "justify-center px-0",
              )}
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-zinc-500 to-zinc-500 text-xs font-semibold text-white">
                {usernameInitial}
              </div>
              {showLabel && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{displayName}</p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {user?.plan || "FREE"}
                  </p>
                </div>
              )}
              {showLabel && <ChevronDown className="h-4 w-4 text-zinc-500" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56 border-white/10 bg-[#0b0b0e] text-zinc-200"
          >
            <DropdownMenuLabel className="text-xs text-zinc-500">
              {user?.email}
            </DropdownMenuLabel>
            {user?.createdAt && (
              <div className="px-2 py-1.5 text-xs text-zinc-500">
                Member since {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric"
                })}
              </div>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => {
                navigate("/profile");
                setSidebarOpen(false);
              }}
              className="cursor-pointer focus:bg-white/5"
            >
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-zinc-300 focus:bg-zinc-500/10 focus:text-zinc-200"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const desktopSidebar = (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-white/5 bg-[#0a0a0d] lg:flex overflow-hidden transition-all duration-200 ease-out",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {sidebarHeader(false)}
      <div className="flex-1 overflow-y-auto">
        <SidebarBody
          collapsed={collapsed}
          pathname={location.pathname}
          searchQuery={searchQuery}
          searching={searching}
          searchResults={searchResults}
          searchFocused={searchFocused}
          setSearchFocused={setSearchFocused}
          handleSearch={handleSearch}
          handleResultClick={handleResultClick}
        />
      </div>
      {profileFooter(false)}
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[#05060a] text-white">
      <CommandPalette />

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center gap-3 bg-[#05060a]/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-white hover:bg-white/10"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="" className="h-5 w-5" />
          <span className="text-sm font-semibold">Continuum</span>
        </div>
      </div>

      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="flex h-full flex-col bg-[#0a0a0d]">
          {sidebarHeader(true)}
          <div className="flex-1 overflow-y-auto">
            <SidebarBody
              collapsed={false}
              pathname={location.pathname}
              onItemClick={() => setSidebarOpen(false)}
              searchQuery={searchQuery}
              searching={searching}
              searchResults={searchResults}
              searchFocused={searchFocused}
              setSearchFocused={setSearchFocused}
              handleSearch={handleSearch}
              handleResultClick={handleResultClick}
            />
          </div>
          {profileFooter(true)}
        </div>
      </MobileSidebar>

      {desktopSidebar}

      <main className={cn("min-w-0 flex-1 overflow-auto bg-[#05060a]", collapsed ? "lg:ml-20" : "lg:ml-64")}>
        <div className="h-16 lg:hidden" />
        {children}
      </main>
    </div>
  );
}
