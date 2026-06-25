import { useState, useEffect } from 'react';
import { Printer, Search } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '../lib/formatters';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

function InvoicePrintBlock({ invoice, settings }) {
  return (
    <div className="print-half bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Blue top accent bar */}
      <div className="h-2 bg-blue-600"></div>

      {/* Company Header */}
      <div className="px-6 pt-4 pb-3 flex justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
            {settings?.companyName || 'Siddhi Vinayak Enterprise'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Proprietor: {settings?.proprietor || 'Ananda Jana'}
          </p>
        </div>
        <div className="text-xs text-gray-600 text-right space-y-0.5">
          <p>{settings?.address || 'Burasanti, Singur, Hooghly - 712409'}</p>
          <p>MO: {settings?.phone || '9830695943 / 8282079896'}</p>
          <p>Email: {settings?.email || 'siddhivinayakenterprise@gmail.com'}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100"></div>

      {/* Invoice To + Payment + Invoice Number */}
      <div className="px-6 py-3 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 mb-1">Invoice to:</p>
          <p className="text-xs font-medium text-gray-900">{invoice.customerName}</p>
          {invoice.customerPhone && <p className="text-xs text-gray-600">📞 {invoice.customerPhone}</p>}
          {invoice.customerAddress && <p className="text-xs text-gray-600">{invoice.customerAddress}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-600 mb-1">Payment Details:</p>
          <div className="space-y-0.5 text-xs">
            <p><span className="text-gray-500">Grand Total:</span> <span className="font-medium text-gray-900">{formatCurrency(invoice.grandTotal)}</span></p>
            {invoice.pay > 0 && (
              <p><span className="text-gray-500">Paid:</span> <span className="font-medium text-emerald-600">{formatCurrency(invoice.pay)}</span></p>
            )}
            {invoice.grandTotal - invoice.pay > 0 && invoice.status !== 'Carry-Forward' && (
              <p><span className="text-gray-500">Due:</span> <span className="font-medium text-red-500">{formatCurrency(invoice.grandTotal - invoice.pay)}</span></p>
            )}
            <p><span className="text-gray-500">Status:</span> <Badge className={`ml-1 ${getStatusColor(invoice.status)}`}>{invoice.status}</Badge></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-blue-600 uppercase tracking-wide mb-1">Invoice</p>
          <div className="space-y-0.5 text-xs">
            <p><span className="text-gray-500">Invoice No</span><br /><span className="text-gray-900 font-semibold">{invoice.invoiceNo}</span></p>
            <p><span className="text-gray-500">Date Issued</span><br /><span className="text-gray-900">{formatDate(invoice.date)}</span></p>
            {invoice.transport && <p><span className="text-gray-500">Transport</span><br /><span className="text-gray-900">{invoice.transport}</span></p>}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="px-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="text-left px-2 py-1.5 font-medium rounded-tl-lg">ITEM</th>
              <th className="text-center px-2 py-1.5 font-medium">UNIT</th>
              <th className="text-right px-2 py-1.5 font-medium">RATE</th>
              <th className="text-center px-2 py-1.5 font-medium">WT</th>
              <th className="text-center px-2 py-1.5 font-medium">QTY</th>
              <th className="text-right px-2 py-1.5 font-medium rounded-tr-lg">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-2 py-1.5 font-medium text-gray-900">{item.description}</td>
                <td className="px-2 py-1.5 text-center text-gray-700">{item.qom}</td>
                <td className="px-2 py-1.5 text-right text-gray-700">{formatCurrency(item.rate)}</td>
                <td className="px-2 py-1.5 text-center text-gray-700">{item.weight}</td>
                <td className="px-2 py-1.5 text-center text-gray-700">{item.qty}</td>
                <td className="px-2 py-1.5 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer — Amount in words + Totals */}
      <div className="px-6 py-3 grid grid-cols-2 gap-4">
        <div>
          {invoice.amountInWords && (
            <div>
              <p className="text-[9px] font-semibold text-gray-500 uppercase mb-0.5">Amount in Words</p>
              <p className="text-xs text-gray-700 italic">{invoice.amountInWords}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <div className="w-full max-w-[180px] space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(invoice.chargeableValue)}</span>
            </div>
            {invoice.previousDue > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Previous Due</span>
                <span className="text-gray-900">{formatCurrency(invoice.previousDue)}</span>
              </div>
            )}
            {invoice.roundOff !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Round Off</span>
                <span className="text-gray-900">-{formatCurrency(invoice.roundOff)}</span>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Discount</span>
                <span className="text-emerald-600">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between">
              <span className="text-sm font-bold text-gray-900">Total</span>
              <span className="text-sm font-bold text-blue-600">{formatCurrency(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Print() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [settings, setSettings] = useState(null);
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/invoices', { params: { limit: 200 } }),
      api.get('/settings'),
    ])
      .then(([invRes, setRes]) => {
        setInvoices(invRes.data.data);
        setSettings(setRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handlePrint = async () => {
    if (selected.length === 0) return;
    try {
      const details = await Promise.all(
        selected.map((id) => api.get(`/invoices/${id}`).then((r) => r.data.data))
      );
      setPrintData(details);
      setTimeout(() => window.print(), 200);
    } catch {
      toast.error('Failed to load invoice details');
    }
  };

  const filtered = invoices.filter((inv) =>
    inv.status !== 'Carry-Forward' &&
    (!statusFilter || inv.status === statusFilter) && (
      !search ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (loading) return <Spinner />;

  return (
    <>
      <div className="space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Print Invoices</h1>
            <p className="text-sm text-gray-500 mt-1">
              Select invoices to print
              {selected.length > 0 && <span className="ml-2 text-blue-600 font-medium">({selected.length} selected)</span>}
            </p>
          </div>
          {selected.length > 0 && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSelected([])}>Clear</Button>
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4" />
                Print ({selected.length})
              </Button>
            </div>
          )}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {['', 'Paid', 'Partial', 'Unpaid'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((inv) => (
            <div
              key={inv._id}
              onClick={() => toggle(inv._id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selected.includes(inv._id)
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-600">{inv.invoiceNo}</span>
                <Badge className={getStatusColor(inv.status)}>{inv.status}</Badge>
              </div>
              <p className="text-sm font-medium text-gray-900 mt-2">{inv.customerName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{formatDate(inv.date)}</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.grandTotal)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print-only section — same design as Invoice Detail page */}
      {printData && (
        <div className="hidden print:block print-page">
          {printData.map((inv, i) => (
            <div key={inv._id} className={i % 2 === 1 ? 'print-page-break' : ''}>
              <InvoicePrintBlock invoice={inv} settings={settings} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
