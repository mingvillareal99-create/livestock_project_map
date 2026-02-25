import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Images, Map, Plus, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

const DA_LOGO_URL = "https://customer-assets.emergentagent.com/job_agri-field-monitor/artifacts/vu4210i0_623418795_1209727854596963_4680827266976407479_n.jpg";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/gallery", icon: Images, label: "Gallery" },
  { path: "/map", icon: Map, label: "Map View" },
];

export default function Layout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAF8]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-100 flex-col z-40">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img 
              src={DA_LOGO_URL} 
              alt="DA Bicol Region Logo" 
              className="w-12 h-12 object-contain rounded-lg"
            />
            <div>
              <h1 className="font-bold text-[#357A37] text-sm leading-tight">Department of</h1>
              <h1 className="font-bold text-[#357A37] text-sm leading-tight">Agriculture</h1>
              <p className="text-xs text-gray-500">Region 5</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-[#357A37] text-white shadow-md"
                        : "text-gray-600 hover:bg-[#357A37]/5 hover:text-[#357A37]"
                    }`
                  }
                  end={item.path === "/"}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Add Project Button */}
        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={() => navigate("/project/new")}
            className="w-full bg-[#EF8E1E] hover:bg-[#B8591A] text-white rounded-xl py-3 font-medium shadow-md"
            data-testid="add-project-sidebar-btn"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Project
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 header-glass">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={DA_LOGO_URL} 
              alt="DA Bicol Region Logo" 
              className="w-10 h-10 object-contain rounded-lg"
            />
            <div>
              <h1 className="font-bold text-[#357A37] text-sm">DA Region 5</h1>
              <p className="text-xs text-gray-500">Project Monitor</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg animate-fade-in">
            <nav className="p-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl mb-2 ${
                      isActive
                        ? "bg-[#357A37] text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                  end={item.path === "/"}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden mobile-nav">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              end={item.path === "/"}
            >
              <div className={`nav-icon p-2`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* FAB Button - Mobile */}
      <button
        onClick={() => navigate("/project/new")}
        className="md:hidden fab-button"
        data-testid="add-project-fab-btn"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <main className="md:ml-60 min-h-screen pt-16 pb-20 md:pt-0 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
