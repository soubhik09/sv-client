import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Mail, FileText } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../lib/formatters';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/customers/${id}`),
      api.get(`/customers/${id}/invoices`),
    ])
      .then(([custRes, invRes]) => {
        setCustomer(custRes.data.data);
        setInvoices(invRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (!customer) return <EmptyState title="Customer not found" />;

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Link>

      {/* Customer info */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                {customer.phone}
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {customer.email}
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {customer.address}
                </div>
              )}
              {customer.gstin && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">GSTIN:</span> {customer.gstin}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-4">
            {customer.currentDue > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Current Due</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(customer.currentDue)}</p>
              </div>
            )}
            {customer.creditBalance > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Credit Balance</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(customer.creditBalance)}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Invoices */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Invoices ({invoices.length})
        </h2>
        {invoices.length === 0 ? (
          <EmptyState icon={FileText} title="No invoices yet" description="Create an invoice for this customer" />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Invoice No</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Paid</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/invoices/${inv._id}`} className="text-blue-500 hover:underline font-medium">
                          {inv.invoiceNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.grandTotal)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(inv.pay)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatusColor(inv.status)}>{inv.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
