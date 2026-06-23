import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import api from '../lib/api';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => setSettings(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Settings saved');
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const handleResetCounter = async () => {
    try {
      await api.post('/settings/reset-counter');
      toast.success('Invoice counter reset to 1');
      setSettings({ ...settings, invoiceNextNumber: 1 });
      setShowReset(false);
    } catch {
      // handled
    }
  };

  if (loading) return <Spinner />;
  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your business settings</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Company Information</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Company Name"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            />
            <Input
              label="Proprietor"
              value={settings.proprietor}
              onChange={(e) => setSettings({ ...settings, proprietor: e.target.value })}
            />
            <Input
              label="Phone"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
            <Input
              label="Address"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </CardBody>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Invoice Settings</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Invoice Prefix"
              value={settings.invoicePrefix}
              onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
              placeholder="INV"
            />
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="yearlyReset"
                checked={settings.invoiceYearlyReset}
                onChange={(e) => setSettings({ ...settings, invoiceYearlyReset: e.target.checked })}
                className="w-4 h-4 text-blue-500 rounded border-gray-200 focus:ring-blue-200"
              />
              <label htmlFor="yearlyReset" className="text-sm text-gray-700">
                Reset invoice number yearly
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Next Invoice Number</p>
                <p className="text-xs text-gray-500">Currently: {settings.invoiceNextNumber}</p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowReset(true)}>
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to 1
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={handleResetCounter}
        title="Reset Invoice Counter"
        message="This will reset the invoice counter to 1. The next invoice will start from number 1. Are you sure?"
      />
    </div>
  );
}
