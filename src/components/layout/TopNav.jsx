import { NavLink, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  Lock,
  Menu,
  X,
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  UserCog,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function TopNav() {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      // Get unpaid/partial invoices
      const { data } = await api.get('/invoices', { params: { status: 'Unpaid', limit: 5 } });
      const unpaid = (data.data || []).map((inv) => ({
        id: inv._id,
        type: 'unpaid',
        title: `${inv.customerName}`,
        message: `Invoice ${inv.invoiceNo} — Due: ${formatCurrency(inv.grandTotal - inv.pay)}`,
        link: `/invoices/${inv._id}`,
      }));

      const partialRes = await api.get('/invoices', { params: { status: 'Partial', limit: 5 } });
      const partial = (partialRes.data.data || []).map((inv) => ({
        id: inv._id,
        type: 'partial',
        title: `${inv.customerName}`,
        message: `Invoice ${inv.invoiceNo} — Remaining: ${formatCurrency(inv.grandTotal - inv.pay)}`,
        link: `/invoices/${inv._id}`,
      }));

      setNotifications([...unpaid, ...partial]);
    } catch {
      // handled
    } finally {
      setNotifLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!showNotifications) fetchNotifications();
    setShowNotifications(!showNotifications);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm no-print">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">SV</span>
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:block">Siddhi Vinayak</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-blue-500 text-white shadow-sm shadow-blue-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {user?.role === 'Admin' && (
                <NavLink
                  to="/staff"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-blue-500 text-white shadow-sm shadow-blue-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  Staff
                </NavLink>
              )}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notification */}
            <div className="relative">
              <button
                onClick={handleBellClick}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-white"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      <span className="text-xs text-gray-500">{notifications.length} pending</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifLoading ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">Loading...</div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">All clear! No pending dues.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <Link
                            key={notif.id}
                            to={notif.link}
                            onClick={() => setShowNotifications(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                              ${notif.type === 'unpaid' ? 'bg-red-100' : 'bg-amber-100'}`}
                            >
                              <IndianRupee className={`w-4 h-4 ${notif.type === 'unpaid' ? 'text-red-500' : 'text-amber-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                            </div>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full
                              ${notif.type === 'unpaid' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}
                            >
                              {notif.type === 'unpaid' ? 'Unpaid' : 'Partial'}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <Link
                        to="/invoices"
                        onClick={() => setShowNotifications(false)}
                        className="block px-4 py-2.5 text-center text-xs font-medium text-blue-500 hover:bg-blue-50 border-t border-gray-100"
                      >
                        View All Invoices →
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-100 shadow-lg z-50 py-2">
                    <Link
                      to="/change-password"
                      onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Lock className="w-4 h-4" />
                      Change Password
                    </Link>
                    <button
                      onClick={() => { logout(); setShowProfile(false); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="lg:hidden pb-4 pt-2 border-t border-gray-100 mt-2 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
            {user?.role === 'Admin' && (
              <NavLink
                to="/staff"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                  }`
                }
              >
                <UserCog className="w-4 h-4" />
                Staff
              </NavLink>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
