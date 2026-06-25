import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  TrendingUp,
  FileText,
  Users,
  ArrowUpRight,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Chart from 'react-apexcharts';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../lib/formatters';
import Spinner from '../components/ui/Spinner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState('day');

  // Calendar state
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [summaryRes, invoicesRes, customersRes, trendsRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/invoices', { params: { limit: 5, page: 1 } }),
          api.get('/customers', { params: { search: '' } }),
          api.get('/reports/trends', { params: { groupBy: chartPeriod } }),
        ]);
        setStats(summaryRes.data.data);
        setRecentInvoices(invoicesRes.data.data || []);
        setRecentCustomers((customersRes.data.data || []).slice(0, 5));
        setTrends(trendsRes.data.data || []);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [chartPeriod]);

  if (loading) return <Spinner />;

  // Calendar helpers
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);

  const prevMonth = () => setCalDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalDate(new Date(year, month + 1, 1));

  // X-axis labels based on period
  const getXCategories = () => {
    if (chartPeriod === 'day') {
      // date format from API: "2026-06-01" → show day number
      return trends.map((t) => t.date.slice(8));
    }
    if (chartPeriod === 'month') {
      // date format from API: "2026-01" → show month name
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return trends.map((t) => months[parseInt(t.date.slice(5)) - 1]);
    }
    // year: "2024", "2025", etc.
    return trends.map((t) => t.date);
  };

  // ApexCharts config - Bar Chart
  const chartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
    },
    colors: ['#3b82f6', '#10b981'],
    plotOptions: {
      bar: { borderRadius: 0, columnWidth: '50%', distributed: true },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      categories: getXCategories(),
      labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
      title: {
        text: chartPeriod === 'day' ? `Days of ${new Date().toLocaleString('default', { month: 'long' })}` : chartPeriod === 'month' ? 'Months' : 'Years',
        style: { color: '#64748b', fontSize: '12px' },
      },
    },
    yaxis: {
      title: { text: 'Total Sales (₹)', style: { color: '#64748b', fontSize: '12px' } },
      labels: {
        style: { colors: '#94a3b8', fontSize: '11px' },
        formatter: (val) => '₹' + val.toLocaleString('en-IN'),
      },
    },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
    tooltip: {
      theme: 'light',
      y: { formatter: (val) => '₹' + val.toLocaleString('en-IN') },
    },
  };

  const chartSeries = [
    { name: 'Total Sales', data: trends.map((t) => t.sales) },
  ];

  const statCards = [
    {
      label: 'Total Sales',
      value: formatCurrency(stats?.totalSales),
      icon: IndianRupee,
      change: '+12%',
      up: true,
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Total Collection',
      value: formatCurrency(stats?.totalCollection),
      icon: TrendingUp,
      change: '+8%',
      up: true,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Active Invoices',
      value: (stats?.paidInvoices || 0) + (stats?.unpaidInvoices || 0) + (stats?.partialInvoices || 0),
      icon: FileText,
      change: `${stats?.unpaidInvoices || 0} unpaid`,
      up: false,
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: Users,
      change: '+5%',
      up: true,
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} rounded-2xl p-5 border border-white/80`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className="text-sm text-gray-600">{card.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <span className={`text-xs font-medium ${card.up ? 'text-emerald-500' : 'text-gray-500'}`}>
                {card.up && <ArrowUpRight className="w-3 h-3 inline" />}
                {card.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid - Chart + Calendar + Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
              <p className="text-sm text-gray-500">
                {chartPeriod === 'day' ? 'Daily' : chartPeriod === 'month' ? 'Monthly' : 'Yearly'} sales overview
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {['day', 'month', 'year'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize
                      ${chartPeriod === p
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {p === 'day' ? 'Day' : p === 'month' ? 'Month' : 'Year'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ApexCharts Area Chart */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="min-w-[600px] h-96">
            {trends.length >= 1 ? (
              <Chart options={chartOptions} series={chartSeries} type="bar" height="100%" />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                No trend data available yet
              </div>
            )}
            </div>
          </div>

          {/* Summary below chart */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(stats?.totalSales)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Collection</p>
              <p className="text-base sm:text-lg font-bold text-emerald-600">{formatCurrency(stats?.totalCollection)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="text-base sm:text-lg font-bold text-amber-600">{formatCurrency(stats?.totalOutstanding)}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Calendar + Quick Stats */}
        <div className="space-y-6">
          {/* Calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{monthName}</h3>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100">
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d} className="py-1 text-gray-400 font-medium">{d}</span>
              ))}
              {calDays.map((day, i) => (
                <span
                  key={i}
                  className={`py-1.5 rounded-lg text-sm
                    ${!day ? '' : ''}
                    ${day && day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                      ? 'bg-blue-500 text-white font-semibold'
                      : day ? 'text-gray-700 hover:bg-gray-50' : ''
                    }`}
                >
                  {day || ''}
                </span>
              ))}
            </div>
          </div>

          {/* Invoice Status Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Invoice Status</h3>
            <div className="space-y-3">
              {(() => {
                const activeTotal = (stats?.paidInvoices || 0) + (stats?.unpaidInvoices || 0) + (stats?.partialInvoices || 0);
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Paid</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${activeTotal ? (stats.paidInvoices / activeTotal) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">{stats?.paidInvoices || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Partial</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${activeTotal ? (stats.partialInvoices / activeTotal) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">{stats?.partialInvoices || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Unpaid</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-pink-400 rounded-full"
                            style={{ width: `${activeTotal ? (stats.unpaidInvoices / activeTotal) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">{stats?.unpaidInvoices || 0}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid - Recent Invoices + Recent Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Invoices Table */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <Link to="/invoices" className="text-sm text-blue-500 hover:text-blue-600 font-medium">
              View All →
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No invoices yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="pb-3 font-medium">Invoice</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv._id} className="border-t border-gray-50">
                      <td className="py-3">
                        <Link to={`/invoices/${inv._id}`} className="text-blue-500 hover:underline font-medium">
                          {inv.invoiceNo}
                        </Link>
                        <p className="text-xs text-gray-400">{formatDate(inv.date)}</p>
                      </td>
                      <td className="py-3 text-gray-700">{inv.customerName}</td>
                      <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(inv.grandTotal)}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium
                          ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : ''}
                          ${inv.status === 'Partial' ? 'bg-amber-100 text-amber-600' : ''}
                          ${inv.status === 'Unpaid' ? 'bg-pink-100 text-pink-600' : ''}
                          ${inv.status === 'DueToNext' || inv.status === 'Carry-Forward' ? 'bg-blue-100 text-blue-600' : ''}
                        `}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Customers */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Recent Customers</h3>
            <Link to="/customers" className="text-sm text-blue-500 hover:text-blue-600 font-medium">
              View All →
            </Link>
          </div>

          {recentCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No customers yet</p>
          ) : (
            <div className="space-y-4">
              {recentCustomers.map((cust) => (
                <Link
                  key={cust._id}
                  to={`/customers/${cust._id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-blue-600">
                      {cust.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cust.name}</p>
                    <p className="text-xs text-gray-400">{cust.phone}</p>
                  </div>
                  {cust.currentDue > 0 && (
                    <span className="text-xs font-medium text-pink-500">
                      {formatCurrency(cust.currentDue)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating New Invoice Button (Mobile) */}
      <Link
        to="/invoices/new"
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-blue-500 text-white rounded-full 
          flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-600 transition-colors z-40"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
