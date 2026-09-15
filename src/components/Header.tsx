import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Wand2, FileCode, Edit3, History, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSwitchTab: (tabId: string) => void;
  savedHistoryCount: number;
}

export default function Header({ currentTab, onSwitchTab, savedHistoryCount }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'prompt-builder', label: 'প্রম্পট বিল্ডার', icon: Wand2 },
    { id: 'json-parser', label: 'জেসন লোডার', icon: FileCode },
    { id: 'exam-portal', label: 'পরীক্ষা (Exam)', icon: Edit3 },
    { id: 'history', label: `হিস্ট্রি (${savedHistoryCount})`, icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Minimal Brand Logo */}
        <div 
          onClick={() => onSwitchTab('prompt-builder')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center shadow-xs">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-tiro font-bold text-lg text-teal-950 leading-tight">
              QuizCraft <span className="text-amber-600 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">PWA</span>
            </h1>
          </div>
        </div>

        {/* Desktop Nav Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSwitchTab(item.id)}
                className={`relative px-3.5 py-1.5 rounded-lg font-bold text-xs transition duration-200 flex items-center gap-1.5 cursor-pointer z-10 ${
                  isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-teal-700 rounded-lg shadow-xs"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-2.5 space-y-1 shadow-md">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { onSwitchTab(item.id); setMobileOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  currentTab === item.id ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
