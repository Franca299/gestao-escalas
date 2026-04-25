import React from 'react';
import { Calendar, Bell, UserCircle, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export function TopBar() {
  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white border-b border-outline-variant z-40 px-6 flex items-center justify-between">
      <div className="md:hidden flex items-center gap-2">
        <h2 className="text-xl font-bold text-primary uppercase">Escala BM</h2>
      </div>
      
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
          <Calendar size={20} />
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white" />
        </button>
        <button className="flex items-center gap-2 p-2 pl-3 ml-2 text-on-surface-variant hover:bg-red-50 hover:text-red-600 rounded-full transition-all group" onClick={handleLogout} title="Sair do Sistema">
          <span className="hidden sm:inline text-xs font-bold label-caps">Sair</span>
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </header>
  );
}
