import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  TrendingUp,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  FileDown,
  Calendar,
  Eye,
} from 'lucide-react';
import Chart from 'react-apexcharts';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../lib/formatters';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('day');

  // Helper to compute date range based on groupBy
  const getDateRangeForGroup = (group) => {
    const today = new Date();
    let start = '';
    let end = '';

    if (group === 'day') {
      const dateStr = today.toISOString().split('T')[0];
      start = dateStr;
      end = dateStr;
    } else if (group === 'week') {
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = monday.toISOString().split('T')[0];
      end = sunday.toISOString().split('T')[0];
    } else if (group === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    } else if (group === 'year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    }

    return { start, end };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // For invoice list, use period-based date range if no manual dates are set
      const invoiceParams = { ...params };
      if (!startDate && !endDate) {
        const range = getDateRangeForGroup(groupBy);
        invoiceParams.startDate = range.start;
        invoiceParams.endDate = range.end;
      }

      const [summaryRes, trendsRes, exportRes] = await Promise.all([
        api.get('/reports/summary', { params }),
        api.get('/reports/trends', { params: { ...params, groupBy } }),
        api.get('/reports/export', { params: invoiceParams }),
      ]);

      setSummary(summaryRes.data.data);
      setTrends(trendsRes.data.data || []);
      setInvoices(exportRes.data.data || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupBy]);

  const handleFilter = () => {
    fetchData();
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (startDate) {
        params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      } else {
        const range = getDateRangeForGroup(groupBy);
        params.startDate = range.start;
        params.endDate = range.end;
      }

      const [exportRes, settingsRes] = await Promise.all([
        api.get('/reports/export', { params }),
        api.get('/settings'),
      ]);
      const rows = exportRes.data.data;
      const shop = settingsRes.data.data;

      if (!rows.length) {
        toast.error('No data to export');
        return;
      }

      // Dynamic import for code splitting
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      workbook.creator = shop?.companyName || 'Siddhi Vinayak Enterprise';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Invoice Report', {
        properties: { defaultColWidth: 15 },
      });

      // === SHOP HEADER ===
      sheet.mergeCells('A1:H1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = (shop?.companyName || 'SIDDHI VINAYAK ENTERPRISE').toUpperCase();
      titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF1E40AF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 30;

      sheet.mergeCells('A2:H2');
      const propCell = sheet.getCell('A2');
      propCell.value = `Proprietor: ${shop?.proprietor || 'Ananda Jana'}`;
      propCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF555555' } };
      propCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('A3:H3');
      const addrCell = sheet.getCell('A3');
      addrCell.value = shop?.address || 'Burasanti, Singur, Hooghly - 712409';
      addrCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF777777' } };
      addrCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('A4:H4');
      const contactCell = sheet.getCell('A4');
      contactCell.value = `Phone: ${shop?.phone || '9830695943 / 8282079896'} | Email: ${shop?.email || 'siddhivinayakenterprise@gmail.com'}`;
      contactCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF777777' } };
      contactCell.alignment = { horizontal: 'center' };

      // Date range info
      sheet.mergeCells('A5:H5');
      const dateCell = sheet.getCell('A5');
      const dateRange = startDate || endDate
        ? `Report Period: ${startDate || 'Start'} to ${endDate || 'Today'}`
        : `Report Generated: ${new Date().toLocaleDateString('en-IN')}`;
      dateCell.value = dateRange;
      dateCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF888888' } };
      dateCell.alignment = { horizontal: 'center' };

      // Empty row
      sheet.addRow([]);

      // === TABLE HEADER ===
      const headerRow = sheet.addRow(['Sl No', 'Invoice No', 'Date', 'Customer', 'Grand Total', 'PAY Received', 'Previous Due', 'Status']);
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF1E40AF' } },
          bottom: { style: 'thin', color: { argb: 'FF1E40AF' } },
        };
      });
      headerRow.height = 22;

      // === DATA ROWS ===
      let totalSales = 0;
      let totalPaid = 0;
      let totalDue = 0;

      rows.forEach((row, i) => {
        const payReceived = row['Status'] === 'DueToNext' || row['Status'] === 'Carry-Forward' ? 0 : (row['PAY Received'] || 0);
        totalSales += row['Grand Total'] || 0;
        totalPaid += payReceived;
        totalDue += row['Previous Due'] || 0;

        const dataRow = sheet.addRow([
          row['Sl No'],
          row['Invoice No'],
          row['Date'],
          row['Customer'],
          row['Grand Total'],
          payReceived,
          row['Previous Due'],
          row['Status'],
        ]);

        // Alternate row coloring
        const bgColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        dataRow.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.alignment = { horizontal: colNumber >= 5 ? 'right' : 'left', vertical: 'middle' };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });

        // Status cell color
        const statusCell = dataRow.getCell(8);
        statusCell.alignment = { horizontal: 'center' };
        if (row['Status'] === 'Paid') {
          statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF059669' } };
        } else if (row['Status'] === 'Partial') {
          statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } };
        } else if (row['Status'] === 'Unpaid') {
          statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
        }

        // Currency format
        [5, 6, 7].forEach((col) => {
          dataRow.getCell(col).numFmt = '₹#,##0.00';
        });
      });

      // === TOTAL ROW ===
      sheet.addRow([]);
      const totalRow = sheet.addRow(['', '', '', 'TOTAL', totalSales, totalPaid, totalDue, '']);
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 11, bold: true };
        if (colNumber >= 5 && colNumber <= 7) {
          cell.numFmt = '₹#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
        if (colNumber === 4) cell.alignment = { horizontal: 'right' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF2563EB' } },
          bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
        };
      });

      // === COLUMN WIDTHS ===
      sheet.columns = [
        { width: 8 },   // Sl No
        { width: 15 },  // Invoice No
        { width: 14 },  // Date
        { width: 22 },  // Customer
        { width: 15 },  // Grand Total
        { width: 15 },  // PAY Received
        { width: 15 },  // Previous Due
        { width: 12 },  // Status
      ];

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Invoice-Report-${groupBy}-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel report downloaded!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Business performance overview</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <FileDown className="w-4 h-4" />
          Export Excel
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div className="w-full sm:w-auto">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-auto">
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1 w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700">Period</label>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {['day', 'week', 'month', 'year'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all capitalize
                    ${groupBy === g
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : g === 'month' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleFilter}>
            <Calendar className="w-4 h-4" />
            Apply
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-sm text-gray-600">Total Sales</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalSales)}</p>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm text-gray-600">Collection</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary?.totalCollection)}</p>
        </div>

        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-sm text-gray-600">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary?.totalOutstanding)}</p>
        </div>

        <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-sm text-gray-600">Total Invoices</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalInvoices || 0}</p>
        </div>
      </div>

      {/* Main Chart - Full Width Line Graph */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {groupBy === 'day' ? 'Daily' : groupBy === 'week' ? 'Weekly' : groupBy === 'month' ? 'Monthly' : 'Yearly'} Revenue Trends
            </h3>
            <p className="text-sm text-gray-500">Hover over the graph to see details</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-400"></span>
              Sales
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              Collection
            </span>
          </div>
        </div>

        <div className="h-72">
          {trends.length > 0 ? (
            <Chart
              options={{
                chart: {
                  type: 'area',
                  toolbar: { show: false },
                  zoom: { enabled: false },
                  fontFamily: 'Inter, sans-serif',
                },
                dataLabels: { enabled: false },
                stroke: { curve: 'straight', width: [2.5, 2.5], dashArray: [0, 5] },
                fill: {
                  type: 'gradient',
                  gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 100] },
                },
                colors: ['#2dd4bf', '#3b82f6'],
                xaxis: {
                  categories: trends.map((t) => groupBy === 'year' ? t.date : t.date.slice(5)),
                  labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
                  axisBorder: { show: false },
                  axisTicks: { show: false },
                },
                yaxis: {
                  labels: {
                    style: { colors: '#94a3b8', fontSize: '11px' },
                    formatter: (val) => '₹' + val.toLocaleString('en-IN'),
                  },
                },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 0 },
                tooltip: {
                  theme: 'light',
                  y: { formatter: (val) => '₹' + val.toLocaleString('en-IN') },
                },
                legend: { show: false },
                markers: { size: 0 },
                responsive: [{
                  breakpoint: 640,
                  options: {
                    xaxis: { labels: { rotate: -45, style: { fontSize: '9px' } } },
                    yaxis: { labels: { style: { fontSize: '9px' } } },
                  },
                }],
              }}
              series={[
                { name: 'Sales', data: trends.map((t) => t.sales) },
                { name: 'Collection', data: trends.map((t) => t.collection) },
              ]}
              type="area"
              height="100%"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid - Donut + Summary Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Invoice Breakdown</h3>

          <div className="flex justify-center mb-6">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke="#34d399"
                  strokeWidth="4"
                  strokeDasharray={`${(summary?.paidInvoices || 0) / Math.max(summary?.totalInvoices || 1, 1) * 88} 88`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke="#fbbf24"
                  strokeWidth="4"
                  strokeDasharray={`${(summary?.partialInvoices || 0) / Math.max(summary?.totalInvoices || 1, 1) * 88} 88`}
                  strokeDashoffset={`-${(summary?.paidInvoices || 0) / Math.max(summary?.totalInvoices || 1, 1) * 88}`}
                  strokeLinecap="round"
                />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke="#f472b6"
                  strokeWidth="4"
                  strokeDasharray={`${(summary?.unpaidInvoices || 0) / Math.max(summary?.totalInvoices || 1, 1) * 88} 88`}
                  strokeDashoffset={`-${((summary?.paidInvoices || 0) + (summary?.partialInvoices || 0)) / Math.max(summary?.totalInvoices || 1, 1) * 88}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{summary?.totalInvoices || 0}</span>
                <span className="text-xs text-gray-500">Total</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="text-sm text-gray-600">Paid</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{summary?.paidInvoices || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="text-sm text-gray-600">Partial</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{summary?.partialInvoices || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                <span className="text-sm text-gray-600">Unpaid</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{summary?.unpaidInvoices || 0}</span>
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Breakdown</h3>

          {trends.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="pb-3 font-medium">Period</th>
                    <th className="pb-3 font-medium text-right">Sales</th>
                    <th className="pb-3 font-medium text-right">Collection</th>
                    <th className="pb-3 font-medium text-right">Difference</th>
                    <th className="pb-3 font-medium text-center">Invoices</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((t) => {
                    const diff = t.sales - t.collection;
                    return (
                      <tr key={t.date} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-900">{t.date}</td>
                        <td className="py-3 text-right text-gray-700">{formatCurrency(t.sales)}</td>
                        <td className="py-3 text-right text-emerald-600">{formatCurrency(t.collection)}</td>
                        <td className="py-3 text-right">
                          <span className={`flex items-center justify-end gap-1 ${diff > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {diff > 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {formatCurrency(Math.abs(diff))}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                            {t.count}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 bg-white">
                  <tr className="border-t-2 border-gray-200 font-semibold">
                    <td className="py-3 text-gray-900">Total</td>
                    <td className="py-3 text-right text-gray-900">
                      {formatCurrency(trends.reduce((s, t) => s + t.sales, 0))}
                    </td>
                    <td className="py-3 text-right text-emerald-600">
                      {formatCurrency(trends.reduce((s, t) => s + t.collection, 0))}
                    </td>
                    <td className="py-3 text-right text-amber-600">
                      {formatCurrency(trends.reduce((s, t) => s + (t.sales - t.collection), 0))}
                    </td>
                    <td className="py-3 text-center text-gray-900">
                      {trends.reduce((s, t) => s + t.count, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Invoice List for Selected Period */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {groupBy === 'day' ? "Today's" : groupBy === 'week' ? "This Week's" : groupBy === 'month' ? "This Month's" : "This Year's"} Invoices
            </h3>
            <p className="text-sm text-gray-500">{invoices.length} invoices found</p>
          </div>
        </div>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="pb-3 pl-4 sm:pl-0 pr-3 font-medium">#</th>
                  <th className="pb-3 pr-3 font-medium">Invoice</th>
                  <th className="pb-3 pr-3 font-medium hidden md:table-cell">Date</th>
                  <th className="pb-3 pr-3 font-medium">Customer</th>
                  <th className="pb-3 pr-3 font-medium text-right">Total</th>
                  <th className="pb-3 pr-3 font-medium text-right hidden sm:table-cell">Paid</th>
                  <th className="pb-3 pr-3 font-medium text-center">Status</th>
                  <th className="pb-3 pr-4 sm:pr-0 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv['Invoice No'] || i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 pl-4 sm:pl-0 pr-3 text-gray-500">{inv['Sl No'] || i + 1}</td>
                    <td className="py-3 pr-3 font-medium text-gray-900">{inv['Invoice No']}</td>
                    <td className="py-3 pr-3 text-gray-600 hidden md:table-cell">{inv['Date']}</td>
                    <td className="py-3 pr-3 text-gray-700 max-w-[120px] truncate">{inv['Customer']}</td>
                    <td className="py-3 pr-3 text-right font-medium text-gray-900">{formatCurrency(inv['Grand Total'])}</td>
                    <td className="py-3 pr-3 text-right text-emerald-600 hidden sm:table-cell">
                      {formatCurrency(inv['Status'] === 'DueToNext' || inv['Status'] === 'Carry-Forward' ? 0 : (inv['PAY Received'] || 0))}
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <Badge className={getStatusColor(inv['Status'])}>{inv['Status']}</Badge>
                    </td>
                    <td className="py-3 pr-4 sm:pr-0 text-center">
                      {inv['_id'] ? (
                        <Link
                          to={`/invoices/${inv['_id']}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td colSpan="2" className="py-3 pl-4 sm:pl-0 text-right text-gray-900 hidden md:table-cell"></td>
                  <td className="py-3 text-right text-gray-900 md:hidden" colSpan="2"></td>
                  <td className="py-3 text-right text-gray-900 hidden md:table-cell">Total</td>
                  <td className="py-3 text-right text-gray-900 md:hidden">Total</td>
                  <td className="py-3 pr-3 text-right text-gray-900">
                    {formatCurrency(invoices.reduce((s, inv) => s + (inv['Grand Total'] || 0), 0))}
                  </td>
                  <td className="py-3 pr-3 text-right text-emerald-600 hidden sm:table-cell">
                    {formatCurrency(invoices.reduce((s, inv) => s + (inv['Status'] === 'DueToNext' || inv['Status'] === 'Carry-Forward' ? 0 : (inv['PAY Received'] || 0)), 0))}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            No invoices for this period
          </div>
        )}
      </div>
    </div>
  );
}
