import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  Eye,
  Copy,
  Building,
  Phone,
  Mail,
  MapPin,
  Globe,
  Hash,
  Image,
  Type,
  AlignLeft,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';

// Available fields for templates
const AVAILABLE_FIELDS = [
  { id: 'company_name', label: 'Company Name', icon: Building, category: 'Company' },
  { id: 'company_logo', label: 'Company Logo', icon: Image, category: 'Company' },
  { id: 'company_address', label: 'Company Address', icon: MapPin, category: 'Company' },
  { id: 'company_phone', label: 'Company Phone', icon: Phone, category: 'Company' },
  { id: 'company_email', label: 'Company Email', icon: Mail, category: 'Company' },
  { id: 'company_website', label: 'Company Website', icon: Globe, category: 'Company' },
  { id: 'company_tax_id', label: 'Tax ID / VAT', icon: Hash, category: 'Company' },
  
  { id: 'invoice_number', label: 'Invoice Number', icon: FileText, category: 'Invoice' },
  { id: 'invoice_date', label: 'Invoice Date', icon: FileText, category: 'Invoice' },
  { id: 'due_date', label: 'Due Date', icon: FileText, category: 'Invoice' },
  { id: 'customer_name', label: 'Customer Name', icon: Building, category: 'Invoice' },
  { id: 'customer_address', label: 'Customer Address', icon: MapPin, category: 'Invoice' },
  { id: 'customer_phone', label: 'Customer Phone', icon: Phone, category: 'Invoice' },
  
  { id: 'items_table', label: 'Items Table', icon: Type, category: 'Content' },
  { id: 'subtotal', label: 'Subtotal', icon: Hash, category: 'Content' },
  { id: 'tax_amount', label: 'Tax Amount', icon: Hash, category: 'Content' },
  { id: 'discount', label: 'Discount', icon: Hash, category: 'Content' },
  { id: 'total_amount', label: 'Total Amount', icon: Hash, category: 'Content' },
  { id: 'paid_amount', label: 'Paid Amount', icon: Hash, category: 'Content' },
  { id: 'remaining_amount', label: 'Remaining Amount', icon: Hash, category: 'Content' },
  
  { id: 'notes', label: 'Notes', icon: AlignLeft, category: 'Footer' },
  { id: 'terms', label: 'Terms & Conditions', icon: AlignLeft, category: 'Footer' },
  { id: 'footer_text', label: 'Footer Text', icon: AlignLeft, category: 'Footer' },
  { id: 'bank_details', label: 'Bank Details', icon: Building, category: 'Footer' },
];

interface Template {
  id: string;
  name: string;
  type: 'invoice' | 'report' | 'statement';
  fields: string[];
  layout: {
    header_style: 'centered' | 'left' | 'right';
    show_logo: boolean;
    primary_color: string;
    font_family: string;
    paper_size: 'a4' | 'letter' | 'thermal';
  };
  custom_texts: {
    title?: string;
    footer?: string;
    terms?: string;
  };
  is_default: boolean;
  created_at: string;
}

// Default templates
const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'default-invoice',
    name: 'Standard Invoice',
    type: 'invoice',
    fields: [
      'company_name', 'company_logo', 'company_address', 'company_phone', 'company_email',
      'invoice_number', 'invoice_date', 'due_date', 'customer_name', 'customer_address',
      'items_table', 'subtotal', 'tax_amount', 'total_amount', 'paid_amount', 'remaining_amount',
      'notes', 'footer_text'
    ],
    layout: {
      header_style: 'centered',
      show_logo: true,
      primary_color: '#3B82F6',
      font_family: 'Arial',
      paper_size: 'a4',
    },
    custom_texts: {
      title: 'INVOICE',
      footer: 'Thank you for your business!',
    },
    is_default: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'default-pos',
    name: 'POS Receipt',
    type: 'invoice',
    fields: [
      'company_name', 'company_phone',
      'invoice_number', 'invoice_date', 'customer_name',
      'items_table', 'subtotal', 'total_amount', 'paid_amount',
      'footer_text'
    ],
    layout: {
      header_style: 'centered',
      show_logo: false,
      primary_color: '#000000',
      font_family: 'Courier New',
      paper_size: 'thermal',
    },
    custom_texts: {
      title: 'RECEIPT',
      footer: 'Thank you!',
    },
    is_default: false,
    created_at: new Date().toISOString()
  }
];

export default function InvoiceTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('invoice_templates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch {
        setTemplates(DEFAULT_TEMPLATES);
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES);
    }
  }, []);

  // Save templates to localStorage
  const saveTemplates = (newTemplates: Template[]) => {
    localStorage.setItem('invoice_templates', JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  };

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: `template-${Date.now()}`,
      name: 'New Template',
      type: 'invoice',
      fields: ['company_name', 'invoice_number', 'invoice_date', 'items_table', 'total_amount'],
      layout: {
        header_style: 'centered',
        show_logo: true,
        primary_color: '#3B82F6',
        font_family: 'Arial',
        paper_size: 'a4',
      },
      custom_texts: {},
      is_default: false,
      created_at: new Date().toISOString()
    };
    setEditingTemplate(newTemplate);
    setIsEditorOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate({ ...template });
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    const existingIndex = templates.findIndex(t => t.id === editingTemplate.id);
    let newTemplates: Template[];
    
    if (existingIndex >= 0) {
      newTemplates = templates.map(t => t.id === editingTemplate.id ? editingTemplate : t);
    } else {
      newTemplates = [...templates, editingTemplate];
    }
    
    saveTemplates(newTemplates);
    setIsEditorOpen(false);
    setEditingTemplate(null);
    toast.success('Template saved successfully!');
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    const newTemplates = templates.filter(t => t.id !== templateId);
    saveTemplates(newTemplates);
    toast.success('Template deleted');
  };

  const handleSetDefault = (templateId: string) => {
    const newTemplates = templates.map(t => ({
      ...t,
      is_default: t.id === templateId
    }));
    saveTemplates(newTemplates);
    toast.success('Default template updated');
  };

  const handleDuplicateTemplate = (template: Template) => {
    const duplicate: Template = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      is_default: false,
      created_at: new Date().toISOString()
    };
    saveTemplates([...templates, duplicate]);
    toast.success('Template duplicated');
  };

  const toggleField = (fieldId: string) => {
    if (!editingTemplate) return;
    
    const hasField = editingTemplate.fields.includes(fieldId);
    const newFields = hasField
      ? editingTemplate.fields.filter(f => f !== fieldId)
      : [...editingTemplate.fields, fieldId];
    
    setEditingTemplate({ ...editingTemplate, fields: newFields });
  };

  const groupedFields = AVAILABLE_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_FIELDS>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            Invoice Templates
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage custom invoice templates</p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className={template.is_default ? 'ring-2 ring-blue-500' : ''}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {template.name}
                  {template.is_default && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground capitalize">{template.type} • {template.layout.paper_size.toUpperCase()}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setPreviewTemplate(template); setIsPreviewOpen(true); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDuplicateTemplate(template)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-4">
                {template.fields.slice(0, 5).map(fieldId => {
                  const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
                  return field ? (
                    <span key={fieldId} className="text-xs bg-muted px-2 py-1 rounded">
                      {field.label}
                    </span>
                  ) : null;
                })}
                {template.fields.length > 5 && (
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    +{template.fields.length - 5} more
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)} className="flex-1">
                  <Edit className="mr-1 h-3 w-3" /> Edit
                </Button>
                {!template.is_default && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(template.id)}>
                      <Check className="mr-1 h-3 w-3" /> Set Default
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id.startsWith('template-') ? 'Edit' : 'Create'} Template
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder="My Template"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Template Type</Label>
                  <select
                    value={editingTemplate.type}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value as any })}
                    className="w-full mt-1.5 p-2 border rounded-lg bg-background"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="report">Report</option>
                    <option value="statement">Statement</option>
                  </select>
                </div>
              </div>

              {/* Layout Settings */}
              <div>
                <h4 className="font-semibold mb-3">Layout Settings</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Header Style</Label>
                    <select
                      value={editingTemplate.layout.header_style}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        layout: { ...editingTemplate.layout, header_style: e.target.value as any }
                      })}
                      className="w-full mt-1.5 p-2 border rounded-lg bg-background"
                    >
                      <option value="centered">Centered</option>
                      <option value="left">Left Aligned</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>
                  <div>
                    <Label>Paper Size</Label>
                    <select
                      value={editingTemplate.layout.paper_size}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        layout: { ...editingTemplate.layout, paper_size: e.target.value as any }
                      })}
                      className="w-full mt-1.5 p-2 border rounded-lg bg-background"
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                      <option value="thermal">Thermal (80mm)</option>
                    </select>
                  </div>
                  <div>
                    <Label>Primary Color</Label>
                    <Input
                      type="color"
                      value={editingTemplate.layout.primary_color}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        layout: { ...editingTemplate.layout, primary_color: e.target.value }
                      })}
                      className="mt-1.5 h-10"
                    />
                  </div>
                  <div>
                    <Label>Font</Label>
                    <select
                      value={editingTemplate.layout.font_family}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        layout: { ...editingTemplate.layout, font_family: e.target.value }
                      })}
                      className="w-full mt-1.5 p-2 border rounded-lg bg-background"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={editingTemplate.layout.show_logo}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      layout: { ...editingTemplate.layout, show_logo: e.target.checked }
                    })}
                    id="show-logo"
                  />
                  <Label htmlFor="show-logo">Show Company Logo</Label>
                </div>
              </div>

              {/* Custom Texts */}
              <div>
                <h4 className="font-semibold mb-3">Custom Texts</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Document Title</Label>
                    <Input
                      value={editingTemplate.custom_texts.title || ''}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        custom_texts: { ...editingTemplate.custom_texts, title: e.target.value }
                      })}
                      placeholder="INVOICE"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Footer Text</Label>
                    <Input
                      value={editingTemplate.custom_texts.footer || ''}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        custom_texts: { ...editingTemplate.custom_texts, footer: e.target.value }
                      })}
                      placeholder="Thank you for your business!"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Terms & Conditions</Label>
                    <Input
                      value={editingTemplate.custom_texts.terms || ''}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        custom_texts: { ...editingTemplate.custom_texts, terms: e.target.value }
                      })}
                      placeholder="Payment due within 30 days"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Fields Selection */}
              <div>
                <h4 className="font-semibold mb-3">Include Fields</h4>
                <p className="text-sm text-muted-foreground mb-4">Click to toggle fields in your template</p>
                
                {Object.entries(groupedFields).map(([category, fields]) => (
                  <div key={category} className="mb-4">
                    <h5 className="text-sm font-medium text-muted-foreground mb-2">{category}</h5>
                    <div className="flex flex-wrap gap-2">
                      {fields.map((field) => {
                        const isSelected = editingTemplate.fields.includes(field.id);
                        const Icon = field.icon;
                        return (
                          <button
                            key={field.id}
                            onClick={() => toggleField(field.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-background border-gray-200 text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {field.label}
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          
          {previewTemplate && (
            <div 
              className="border rounded-lg p-6 bg-white" 
              style={{ fontFamily: previewTemplate.layout.font_family }}
            >
              {/* Header */}
              <div className={`mb-6 ${
                previewTemplate.layout.header_style === 'centered' ? 'text-center' :
                previewTemplate.layout.header_style === 'right' ? 'text-right' : 'text-left'
              }`}>
                {previewTemplate.layout.show_logo && previewTemplate.fields.includes('company_logo') && (
                  <div className="w-20 h-20 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center text-xs text-gray-500">
                    Logo
                  </div>
                )}
                {previewTemplate.fields.includes('company_name') && (
                  <h1 className="text-xl font-bold" style={{ color: previewTemplate.layout.primary_color }}>
                    Company Name
                  </h1>
                )}
                {previewTemplate.fields.includes('company_address') && (
                  <p className="text-sm text-gray-600">123 Business Street, City</p>
                )}
                {(previewTemplate.fields.includes('company_phone') || previewTemplate.fields.includes('company_email')) && (
                  <p className="text-sm text-gray-600">
                    {previewTemplate.fields.includes('company_phone') && 'Tel: +1 234 567 890'}
                    {previewTemplate.fields.includes('company_phone') && previewTemplate.fields.includes('company_email') && ' | '}
                    {previewTemplate.fields.includes('company_email') && 'Email: info@company.com'}
                  </p>
                )}
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-center mb-6" style={{ color: previewTemplate.layout.primary_color }}>
                {previewTemplate.custom_texts.title || 'INVOICE'}
              </h2>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  {previewTemplate.fields.includes('invoice_number') && (
                    <p><strong>Invoice:</strong> INV-0001</p>
                  )}
                  {previewTemplate.fields.includes('invoice_date') && (
                    <p><strong>Date:</strong> 21/12/2025</p>
                  )}
                  {previewTemplate.fields.includes('due_date') && (
                    <p><strong>Due:</strong> 20/01/2026</p>
                  )}
                </div>
                <div className="text-right">
                  {previewTemplate.fields.includes('customer_name') && (
                    <p><strong>Customer:</strong> John Doe</p>
                  )}
                  {previewTemplate.fields.includes('customer_address') && (
                    <p>456 Customer Ave, Town</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              {previewTemplate.fields.includes('items_table') && (
                <table className="w-full mb-6 text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: previewTemplate.layout.primary_color }}>
                      <th className="text-left py-2">Item</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">Sample Product</td>
                      <td className="text-right py-2">2</td>
                      <td className="text-right py-2">$50.00</td>
                      <td className="text-right py-2">$100.00</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Another Item</td>
                      <td className="text-right py-2">1</td>
                      <td className="text-right py-2">$75.00</td>
                      <td className="text-right py-2">$75.00</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Totals */}
              <div className="text-right space-y-1 mb-6 text-sm">
                {previewTemplate.fields.includes('subtotal') && (
                  <p><span className="text-gray-600">Subtotal:</span> <strong>$175.00</strong></p>
                )}
                {previewTemplate.fields.includes('tax_amount') && (
                  <p><span className="text-gray-600">Tax (10%):</span> <strong>$17.50</strong></p>
                )}
                {previewTemplate.fields.includes('discount') && (
                  <p><span className="text-gray-600">Discount:</span> <strong className="text-red-600">-$10.00</strong></p>
                )}
                {previewTemplate.fields.includes('total_amount') && (
                  <p className="text-lg"><span className="text-gray-600">Total:</span> <strong style={{ color: previewTemplate.layout.primary_color }}>$182.50</strong></p>
                )}
                {previewTemplate.fields.includes('paid_amount') && (
                  <p><span className="text-gray-600">Paid:</span> <strong className="text-green-600">$100.00</strong></p>
                )}
                {previewTemplate.fields.includes('remaining_amount') && (
                  <p><span className="text-gray-600">Balance:</span> <strong className="text-red-600">$82.50</strong></p>
                )}
              </div>

              {/* Footer */}
              {(previewTemplate.fields.includes('footer_text') || previewTemplate.fields.includes('terms')) && (
                <div className="border-t pt-4 text-center text-sm text-gray-600">
                  {previewTemplate.custom_texts.footer && <p>{previewTemplate.custom_texts.footer}</p>}
                  {previewTemplate.custom_texts.terms && <p className="text-xs mt-2">{previewTemplate.custom_texts.terms}</p>}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
