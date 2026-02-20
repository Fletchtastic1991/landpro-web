import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Map, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

// MVP Demo Mode: Simplified navigation - only show map explorer
const navItems = [
  { name: "Analyze Land", path: "/dashboard/map", icon: Map },
];

export function DashboardLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <h1 className="text-xl font-bold text-primary">LandPro AI</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Back to Landing */}
          <div className="border-t border-border p-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate("/")}
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="pl-64">
        {/* Minimal Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">Land Analysis</h2>
          </div>
          <div className="text-sm text-muted-foreground">
            Demo Mode
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
