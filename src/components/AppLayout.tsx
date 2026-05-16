import { ReactNode, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  LayoutDashboard,
  StickyNote,
  Network,
  LogOut,
  User as UserIcon,
  Menu,
  GitGraph,
  Settings,
  Timer,
  Activity,
  HardDrive,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "@/components/sidebar/MobileSidebar";
import { SessionNavBar } from "@/components/ui/session-nav-bar";

const mobileItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/entities", icon: Network, label: "Entities" },
  { to: "/vault", icon: HardDrive, label: "Vault" },
  { to: "/projects", icon: Timer, label: "Projects" },
  { to: "/activities", icon: Activity, label: "Activities" },
  { to: "/graph", icon: GitGraph, label: "Graph" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isGraphPage = location.pathname.startsWith("/graph");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleLogoutRequest = () => {
    setConfirmLogoutOpen(true);
  };

  const initial = (user?.username || user?.email || "U").trim().charAt(0).toUpperCase();
  const display = user?.username || user?.email?.split("@")[0] || "Guest";

  return (
    <div className="flex min-h-screen bg-black text-white">
      <CommandPalette />

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-white/8 bg-black/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-md bg-white/5 text-white transition-colors hover:bg-white/10"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        {isGraphPage ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("graph-options-toggle"))}
            className="grid h-10 w-10 place-items-center rounded-md bg-white/5 text-white transition-colors hover:bg-white/10"
            aria-label="Open graph options"
          >
            <Settings className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}
      </div>

      {/* Mobile drawer */}
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="flex h-full flex-col bg-black/95 backdrop-blur-xl">
          <div className="flex h-[54px] items-center justify-between border-b border-white/8 px-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.ico" alt="Continuum" className="h-6 w-6 rounded object-contain" />
              <span className="text-sm font-semibold">Continuum</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {mobileItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white",
                    isActive && "bg-white/10 text-white",
                  )
                }
              >
                <it.icon className="h-4 w-4" />
                <span>{it.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-white/8 p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/5">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-white text-[11px] font-bold text-black">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{display}</p>
                    <p className="truncate text-[11px] text-zinc-500">{user?.plan || "FREE"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-zinc-500">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { navigate("/profile"); setSidebarOpen(false); }}>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { navigate("/subscription"); setSidebarOpen(false); }}>
                  <Settings className="mr-2 h-4 w-4" /> Subscription
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogoutRequest}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </MobileSidebar>
      <ConfirmDialog
        open={confirmLogoutOpen}
        onOpenChange={setConfirmLogoutOpen}
        title="Sign out?"
        description="You will be signed out of your account continue?"
        confirmText="Logout"
        destructive
        onConfirm={async () => {
          setConfirmLogoutOpen(false);
          await handleLogout();
        }}
      />

      {/* Desktop hover-expand sidebar */}
      <SessionNavBar />

      <main className="min-w-0 flex-1 overflow-auto bg-black lg:ml-[3.25rem]">
        <div className="h-14 lg:hidden" />
        {children}
      </main>
    </div>
  );
}
