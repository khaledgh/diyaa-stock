import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2, Save, FileText, ChevronRight, Settings as SettingsIcon,
  Receipt, Globe, Palette, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface CompanySettings {
  company_name: string;
  company_name_ar?: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_tax_id: string;
  company_logo_url?: string;
  invoice_footer?: string;
  currency: string;
  tax_rate: number;
  // Invoice settings
  invoice_prefix: string;
  invoice_next_number: number;
  payment_terms: string;
  show_logo_on_invoice: boolean;
  show_signature: boolean;
  // System settings
  language: string;
  date_format: string;
  timezone: string;
  low_stock_threshold: number;
}

const defaultSettings: CompanySettings = {
  company_name: '',
  company_name_ar: '',
  company_address: '',
  company_phone: '',
  company_email: '',
  company_tax_id: '',
  company_logo_url: '',
  invoice_footer: '',
  currency: 'USD',
  tax_rate: 0,
  invoice_prefix: 'INV-',
  invoice_next_number: 1,
  payment_terms: 'Due on receipt',
  show_logo_on_invoice: true,
  show_signature: false,
  language: 'en',
  date_format: 'DD/MM/YYYY',
  timezone: 'Asia/Beirut',
  low_stock_threshold: 10,
};

export default function Settings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('company_settings');
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
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

  const handleChange = (field: keyof CompanySettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-7 w-7" />
            {t('settings.title') || 'Settings'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.subtitle') || 'Manage your company information and preferences'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-lg">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-2 p-1 bg-muted/50">
          <TabsTrigger value="company" className="flex items-center gap-2 py-3">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Company</span>
          </TabsTrigger>
          <TabsTrigger value="invoice" className="flex items-center gap-2 py-3">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2 py-3">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 py-3">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
        </TabsList>

        {/* Company Information Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Company Information</h2>
              </div>
              <CardDescription>
                Basic information about your business that appears on invoices and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload Section */}
              <div className="flex items-start gap-6 p-4 bg-muted/30 rounded-lg">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-background">
                  {settings.company_logo_url ? (
                    <img
                      src={settings.company_logo_url}
                      alt="Company Logo"
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => { e.currentTarget.src = ''; }}
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Company Logo</Label>
                  <Input
                    value={settings.company_logo_url || ''}
                    onChange={(e) => handleChange('company_logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a URL to your company logo (recommended: 200x200px PNG)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Company Name (English) <span className="text-red-500">*</span></Label>
                  <Input
                    value={settings.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    placeholder="Your Company Name"
                    className="text-lg font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Company Name (Arabic)</Label>
                  <Input
                    value={settings.company_name_ar || ''}
                    onChange={(e) => handleChange('company_name_ar', e.target.value)}
                    placeholder="اسم الشركة بالعربية"
                    className="text-lg font-medium text-right"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tax ID / Registration Number</Label>
                  <Input
                    value={settings.company_tax_id}
                    onChange={(e) => handleChange('company_tax_id', e.target.value)}
                    placeholder="123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={settings.company_phone}
                    onChange={(e) => handleChange('company_phone', e.target.value)}
                    placeholder="+961 1 234 567"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={settings.company_email}
                    onChange={(e) => handleChange('company_email', e.target.value)}
                    placeholder="info@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full h-10 border rounded-md px-3 bg-background"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="LBP">LBP - Lebanese Pound</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={settings.company_address}
                    onChange={(e) => handleChange('company_address', e.target.value)}
                    placeholder="Street address, City, Country"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Settings Tab */}
        <TabsContent value="invoice" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold">Invoice Settings</h2>
              </div>
              <CardDescription>
                Configure default settings for invoices and statements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Invoice Number Prefix</Label>
                  <Input
                    value={settings.invoice_prefix}
                    onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                    placeholder="INV-"
                  />
                </div>

                <div className="space-y-2">
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

                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <select
                    value={settings.payment_terms}
                    onChange={(e) => handleChange('payment_terms', e.target.value)}
                    className="w-full h-10 border rounded-md px-3 bg-background"
                  >
                    <option value="Due on receipt">Due on Receipt</option>
                    <option value="Net 7">Net 7 (7 days)</option>
                    <option value="Net 15">Net 15 (15 days)</option>
                    <option value="Net 30">Net 30 (30 days)</option>
                    <option value="Net 60">Net 60 (60 days)</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Logo on Invoice</Label>
                      <p className="text-sm text-muted-foreground">Display company logo on PDF invoices</p>
                    </div>
                    <Switch
                      checked={settings.show_logo_on_invoice}
                      onCheckedChange={(checked) => handleChange('show_logo_on_invoice', checked)}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Invoice Footer</Label>
                  <Textarea
                    value={settings.invoice_footer || ''}
                    onChange={(e) => handleChange('invoice_footer', e.target.value)}
                    placeholder="Thank you for your business!"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This text will appear at the bottom of all invoices
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold">System Preferences</h2>
              </div>
              <CardDescription>
                Configure regional and system-wide settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full h-10 border rounded-md px-3 bg-background"
                  >
                    <option value="en">English</option>
                    <option value="ar">العربية (Arabic)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <select
                    value={settings.date_format}
                    onChange={(e) => handleChange('date_format', e.target.value)}
                    className="w-full h-10 border rounded-md px-3 bg-background"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    className="w-full h-10 border rounded-md px-3 bg-background"
                  >
                    <option value="Asia/Beirut">Beirut (GMT+2/+3)</option>
                    <option value="Asia/Dubai">Dubai (GMT+4)</option>
                    <option value="Europe/London">London (GMT+0/+1)</option>
                    <option value="America/New_York">New York (GMT-5/-4)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Low Stock Alert Threshold</Label>
                  <Input
                    type="number"
                    value={settings.low_stock_threshold}
                    onChange={(e) => handleChange('low_stock_threshold', Number(e.target.value))}
                    placeholder="10"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Show alert when product quantity falls below this number
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-orange-600" />
                  <h2 className="text-lg font-semibold">Invoice Templates</h2>
                </div>
                <Link to="/settings/templates">
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Manage Templates
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <CardDescription>
                Customize invoice layouts, add company branding, and choose which fields to display
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="w-full aspect-[3/4] bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 rounded-md mb-3 flex items-center justify-center border group-hover:border-blue-400">
                    <FileText className="h-12 w-12 text-blue-600" />
                  </div>
                  <p className="font-medium">Standard Invoice</p>
                  <p className="text-xs text-muted-foreground">A4 format • Default</p>
                </div>
                <div className="border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="w-full aspect-[3/4] bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-gray-900 rounded-md mb-3 flex items-center justify-center border group-hover:border-green-400">
                    <Receipt className="h-12 w-12 text-green-600" />
                  </div>
                  <p className="font-medium">POS Receipt</p>
                  <p className="text-xs text-muted-foreground">Thermal 80mm</p>
                </div>
                <Link to="/settings/templates" className="block">
                  <div className="border border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer h-full flex flex-col justify-center">
                    <div className="w-full aspect-[3/4] bg-muted/30 rounded-md mb-3 flex items-center justify-center border border-dashed">
                      <span className="text-4xl text-muted-foreground">+</span>
                    </div>
                    <p className="font-medium text-muted-foreground">Create New</p>
                    <p className="text-xs text-muted-foreground">Custom template</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Preview */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Invoice Preview</h2>
              <CardDescription>
                Preview how your invoices will look with current settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-8 bg-white dark:bg-gray-900 max-w-2xl mx-auto shadow-sm">
                <div className="text-center mb-6 pb-4 border-b">
                  {settings.company_logo_url && settings.show_logo_on_invoice && (
                    <img
                      src={settings.company_logo_url}
                      alt="Company Logo"
                      className="h-16 mx-auto mb-4"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <h1 className="text-2xl font-bold">{settings.company_name || 'Company Name'}</h1>
                  {settings.company_name_ar && (
                    <p className="text-lg text-muted-foreground" dir="rtl">{settings.company_name_ar}</p>
                  )}
                  <p className="text-sm text-muted-foreground whitespace-pre-line mt-2">
                    {settings.company_address || 'Company Address'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings.company_phone && `Tel: ${settings.company_phone}`}
                    {settings.company_phone && settings.company_email && ' | '}
                    {settings.company_email && `Email: ${settings.company_email}`}
                  </p>
                  {settings.company_tax_id && (
                    <p className="text-sm text-muted-foreground">Tax ID: {settings.company_tax_id}</p>
                  )}
                </div>

                <div className="py-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-blue-600">INVOICE</h2>
                      <p className="text-sm text-muted-foreground">{settings.invoice_prefix}001</p>
                    </div>
                    <div className="text-right text-sm">
                      <p><span className="text-muted-foreground">Date:</span> 21/12/2025</p>
                      <p><span className="text-muted-foreground">Terms:</span> {settings.payment_terms}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-b py-4 my-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Item</th>
                        <th className="text-right py-2">Qty</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2">Sample Product</td>
                        <td className="text-right py-2">2</td>
                        <td className="text-right py-2">{settings.currency} 50.00</td>
                        <td className="text-right py-2">{settings.currency} 100.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-48 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{settings.currency} 100.00</span>
                    </div>
                    {settings.tax_rate > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax ({settings.tax_rate}%):</span>
                        <span>{settings.currency} {(100 * settings.tax_rate / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{settings.currency} {(100 * (1 + settings.tax_rate / 100)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {settings.invoice_footer && (
                  <div className="text-center text-sm text-muted-foreground mt-8 pt-4 border-t">
                    {settings.invoice_footer}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
