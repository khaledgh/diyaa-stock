import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Building2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface CompanySettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_tax_id: string;
  company_logo_url?: string;
  invoice_footer?: string;
  currency: string;
  tax_rate: number;
}

export default function Settings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_tax_id: '',
    company_logo_url: '',
    invoice_footer: '',
    currency: 'USD',
    tax_rate: 0,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('company_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('company_settings', JSON.stringify(settings));
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof CompanySettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t('settings.title') || 'Settings'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.subtitle') || 'Manage your company information and preferences'}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Company Information</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Company Name <span className="text-red-500">*</span></Label>
              <Input
                value={settings.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <Label>Tax ID / Registration Number</Label>
              <Input
                value={settings.company_tax_id}
                onChange={(e) => handleChange('company_tax_id', e.target.value)}
                placeholder="123456789"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea
                value={settings.company_address}
                onChange={(e) => handleChange('company_address', e.target.value)}
                placeholder="Street address, City, State, ZIP"
                rows={3}
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={settings.company_phone}
                onChange={(e) => handleChange('company_phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={settings.company_email}
                onChange={(e) => handleChange('company_email', e.target.value)}
                placeholder="info@company.com"
              />
            </div>

            <div>
              <Label>Currency</Label>
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full border rounded-md p-2"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="LBP">LBP - Lebanese Pound</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="SAR">SAR - Saudi Riyal</option>
              </select>
            </div>

            <div>
              <Label>Default Tax Rate (%)</Label>
              <Input
                type="number"
                value={settings.tax_rate}
                onChange={(e) => handleChange('tax_rate', Number(e.target.value))}
                placeholder="0"
                min="0"
                max="100"
                step="0.01"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Logo URL (Optional)</Label>
              <Input
                value={settings.company_logo_url}
                onChange={(e) => handleChange('company_logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a URL to your company logo for invoices
              </p>
            </div>

            <div className="md:col-span-2">
              <Label>Invoice Footer</Label>
              <Textarea
                value={settings.invoice_footer}
                onChange={(e) => handleChange('invoice_footer', e.target.value)}
                placeholder="Thank you for your business!"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This text will appear at the bottom of all invoices
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <Button onClick={handleSave} disabled={isSaving} size="lg">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold">Invoice Preview</h2>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
            <div className="text-center mb-6">
              {settings.company_logo_url && (
                <img
                  src={settings.company_logo_url}
                  alt="Company Logo"
                  className="h-16 mx-auto mb-4"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <h1 className="text-2xl font-bold">{settings.company_name || 'Company Name'}</h1>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {settings.company_address || 'Company Address'}
              </p>
              <p className="text-sm text-muted-foreground">
                {settings.company_phone && `Tel: ${settings.company_phone}`}
                {settings.company_phone && settings.company_email && ' | '}
                {settings.company_email && `Email: ${settings.company_email}`}
              </p>
              {settings.company_tax_id && (
                <p className="text-sm text-muted-foreground">
                  Tax ID: {settings.company_tax_id}
                </p>
              )}
            </div>

            <div className="border-t border-b py-4 my-4">
              <h2 className="text-xl font-bold mb-2">INVOICE</h2>
              <p className="text-sm text-muted-foreground">Sample invoice content...</p>
            </div>

            {settings.invoice_footer && (
              <div className="text-center text-sm text-muted-foreground mt-6 pt-4 border-t">
                {settings.invoice_footer}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
