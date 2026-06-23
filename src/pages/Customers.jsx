import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Phone, MapPin, Edit2, Trash2, Eye, FileDown } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/formatters';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CustomerModal from '../components/customers/CustomerModal';
import toast from 'react-hot-toast';

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await api.get('/customers', { params: { search } });
      setCustomers(data.data);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/customers/${deleteTarget._id}`);
      toast.success('Customer deleted');
      setDeleteTarget(null);
      fetchCustomers();
    } catch {
      // handled
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = () => {
    setModalOpen(false);
    setEditingCustomer(null);
    fetchCustomers();
  };

  const handleExportCustomers = async () => {
    if (customers.length === 0) {
      toast.error('No customers to export');
      return;
    }
    try {
      const [settingsRes] = await Promise.all([api.get('/settings')]);
      const shop = settingsRes.data.data;

      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      workbook.creator = shop?.companyName || 'Siddhi Vinayak Enterprise';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Customers', {
        properties: { defaultColWidth: 15 },
      });

      // === SHOP HEADER ===
      sheet.mergeCells('A1:F1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = (shop?.companyName || 'SIDDHI VINAYAK ENTERPRISE').toUpperCase();
      titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF1E40AF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 30;

      sheet.mergeCells('A2:F2');
      const propCell = sheet.getCell('A2');
      propCell.value = `Proprietor: ${shop?.proprietor || 'Ananda Jana'}`;
      propCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF555555' } };
      propCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('A3:F3');
      const addrCell = sheet.getCell('A3');
      addrCell.value = `${shop?.address || 'Burasanti, Singur, Hooghly - 712409'} | Phone: ${shop?.phone || '9830695943 / 8282079896'}`;
      addrCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF777777' } };
      addrCell.alignment = { horizontal: 'center' };

      sheet.mergeCells('A4:F4');
      const dateCell = sheet.getCell('A4');
      dateCell.value = `Customer Report — Generated: ${new Date().toLocaleDateString('en-IN')}`;
      dateCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF888888' } };
      dateCell.alignment = { horizontal: 'center' };

      // Empty row
      sheet.addRow([]);

      // === TABLE HEADER ===
      const headerRow = sheet.addRow(['Sl No', 'Customer Name', 'Phone', 'Address', 'Current Due', 'Credit Balance']);
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
      let totalDue = 0;
      let totalCredit = 0;

      customers.forEach((cust, i) => {
        totalDue += cust.currentDue || 0;
        totalCredit += cust.creditBalance || 0;

        const dataRow = sheet.addRow([
          i + 1,
          cust.name,
          cust.phone,
          cust.address || '-',
          cust.currentDue || 0,
          cust.creditBalance || 0,
        ]);

        const bgColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        dataRow.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.alignment = { horizontal: colNumber >= 5 ? 'right' : 'left', vertical: 'middle' };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
        });

        // Due amount in red if > 0
        const dueCell = dataRow.getCell(5);
        dueCell.numFmt = '₹#,##0.00';
        if (cust.currentDue > 0) {
          dueCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
        }

        // Credit in green if > 0
        const creditCell = dataRow.getCell(6);
        creditCell.numFmt = '₹#,##0.00';
        if (cust.creditBalance > 0) {
          creditCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF059669' } };
        }
      });

      // === TOTAL ROW ===
      sheet.addRow([]);
      const totalRow = sheet.addRow(['', '', '', 'TOTAL', totalDue, totalCredit]);
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 11, bold: true };
        if (colNumber >= 5) {
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

      // Total Due in red
      totalRow.getCell(5).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFDC2626' } };
      // Total Credit in green
      totalRow.getCell(6).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF059669' } };

      // === COLUMN WIDTHS ===
      sheet.columns = [
        { width: 8 },   // Sl No
        { width: 25 },  // Name
        { width: 16 },  // Phone
        { width: 30 },  // Address
        { width: 15 },  // Current Due
        { width: 16 },  // Credit Balance
      ];

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Customers-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Customer report downloaded!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">{customers.length} total customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCustomers}>
            <FileDown className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => { setEditingCustomer(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={search ? 'Try a different search term' : 'Add your first customer to get started'}
          action={!search && <Button onClick={() => setModalOpen(true)}>Add Customer</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card key={customer._id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    {customer.phone}
                  </div>
                </div>
                {customer.currentDue > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    Due: {formatCurrency(customer.currentDue)}
                  </Badge>
                )}
              </div>

              {customer.address && (
                <div className="flex items-start gap-1.5 text-sm text-gray-500 mb-3">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{customer.address}</span>
                </div>
              )}

              {customer.creditBalance > 0 && (
                <div className="text-sm text-emerald-600 font-medium mb-3">
                  Credit: {formatCurrency(customer.creditBalance)}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Link
                  to={`/customers/${customer._id}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 
                    rounded-md hover:bg-gray-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </Link>
                <button
                  onClick={() => { setEditingCustomer(customer); setModalOpen(true); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 
                    rounded-md hover:bg-gray-100 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                {user?.role === 'Admin' && (
                  <button
                    onClick={() => setDeleteTarget(customer)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 
                      rounded-md hover:bg-red-50 transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <CustomerModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCustomer(null); }}
        customer={editingCustomer}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
