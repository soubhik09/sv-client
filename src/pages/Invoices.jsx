import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, FileText } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../lib/formatters';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const [showFilters, setShowFilters] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      params.page = filters.page;
      params.limit = 20;

      const { data } = await api.get('/invoices', { params });
      setInvoices(data.data);
      setPagination(data.pagination);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(fetchInvoices, 300);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination.total} total invoices</p>
        </div>
        <Link to="/invoices/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoice number or customer..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium
            transition-colors ${showFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        >
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {showFilters && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-3">
            {['', 'Paid', 'Partial', 'Unpaid', 'Carry-Forward'].map((status) => (
              <button
                key={status}
                onClick={() => setFilters({ ...filters, status, page: 1 })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${filters.status === status
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {status || 'All'}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Invoice list */}
      {loading ? (
        <Spinner />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={filters.search || filters.status ? 'Try different filters' : 'Create your first invoice'}
          action={!filters.search && !filters.status && (
            <Link to="/invoices/new"><Button>Create Invoice</Button></Link>
          )}
        />
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Invoice</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Paid</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/invoices/${inv._id}`} className="text-blue-500 hover:underline font-medium">
                          {inv.invoiceNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{inv.customerName}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(inv.grandTotal)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                        {inv.status === 'Carry-Forward' || inv.status === 'DueToNext' ? formatCurrency(0) : formatCurrency(inv.pay)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(inv.status === 'Carry-Forward' || inv.status === 'DueToNext') && inv.carriedForwardTo ? (
                          <Link to={`/invoices/${inv.carriedForwardTo._id || inv.carriedForwardTo}`}>
                            <Badge className={`${getStatusColor(inv.status)} cursor-pointer hover:opacity-80`}>
                              {inv.status} → {inv.carriedForwardTo.invoiceNo || 'View'}
                            </Badge>
                          </Link>
                        ) : (
                          <Badge className={getStatusColor(inv.status)}>{inv.status}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
