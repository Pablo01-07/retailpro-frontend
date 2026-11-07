import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { RoleCode } from '@/types';
import {
  LayoutDashboard,
  Database,
  Cpu,
  TrendingUp,
  Package,
  Bell,
  FileText,
  Users,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  name: string;
  to: string;
  icon: React.ReactNode;
  roles?: RoleCode[];
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const navItems: NavItem[] = [
    {
      name: 'Usuarios',
      to: '/usuarios',
      icon: <Users size={20} />,
      roles: ['administrador'],
    },
    {
      name: 'Datos y calidad',
      to: '/datos',
      icon: <Database size={20} />,
      roles: ['administrador', 'analista'],
    },
    {
      name: 'Procesamiento',
      to: '/procesos',
      icon: <Cpu size={20} />,
      roles: ['administrador', 'analista'],
    },
    {
      name: 'Predicción',
      to: '/prediccion',
      icon: <TrendingUp size={20} />,
      roles: ['administrador', 'analista', 'jefe_logistica'],
    },
    {
      name: 'Inventarios',
      to: '/inventarios',
      icon: <Package size={20} />,
      roles: ['administrador', 'analista', 'jefe_logistica'],
    },
    {
      name: 'Alertas',
      to: '/alertas',
      icon: <Bell size={20} />,
      roles: ['administrador', 'analista', 'jefe_logistica'],
    },
    {
      name: 'Reportes',
      to: '/reportes',
      icon: <FileText size={20} />,
      roles: ['administrador', 'analista', 'jefe_logistica'],
    },
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: <LayoutDashboard size={20} />,
      roles: ['administrador', 'analista', 'jefe_logistica'],
    },
    {
      name: 'Auditoría',
      to: '/auditoria',
      icon: <ShieldCheck size={20} />,
      roles: ['administrador'],
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles || !user) return true;
    return item.roles.includes(user.rol);
  });

  return (
    <aside className="w-64 bg-brand-900 text-white flex flex-col shrink-0 min-h-screen">
      <div className="h-20 flex items-center px-6 gap-3 border-b border-brand-800/40">
        <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center shadow-sm">
          <svg
            className="w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">RetailPro</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-emerald-100/80 hover:bg-brand-800 hover:text-white'
              )
            }
          >
            <span className="shrink-0">{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-brand-800/40">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3.5 py-3 rounded-lg text-sm font-medium text-emerald-100/80 hover:bg-brand-800 hover:text-white transition-colors text-left"
        >
          <LogOut size={20} className="shrink-0 rotate-180" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};
