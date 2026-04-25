import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileUser, ShieldAlert, FileText, Settings, LogOut, Shield } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Militares', path: '/militares' },
  { icon: FileUser, label: 'Ficha Individual', path: '/perfil' },
  { icon: ShieldAlert, label: 'Plantões Extras', path: '/extras' },
  { icon: FileText, label: 'Relatórios', path: '/relatorios' },
];

const footerItems = [
  { icon: Settings, label: 'Configurações', path: '/settings' },
  { icon: LogOut, label: 'Sair', path: '/logout' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <nav className="hidden md:flex fixed left-0 top-0 h-full flex-col bg-surface-container-low border-r border-outline-variant w-64 z-50">
      <div className="px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded flex items-center justify-center text-white shadow-sm">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-sm font-black text-blue-900 tracking-tight leading-none uppercase">Corpo de Bombeiros</h2>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Gestão de Escalas</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 label-caps",
                isActive 
                  ? "bg-white text-primary border-l-4 border-primary shadow-sm" 
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-secondary"
              )}
            >
              <item.icon size={18} className={cn(isActive && "fill-current")} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto px-4 pb-6 border-t border-outline-variant pt-4 space-y-1">
        {footerItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-4 py-3 rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-secondary label-caps transition-all"
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
