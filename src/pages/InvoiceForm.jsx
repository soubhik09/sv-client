import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import api from '../lib/api';
import { formatDateInput } from '../lib/formatters';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import CustomerSearch from '../components/ui/CustomerSearch';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const emptyItem = { qty: 1, description: '', weight: 0, qom: 'gm', rate: 0, amount: 0 };

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [nextNumber, setNextNumber] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerHasAddress, setCustomerHasAddress] = useState(false);

  const [form, setForm] = useState({
    date: formatDateInput(new Date()),
    customer: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ ...emptyItem }],
    transport: '',
    previousDue: 0,
    roundOff: 0,
    pay: 0,
    paidBy: '',
  });
  const [paymentType, setPaymentType] = useState('full');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, numRes] = await Promise.all([
          api.get('/customers'),
          !isEdit ? api.get('/invoices/next-number') : Promise.resolve(null),
        ]);
        setCustomers(custRes.data.data);
        if (numRes) setNextNumber(numRes.data.data.nextInvoiceNo);

        if (isEdit) {
          const { data } = await api.get(`/invoices/${id}`);
          const inv = data.data;
          setForm({
            date: formatDateInput(inv.date),
            customer: inv.customer?._id || inv.customer || '',
            customerName: inv.customerName,
            customerPhone: inv.customerPhone || '',
            customerAddress: inv.customerAddress || '',
            items: inv.items.length > 0 ? inv.items : [{ ...emptyItem }],
            transport: inv.transport || '',
            previousDue: inv.previousDue || 0,
            roundOff: inv.roundOff || 0,
            pay: inv.pay || 0,
            paidBy: '',
          });
        }
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit]);

  const handleCustomerSelect = (customerId) => {
    const cust = customers.find((c) => c._id === customerId);
    if (cust) {
      setForm({
        ...form,
        customer: cust._id,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerAddress: cust.address || '',
        previousDue: cust.currentDue || 0,
      });
    } else {
      setForm({ ...form, customer: '', previousDue: 0 });
    }
  };

  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    if (field === 'weight' || field === 'rate') {
      items[index].amount = (Number(items[index].weight) || 0) * (Number(items[index].rate) || 0);
    }
    setForm({ ...form, items });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const chargeableValue = useMemo(() => {
    return form.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [form.items]);

  const grandTotal = useMemo(() => {
    return chargeableValue + (Number(form.previousDue) || 0) - (Number(form.roundOff) || 0);
  }, [chargeableValue, form.previousDue, form.roundOff]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isNewCustomer && !form.customer) {
      toast.error('Please select a customer');
      return;
    }
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (isNewCustomer && !form.customerPhone.trim()) {
      toast.error('Phone number is required for new customer');
      return;
    }
    if (form.items.some((item) => !item.description.trim())) {
      toast.error('All items need a description');
      return;
    }

    setSaving(true);
    try {
      let customerId = form.customer || undefined;

      // If new customer, create them first
      if (isNewCustomer && form.customerName.trim() && form.customerPhone.trim()) {
        try {
          const { data } = await api.post('/customers', {
            name: form.customerName.trim(),
            phone: form.customerPhone.trim(),
            address: form.customerAddress.trim(),
          });
          customerId = data.data._id;
        } catch (err) {
          // If customer already exists with that phone, find them
          if (err.response?.status === 400 && err.response?.data?.message?.includes('phone')) {
            const existing = customers.find((c) => c.phone === form.customerPhone.trim());
            if (existing) {
              customerId = existing._id;
            }
          } else {
            setSaving(false);
            return;
          }
        }
      }

      // If existing customer had no address but user typed one, update customer
      if (!isNewCustomer && form.customer && !customerHasAddress && form.customerAddress.trim()) {
        try {
          await api.put(`/customers/${form.customer}`, {
            name: form.customerName,
            phone: form.customerPhone,
            address: form.customerAddress.trim(),
          });
        } catch {
          // non-blocking, continue with invoice
        }
      }

      const payload = {
        ...form,
        customer: customerId,
        chargeableValue,
        grandTotal,
        items: form.items.map((item) => ({
          ...item,
          qty: Number(item.qty),
          weight: Number(item.weight) || 0,
          rate: Number(item.rate),
          amount: Number(item.amount),
        })),
        previousDue: Number(form.previousDue) || 0,
        roundOff: Number(form.roundOff) || 0,
        pay: paymentType === 'full' ? grandTotal : paymentType === 'partial' ? (Number(form.pay) || 0) : 0,
      };

      if (isEdit) {
        await api.put(`/invoices/${id}`, payload);
        toast.success('Invoice updated');
      } else {
        await api.post('/invoices', payload);
        toast.success('Invoice created');
      }
      navigate('/invoices');
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Invoice' : 'New Invoice'}
          </h1>
          {!isEdit && nextNumber && (
            <p className="text-sm text-gray-500">Next: {nextNumber}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Date */}
        <Card>
          <CardBody>
            {/* Customer type toggle */}
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="customerType"
                  checked={!isNewCustomer}
                  onChange={() => {
                    setIsNewCustomer(false);
                    setForm({ ...form, customer: '', customerName: '', customerPhone: '', customerAddress: '', previousDue: 0 });
                  }}
                  className="w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-200"
                />
                <span className="text-sm font-medium text-gray-700">Existing Customer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="customerType"
                  checked={isNewCustomer}
                  onChange={() => {
                    setIsNewCustomer(true);
                    setForm({ ...form, customer: '', customerName: '', customerPhone: '', customerAddress: '', previousDue: 0 });
                  }}
                  className="w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-200"
                />
                <span className="text-sm font-medium text-gray-700">New Customer</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isNewCustomer ? (
                /* Existing customer search */
                <CustomerSearch
                  value={form.customer}
                  selectedName={form.customerName ? `${form.customerName} (${form.customerPhone})` : ''}
                  onSelect={(customer) => {
                    if (customer) {
                      setCustomerHasAddress(!!customer.address?.trim());
                      setForm({
                        ...form,
                        customer: customer._id,
                        customerName: customer.name,
                        customerPhone: customer.phone,
                        customerAddress: customer.address || '',
                        previousDue: customer.currentDue || 0,
                      });
                    } else {
                      setCustomerHasAddress(false);
                      setForm({ ...form, customer: '', customerName: '', customerPhone: '', customerAddress: '', previousDue: 0 });
                    }
                  }}
                />
              ) : (
                /* New customer name */
                <Input
                  label="Customer Name *"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Enter new customer name"
                />
              )}
              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              {isNewCustomer && (
                <Input
                  label="Phone *"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="Phone number"
                />
              )}
              {!isNewCustomer && form.customer && (
                <Input
                  label="Customer Name"
                  value={form.customerName}
                  readOnly
                  className="bg-gray-50"
                />
              )}
              {!isNewCustomer && form.customer && (
                <Input
                  label="Phone"
                  value={form.customerPhone}
                  readOnly
                  className="bg-gray-50"
                />
              )}
              <div className="md:col-span-2">
                <Input
                  label="Address"
                  value={form.customerAddress}
                  onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                  placeholder="Address"
                  {...(!isNewCustomer && form.customer && customerHasAddress ? { readOnly: true, className: 'bg-gray-50' } : {})}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Items */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Invoice Items</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-xl">
                  <div className="col-span-6 sm:col-span-1">
                    <Input
                      label="Qty"
                      type="number"
                      min="0"
                      value={item.qty}
                      onChange={(e) => updateItem(index, 'qty', e.target.value)}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <Input
                      label="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-1">
                    <Input
                      label="Weight"
                      type="number"
                      min="0"
                      step="any"
                      value={item.weight}
                      onChange={(e) => updateItem(index, 'weight', e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-1">
                    <Input
                      label="Unit"
                      value={item.qom}
                      onChange={(e) => updateItem(index, 'qom', e.target.value)}
                      placeholder="gm"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Input
                      label="Rate (₹)"
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Input
                      label="Amount"
                      type="number"
                      value={item.amount}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-1 flex items-end justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={form.items.length <= 1}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Summary */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="Transport"
                  value={form.transport}
                  onChange={(e) => setForm({ ...form, transport: e.target.value })}
                  placeholder="Transport details"
                />

                {/* Payment Type Toggle */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Payment</label>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={paymentType === 'full'}
                        onChange={() => { setPaymentType('full'); setForm({ ...form, pay: 0 }); }}
                        className="w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-200"
                      />
                      <span className="text-sm text-gray-700">Full Payment</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={paymentType === 'partial'}
                        onChange={() => { setPaymentType('partial'); setForm({ ...form, pay: 0 }); }}
                        className="w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-200"
                      />
                      <span className="text-sm text-gray-700">Partial</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={paymentType === 'none'}
                        onChange={() => { setPaymentType('none'); setForm({ ...form, pay: 0 }); }}
                        className="w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-200"
                      />
                      <span className="text-sm text-gray-700">No Payment</span>
                    </label>
                  </div>
                </div>

                {paymentType === 'partial' && (
                  <Input
                    label="Payment Amount (₹)"
                    type="number"
                    min="0"
                    step="any"
                    value={form.pay}
                    onChange={(e) => setForm({ ...form, pay: e.target.value })}
                    placeholder="Enter partial amount"
                  />
                )}
              </div>

              <div className="bg-blue-50/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Chargeable Value</span>
                  <span className="font-medium">₹{chargeableValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Previous Due</span>
                  <input
                    type="number"
                    value={form.previousDue}
                    onChange={(e) => setForm({ ...form, previousDue: e.target.value })}
                    className="w-24 text-right px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Round Off</span>
                  <input
                    type="number"
                    value={form.roundOff}
                    onChange={(e) => setForm({ ...form, roundOff: e.target.value })}
                    className="w-24 text-right px-2 py-1 border border-gray-200 rounded text-sm"
                    step="any"
                    step="0.01"
                  />
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="text-base font-semibold text-gray-900">Grand Total</span>
                  <span className="text-xl font-bold text-gray-900">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4" />
            {isEdit ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
