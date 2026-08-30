import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AdminSidebar } from './AdminSidebar';
import { StudentSidebar } from './StudentSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const Layout: React.FC = () => {
  const { role } = useAuth();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Check if current route is admin or app
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStudentRoute = location.pathname.startsWith('/app');
  const isLanding = location.pathname === '/';

  if (isLanding) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  const showAdminSidebar = isAdminRoute || (role === 'ROLE_TEACHER' && !isStudentRoute);

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 flex flex-col antialiased">
      <Navbar
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          {showAdminSidebar ? <AdminSidebar /> : <StudentSidebar />}
        </div>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="relative z-10 w-72 h-full bg-slate-900 shadow-2xl"
              >
                {showAdminSidebar ? (
                  <AdminSidebar onItemClick={() => setIsMobileSidebarOpen(false)} />
                ) : (
                  <StudentSidebar onItemClick={() => setIsMobileSidebarOpen(false)} />
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
