import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Images, Map, Plus, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

// DA Logo component with fallback
const DALogo = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#1E5631" stroke="#E4C068" strokeWidth="4"/>
    <path d="M30 65 L50 30 L70 65 L60 65 L50 45 L40 65 Z" fill="#E4C068"/>
    <path d="M35 70 L50 50 L65 70" stroke="#E4C068" strokeWidth="3" fill="none"/>
    <circle cx="50" cy="38" r="6" fill="#E4C068"/>
  </svg>
);

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
            <DALogo className="w-12 h-12" />
            <div>
              <h1 className="font-bold text-[#1E5631] text-sm leading-tight">Department of</h1>
              <h1 className="font-bold text-[#1E5631] text-sm leading-tight">Agriculture</h1>
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
                        ? "bg-[#1E5631] text-white shadow-md"
                        : "text-gray-600 hover:bg-[#1E5631]/5 hover:text-[#1E5631]"
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
            className="w-full bg-[#D2691E] hover:bg-[#B8591A] text-white rounded-xl py-3 font-medium shadow-md"
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
            <DALogo className="w-10 h-10" />
            <div>
              <h1 className="font-bold text-[#1E5631] text-sm">DA Region 5</h1>
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
                        ? "bg-[#1E5631] text-white"
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
