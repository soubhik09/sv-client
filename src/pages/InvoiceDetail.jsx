import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, IndianRupee, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '../lib/formatters';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/invoices/${id}`),
      api.get('/settings'),
    ])
      .then(([invRes, settingsRes]) => {
        setInvoice(invRes.data.data);
        setSettings(settingsRes.data.data);
      })
      .catch(() => navigate('/invoices'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted');
      navigate('/invoices');
    } catch {
      // handled
    } finally {
      setDeleting(false);
    }
  };

  const captureInvoice = async () => {
    const el = invoiceRef.current;
    if (!el) return null;
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
  };

  const handleDownloadJPG = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      const canvas = await captureInvoice();
      const link = document.createElement('a');
      const fileName = `${invoice.invoiceNo}_${invoice.customerName.replace(/\s+/g, '_')}`;
      link.download = `${fileName}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Invoice downloaded!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!invoiceRef.current) return;
    try {
      const canvas = await captureInvoice();
      const fileName = `${invoice.invoiceNo}_${invoice.customerName.replace(/\s+/g, '_')}`;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      const file = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${invoice.invoiceNo}` });
      } else {
        // Fallback: download the image directly
        const link = document.createElement('a');
        link.download = `${fileName}.jpg`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast.success('Invoice downloaded!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('Failed to share');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const due = invoice.grandTotal - invoice.pay;
    if (amount > due) {
      toast.error(`Amount cannot exceed due balance (${formatCurrency(due)})`);
      return;
    }

    setPaying(true);
    try {
      const newPay = invoice.pay + amount;
      await api.put(`/invoices/${id}`, {
        ...invoice,
        customer: invoice.customer?._id || invoice.customer,
        pay: newPay,
        paidBy: paidBy || '',
      });
      // Refresh invoice data
      const { data } = await api.get(`/invoices/${id}`);
      setInvoice(data.data);
      setShowPayment(false);
      setPayAmount('');
      setPaidBy('');
      toast.success('Payment recorded!');
    } catch {
      // handled
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Spinner />;
  if (!invoice) return null;

  const balanceDue = invoice.grandTotal - invoice.pay;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div className="no-print">
        <button onClick={() => navigate('/invoices')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
      </div>

      {/* Invoice Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Printable content */}
        <div ref={invoiceRef} data-invoice className="bg-white">
        {/* Blue top accent bar */}
        <div className="h-2 bg-blue-600"></div>

        {/* Company Header */}
        <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 uppercase tracking-wide">
              {settings?.companyName || 'Siddhi Vinayak Enterprise'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Proprietor: {settings?.proprietor || 'Ananda Jana'}
            </p>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 sm:text-right space-y-0.5">
            <p>{settings?.address || 'Burasanti, Singur, Hooghly - 712409'}</p>
            <p>MO: {settings?.phone || '9830695943 / 8282079896'}</p>
            <p>Email: {settings?.email || 'siddhivinayakenterprise@gmail.com'}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100"></div>

        {/* Invoice To + Invoice Details */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Invoice To */}
          <div>
            <p className="text-sm font-semibold text-blue-600 mb-2">Invoice to:</p>
            <p className="text-sm font-medium text-gray-900">{invoice.customerName}</p>
            {invoice.customerPhone && (
              <p className="text-sm text-gray-600 mt-0.5">📞 {invoice.customerPhone}</p>
            )}
            {invoice.customerAddress && (
              <p className="text-sm text-gray-600 mt-0.5">{invoice.customerAddress}</p>
            )}
          </div>

          {/* Payment Details */}
          <div>
            <p className="text-sm font-semibold text-blue-600 mb-2">Payment Details:</p>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">Grand Total:</span> <span className="font-medium text-gray-900">{formatCurrency(invoice.grandTotal)}</span></p>
              {invoice.status !== 'DueToNext' && invoice.status !== 'Carry-Forward' && (
                <p><span className="text-gray-500">Paid:</span> <span className="font-medium text-emerald-600">{formatCurrency(invoice.pay)}</span></p>
              )}
              {invoice.grandTotal - invoice.pay > 0 && invoice.status !== 'DueToNext' && invoice.status !== 'Carry-Forward' && (
                <p><span className="text-gray-500">Due:</span> <span className="font-medium text-red-500">{formatCurrency(invoice.grandTotal - invoice.pay)}</span></p>
              )}
              <p>
                <span className="text-gray-500">Status:</span>{' '}
                {(invoice.status === 'Carry-Forward' || invoice.status === 'DueToNext') && invoice.carriedForwardTo ? (
                  <Link to={`/invoices/${invoice.carriedForwardTo._id || invoice.carriedForwardTo}`} className="inline-flex items-center gap-1">
                    <Badge className={`ml-1 ${getStatusColor(invoice.status)} cursor-pointer hover:opacity-80`}>
                      {invoice.status} → {invoice.carriedForwardTo.invoiceNo || 'View'}
                    </Badge>
                  </Link>
                ) : (
                  <Badge className={`ml-1 ${getStatusColor(invoice.status)}`}>{invoice.status}</Badge>
                )}
              </p>
            </div>
          </div>

          {/* Invoice Number & Dates */}
          <div className="sm:text-right">
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 uppercase tracking-wide mb-3">Invoice</p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-500 font-medium">Invoice No</span><br />
                <span className="text-gray-900 font-semibold">{invoice.invoiceNo}</span>
              </p>
              <p className="mt-2">
                <span className="text-gray-500 font-medium">Date Issued</span><br />
                <span className="text-gray-900">{formatDateTime(invoice.createdAt)}</span>
              </p>
              {invoice.transport && (
                <p className="mt-2">
                  <span className="text-gray-500 font-medium">Transport</span><br />
                  <span className="text-gray-900">{invoice.transport}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-4 sm:px-8">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-medium rounded-tl-lg">ITEM</th>
                <th className="text-right px-1 sm:px-4 py-2 sm:py-3 font-medium">RATE</th>
                <th className="text-center px-1 sm:px-4 py-2 sm:py-3 font-medium">WT</th>
                <th className="text-center px-1 sm:px-4 py-2 sm:py-3 font-medium">QTY</th>
                <th className="text-right px-2 sm:px-4 py-2 sm:py-3 font-medium rounded-tr-lg">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-2 sm:px-4 py-3">
                    <p className="font-medium text-gray-900">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Unit: {item.qom}</p>
                  </td>
                  <td className="px-1 sm:px-4 py-3 text-right text-gray-700">{formatCurrency(item.rate)}</td>
                  <td className="px-1 sm:px-4 py-3 text-center text-gray-700">{item.weight}</td>
                  <td className="px-1 sm:px-4 py-3 text-center text-gray-700">{item.qty}</td>
                  <td className="px-2 sm:px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer — Notes + Totals */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Left side - Amount in words & Payment history */}
          <div className="space-y-4">
            {invoice.amountInWords && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Amount in Words</p>
                <p className="text-sm text-gray-700 italic">{invoice.amountInWords}</p>
              </div>
            )}

          </div>

          {/* Right side - Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(invoice.chargeableValue)}</span>
              </div>
              {invoice.previousDue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Previous Due</span>
                  <span className="text-gray-900">{formatCurrency(invoice.previousDue)}</span>
                </div>
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Round Off</span>
                  <span className="text-gray-900">-{formatCurrency(invoice.roundOff)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-emerald-600">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-blue-600">{formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        </div>{/* End of invoiceRef */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-center gap-2 sm:gap-3 no-print">
          {balanceDue > 0 && invoice.status !== 'DueToNext' && invoice.status !== 'Carry-Forward' && invoice.status !== 'Paid' && (
            <Button size="sm" onClick={() => setShowPayment(true)}>
              <IndianRupee className="w-4 h-4" />
              Re Pay
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleDownloadJPG} loading={downloading}>
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button variant="secondary" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          {user?.role === 'Admin' && (
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Payment History - Shop side only, not in print/download */}
      {invoice.paymentHistory?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 no-print">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">Date & Time</th>
                  <th className="pb-2 px-4 font-medium">Amount</th>
                  <th className="pb-2 pl-4 font-medium">Received By</th>
                </tr>
              </thead>
              <tbody>
                {invoice.paymentHistory.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 pr-4 text-gray-600">{formatDateTime(p.date)}</td>
                    <td className="py-3 px-4 font-medium text-emerald-600">{formatCurrency(p.amount)}</td>
                    <td className="py-3 pl-4 text-gray-500">{p.paidBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td className="py-3 pr-4 font-semibold text-gray-900">Total Paid</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{formatCurrency(invoice.pay)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="Re Pay" size="sm">
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Total</span>
              <span className="font-medium">{formatCurrency(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-600">Already Paid</span>
              <span className="font-medium text-emerald-600">{formatCurrency(invoice.pay)}</span>
            </div>
            <div className="flex justify-between mt-1 pt-1 border-t border-blue-200">
              <span className="font-medium text-gray-900">Balance Due</span>
              <span className="font-bold text-red-500">{formatCurrency(balanceDue)}</span>
            </div>
          </div>

          <Input
            label="Payment Amount (₹) *"
            type="number"
            step="any"
            min="1"
            max={balanceDue}
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder={`Max: ${balanceDue}`}
          />
          <Input
            label="Received By"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            placeholder="Name of person receiving payment"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button type="submit" loading={paying}>
              <IndianRupee className="w-4 h-4" />
              Re Pay
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${invoice.invoiceNo}? This will also update the customer's due balance.`}
        loading={deleting}
      />
    </div>
  );
}
