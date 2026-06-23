import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function CustomerModal({ isOpen, onClose, customer, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', gstin: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        gstin: customer.gstin || '',
        email: customer.email || '',
      });
    } else {
      setForm({ name: '', phone: '', address: '', gstin: '', email: '' });
    }
    setErrors({});
  }, [customer, isOpen]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (customer) {
        await api.put(`/customers/${customer._id}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', form);
        toast.success('Customer created');
      }
      onSave();
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={customer ? 'Edit Customer' : 'Add Customer'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Customer name"
          error={errors.name}
        />
        <Input
          label="Phone *"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="Phone number"
          error={errors.phone}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email address"
        />
        <Input
          label="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Full address"
        />
        <Input
          label="GSTIN"
          value={form.gstin}
          onChange={(e) => setForm({ ...form, gstin: e.target.value })}
          placeholder="GST number"
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>
            {customer ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
