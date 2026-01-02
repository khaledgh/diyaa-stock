package handlers

import (
	"bytes"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/jung-kurt/gofpdf"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type PDFHandler struct {
	db *gorm.DB
}

func NewPDFHandler(db *gorm.DB) *PDFHandler {
	return &PDFHandler{db: db}
}

func (h *PDFHandler) getFontPath() string {
	cwd, _ := os.Getwd()
	fmt.Printf("Current working directory: %s\n", cwd)
	fontPath := "fonts/Amiri-Regular.ttf"
	if _, err := os.Stat(fontPath); os.IsNotExist(err) {
		fmt.Printf("Font file not found at local path: %s\n", fontPath)
		// Check common alternative paths
		// 1. Parent directory (e.g. running from cmd/)
		if _, err := os.Stat("../fonts/Amiri-Regular.ttf"); err == nil {
			fmt.Printf("Found font at: ../fonts/Amiri-Regular.ttf\n")
			return "../fonts/Amiri-Regular.ttf"
		}
		// 2. Project root subfolder (if running from root but structure differs)
		if _, err := os.Stat("backend-go/fonts/Amiri-Regular.ttf"); err == nil {
			fmt.Printf("Found font at: backend-go/fonts/Amiri-Regular.ttf\n")
			return "backend-go/fonts/Amiri-Regular.ttf"
		}
	}
	fmt.Printf("Using font path: %s\n", fontPath)
	return fontPath
}

// containsArabic checks if text contains Arabic characters
func containsArabic(text string) bool {
	for _, r := range text {
		if unicode.Is(unicode.Arabic, r) {
			return true
		}
	}
	return false
}

// reverseString reverses a string for RTL display
func reverseString(s string) string {
	runes := []rune(s)
	for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
		runes[i], runes[j] = runes[j], runes[i]
	}
	return string(runes)
}

// fixArabicText processes Arabic text for PDF display
func fixArabicText(text string) string {
	if !containsArabic(text) {
		return text
	}
	// Use Arabic reshaper for proper display
	return ReshapeArabic(text)
}

// CustomerStatementPDF generates PDF for customer statement
func (h *PDFHandler) CustomerStatementPDF(c echo.Context) error {
	customerID := c.Param("id")
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")
	companyName := c.QueryParam("company_name")
	companyAddress := c.QueryParam("company_address")
	companyPhone := c.QueryParam("company_phone")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, -6, 0).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}
	if companyName == "" {
		companyName = "Company Name"
	}

	// Get customer details
	var customer struct {
		ID    uint   `json:"id"`
		Name  string `json:"name"`
		Phone string `json:"phone"`
		Email string `json:"email"`
	}
	if err := h.db.Table("customers").Where("id = ?", customerID).First(&customer).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Customer not found"})
	}

	// Get transactions
	var transactions []struct {
		Type        string    `json:"type"`
		Reference   string    `json:"reference"`
		Date        time.Time `json:"date"`
		Debit       float64   `json:"debit"`
		Credit      float64   `json:"credit"`
		Description string    `json:"description"`
	}

	// Sales invoices (debit = what customer owes)
	invoiceQuery := `
		SELECT 
			'invoice' as type,
			invoice_number as reference,
			created_at as date,
			total_amount as debit,
			0 as credit,
			'Sales Invoice' as description
		FROM sales_invoices
		WHERE customer_id = ?
		AND DATE(created_at) BETWEEN ? AND ?
	`
	h.db.Raw(invoiceQuery, customerID, fromDate, toDate).Scan(&transactions)

	// Payments (credit = what customer paid)
	var payments []struct {
		Type        string    `json:"type"`
		Reference   string    `json:"reference"`
		Date        time.Time `json:"date"`
		Debit       float64   `json:"debit"`
		Credit      float64   `json:"credit"`
		Description string    `json:"description"`
	}
	paymentQuery := `
		SELECT 
			'payment' as type,
			COALESCE(reference_number, CONCAT('PAY-', id)) as reference,
			created_at as date,
			0 as debit,
			amount as credit,
			CONCAT('Payment (', payment_method, ')') as description
		FROM payments
		WHERE customer_id = ?
		AND invoice_type = 'sales'
		AND DATE(created_at) BETWEEN ? AND ?
	`
	h.db.Raw(paymentQuery, customerID, fromDate, toDate).Scan(&payments)
	for _, p := range payments {
		transactions = append(transactions, p)
	}

	// Credit notes (credit = reduces what customer owes)
	var creditNotes []struct {
		Type        string    `json:"type"`
		Reference   string    `json:"reference"`
		Date        time.Time `json:"date"`
		Debit       float64   `json:"debit"`
		Credit      float64   `json:"credit"`
		Description string    `json:"description"`
	}
	creditNoteQuery := `
		SELECT 
			'credit_note' as type,
			credit_note_number as reference,
			credit_note_date as date,
			0 as debit,
			total_amount as credit,
			'Credit Note' as description
		FROM credit_notes
		WHERE customer_id = ?
		AND type = 'sales'
		AND status = 'approved'
		AND DATE(credit_note_date) BETWEEN ? AND ?
	`
	h.db.Raw(creditNoteQuery, customerID, fromDate, toDate).Scan(&creditNotes)
	for _, cn := range creditNotes {
		transactions = append(transactions, cn)
	}

	// Calculate opening balance
	var openingBalance float64
	h.db.Raw(`
		SELECT COALESCE(
			(SELECT SUM(total_amount) FROM sales_invoices WHERE customer_id = ? AND DATE(created_at) < ?), 0
		) - COALESCE(
			(SELECT SUM(amount) FROM payments WHERE customer_id = ? AND invoice_type = 'sales' AND DATE(created_at) < ?), 0
		) - COALESCE(
			(SELECT SUM(total_amount) FROM credit_notes WHERE customer_id = ? AND type = 'sales' AND status = 'approved' AND DATE(credit_note_date) < ?), 0
		) as opening_balance
	`, customerID, fromDate, customerID, fromDate, customerID, fromDate).Scan(&openingBalance)

	// Calculate totals
	var totalDebit, totalCredit float64
	for _, t := range transactions {
		totalDebit += t.Debit
		totalCredit += t.Credit
	}
	closingBalance := openingBalance + totalDebit - totalCredit

	// Create PDF with margins
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Add Amiri font for Arabic support
	pdf.AddUTF8Font("Amiri", "", h.getFontPath())

	// Company Header - Blue background
	pdf.SetFillColor(59, 130, 246)
	pdf.Rect(0, 0, 210, 35, "F")

	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 18)
	pdf.SetY(10)
	pdf.CellFormat(180, 8, companyName, "", 1, "C", false, 0, "")

	if companyAddress != "" || companyPhone != "" {
		pdf.SetFont("Arial", "", 10)
		contactInfo := ""
		if companyAddress != "" {
			contactInfo = companyAddress
		}
		if companyPhone != "" {
			if contactInfo != "" {
				contactInfo += " | "
			}
			contactInfo += "Tel: " + companyPhone
		}
		pdf.CellFormat(180, 6, contactInfo, "", 1, "C", false, 0, "")
	}

	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(10)

	// Statement Title
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(59, 130, 246)
	pdf.CellFormat(180, 8, "CUSTOMER STATEMENT", "", 1, "C", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(5)

	// Customer Info
	pdf.SetFont("Arial", "", 10)

	// Handle Arabic customer name
	customerName := customer.Name
	if containsArabic(customerName) {
		pdf.SetFont("Amiri", "", 12)
		customerName = fixArabicText(customerName)
	}
	pdf.CellFormat(180, 6, fmt.Sprintf("Customer: %s", customerName), "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(180, 6, fmt.Sprintf("Period: %s to %s", fromDate, toDate), "", 1, "L", false, 0, "")
	pdf.CellFormat(180, 6, fmt.Sprintf("Opening Balance: %.2f", openingBalance), "", 1, "L", false, 0, "")
	pdf.Ln(5)

	// Table Header - adjusted widths to fit page (total = 180mm to fit with margins)
	pdf.SetFillColor(59, 130, 246) // Blue
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(22, 8, "Date", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 8, "Type", "1", 0, "C", true, 0, "")
	pdf.CellFormat(35, 8, "Reference", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 8, "Description", "1", 0, "C", true, 0, "")
	pdf.CellFormat(22, 8, "Debit", "1", 0, "C", true, 0, "")
	pdf.CellFormat(22, 8, "Credit", "1", 0, "C", true, 0, "")
	pdf.CellFormat(22, 8, "Balance", "1", 1, "C", true, 0, "")

	// Table Body
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("Arial", "", 8)

	runningBalance := openingBalance
	for _, tx := range transactions {
		runningBalance = runningBalance + tx.Debit - tx.Credit

		pdf.CellFormat(22, 7, tx.Date.Format("2006-01-02"), "1", 0, "C", false, 0, "")
		pdf.CellFormat(20, 7, tx.Type, "1", 0, "C", false, 0, "")
		pdf.CellFormat(35, 7, tx.Reference, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 7, tx.Description, "1", 0, "L", false, 0, "")

		debitStr := ""
		if tx.Debit > 0 {
			debitStr = fmt.Sprintf("%.2f", tx.Debit)
		}
		creditStr := ""
		if tx.Credit > 0 {
			creditStr = fmt.Sprintf("%.2f", tx.Credit)
		}

		pdf.CellFormat(22, 7, debitStr, "1", 0, "R", false, 0, "")
		pdf.CellFormat(22, 7, creditStr, "1", 0, "R", false, 0, "")
		pdf.CellFormat(22, 7, fmt.Sprintf("%.2f", runningBalance), "1", 1, "R", false, 0, "")
	}

	// Closing Balance
	pdf.Ln(5)
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(190, 8, fmt.Sprintf("Closing Balance: %.2f", closingBalance), "", 1, "R", false, 0, "")

	// Output PDF
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate PDF"})
	}

	// Set headers for PDF download
	filename := fmt.Sprintf("Statement_%s_%s_to_%s.pdf",
		strings.ReplaceAll(customer.Name, " ", "_"), fromDate, toDate)
	c.Response().Header().Set("Content-Type", "application/pdf")
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	c.Response().Header().Set("Content-Length", strconv.Itoa(buf.Len()))

	return c.Blob(http.StatusOK, "application/pdf", buf.Bytes())
}

// VendorStatementPDF generates PDF for vendor statement
func (h *PDFHandler) VendorStatementPDF(c echo.Context) error {
	vendorID := c.Param("id")
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")
	companyName := c.QueryParam("company_name")
	companyAddress := c.QueryParam("company_address")
	companyPhone := c.QueryParam("company_phone")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, -6, 0).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}
	if companyName == "" {
		companyName = "Company Name"
	}

	// Get vendor details
	var vendor struct {
		ID      uint   `json:"id"`
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		Address string `json:"address"`
	}
	if err := h.db.Table("vendors").Where("id = ?", vendorID).First(&vendor).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Vendor not found"})
	}

	// Get transactions (invoices, payments, and credit notes)
	type VendorTransaction struct {
		Type        string    `json:"type"`
		Reference   string    `json:"reference"`
		Date        time.Time `json:"date"`
		Debit       float64   `json:"debit"`
		Credit      float64   `json:"credit"`
		Description string    `json:"description"`
	}
	var transactions []VendorTransaction

	// Purchase invoices (credit = what we owe)
	invoiceQuery := `
		SELECT 
			'invoice' as type,
			invoice_number as reference,
			created_at as date,
			0 as debit,
			total_amount as credit,
			'Purchase Invoice' as description
		FROM purchase_invoices
		WHERE vendor_id = ?
		AND DATE(created_at) BETWEEN ? AND ?
	`
	h.db.Raw(invoiceQuery, vendorID, fromDate, toDate).Scan(&transactions)

	// Payments to vendor (debit = what we paid)
	var payments []VendorTransaction
	paymentQuery := `
		SELECT 
			'payment' as type,
			COALESCE(reference_number, CONCAT('PAY-', id)) as reference,
			created_at as date,
			ABS(amount) as debit,
			0 as credit,
			CONCAT('Payment (', payment_method, ')') as description
		FROM payments
		WHERE vendor_id = ?
		AND invoice_type = 'purchase'
		AND DATE(created_at) BETWEEN ? AND ?
	`
	h.db.Raw(paymentQuery, vendorID, fromDate, toDate).Scan(&payments)
	transactions = append(transactions, payments...)

	// Credit notes (debit = reduces what we owe)
	// Support both: vendor_id directly OR linked via purchase_invoice
	var creditNotes []VendorTransaction
	creditNoteQuery := `
		SELECT 
			'credit_note' as type,
			cn.credit_note_number as reference,
			cn.created_at as date,
			cn.total_amount as debit,
			0 as credit,
			CONCAT('Credit Note - ', COALESCE(cn.notes, 'Return')) as description
		FROM credit_notes cn
		LEFT JOIN purchase_invoices pi ON cn.purchase_invoice_id = pi.id
		WHERE (cn.vendor_id = ? OR pi.vendor_id = ?)
		AND DATE(cn.created_at) BETWEEN ? AND ?
		AND cn.type = 'purchase'
		AND cn.status = 'approved'
	`
	h.db.Raw(creditNoteQuery, vendorID, vendorID, fromDate, toDate).Scan(&creditNotes)
	transactions = append(transactions, creditNotes...)

	// Calculate opening balance (including credit notes - linked directly or via purchase invoice)
	var openingBalance float64
	h.db.Raw(`
		SELECT COALESCE(
			(SELECT SUM(total_amount) FROM purchase_invoices WHERE vendor_id = ? AND DATE(created_at) < ?), 0
		) - COALESCE(
			(SELECT SUM(ABS(amount)) FROM payments WHERE vendor_id = ? AND invoice_type = 'purchase' AND DATE(created_at) < ?), 0
		) - COALESCE(
			(SELECT SUM(cn.total_amount) FROM credit_notes cn
			 LEFT JOIN purchase_invoices pi ON cn.purchase_invoice_id = pi.id
			 WHERE (cn.vendor_id = ? OR pi.vendor_id = ?) AND cn.type = 'purchase' AND cn.status = 'approved' AND DATE(cn.created_at) < ?), 0
		) as opening_balance
	`, vendorID, fromDate, vendorID, fromDate, vendorID, vendorID, fromDate).Scan(&openingBalance)

	// Calculate totals
	var totalDebit, totalCredit float64
	for _, t := range transactions {
		totalDebit += t.Debit
		totalCredit += t.Credit
	}
	closingBalance := openingBalance + totalCredit - totalDebit

	// Create PDF with margins
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Add Amiri font for Arabic support
	pdf.AddUTF8Font("Amiri", "", h.getFontPath())

	// Company Header - Red background for vendor
	pdf.SetFillColor(220, 38, 38)
	pdf.Rect(0, 0, 210, 35, "F")

	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 18)
	pdf.SetY(10)
	pdf.CellFormat(180, 8, companyName, "", 1, "C", false, 0, "")

	if companyAddress != "" || companyPhone != "" {
		pdf.SetFont("Arial", "", 10)
		contactInfo := ""
		if companyAddress != "" {
			contactInfo = companyAddress
		}
		if companyPhone != "" {
			if contactInfo != "" {
				contactInfo += " | "
			}
			contactInfo += "Tel: " + companyPhone
		}
		pdf.CellFormat(180, 6, contactInfo, "", 1, "C", false, 0, "")
	}

	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(10)

	// Statement Title
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(220, 38, 38)
	pdf.CellFormat(180, 8, "VENDOR STATEMENT", "", 1, "C", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(5)

	// Vendor Info
	pdf.SetFont("Arial", "", 10)

	// Handle Arabic vendor name
	vendorName := vendor.Name
	if containsArabic(vendorName) {
		pdf.SetFont("Amiri", "", 12)
		vendorName = fixArabicText(vendorName)
	}
	pdf.CellFormat(180, 6, fmt.Sprintf("Vendor: %s", vendorName), "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(180, 6, fmt.Sprintf("Period: %s to %s", fromDate, toDate), "", 1, "L", false, 0, "")
	pdf.CellFormat(180, 6, fmt.Sprintf("Opening Balance: %.2f", openingBalance), "", 1, "L", false, 0, "")
	pdf.Ln(5)

	// Table Header - adjusted widths to fit page
	pdf.SetFillColor(220, 38, 38) // Red
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)
	pdf.CellFormat(22, 8, "Date", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 8, "Type", "1", 0, "C", true, 0, "")
	pdf.CellFormat(35, 8, "Reference", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 8, "Description", "1", 0, "C", true, 0, "")
	pdf.CellFormat(22, 8, "Debit", "1", 0, "C", true, 0, "")
	pdf.CellFormat(22, 8, "Credit", "1", 0, "C", true, 0, "")
	pdf.CellFormat(22, 8, "Balance", "1", 1, "C", true, 0, "")

	// Table Body
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("Arial", "", 8)

	runningBalance := openingBalance
	for _, tx := range transactions {
		runningBalance = runningBalance + tx.Credit - tx.Debit

		pdf.CellFormat(22, 7, tx.Date.Format("2006-01-02"), "1", 0, "C", false, 0, "")

		typeLabel := tx.Type
		if tx.Type == "invoice" {
			typeLabel = "Bill"
		}
		pdf.CellFormat(20, 7, typeLabel, "1", 0, "C", false, 0, "")
		pdf.CellFormat(35, 7, tx.Reference, "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 7, tx.Description, "1", 0, "L", false, 0, "")

		debitStr := ""
		if tx.Debit > 0 {
			debitStr = fmt.Sprintf("%.2f", tx.Debit)
		}
		creditStr := ""
		if tx.Credit > 0 {
			creditStr = fmt.Sprintf("%.2f", tx.Credit)
		}

		pdf.CellFormat(22, 7, debitStr, "1", 0, "R", false, 0, "")
		pdf.CellFormat(22, 7, creditStr, "1", 0, "R", false, 0, "")
		pdf.CellFormat(22, 7, fmt.Sprintf("%.2f", runningBalance), "1", 1, "R", false, 0, "")
	}

	// Closing Balance
	pdf.Ln(5)
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(190, 8, fmt.Sprintf("Closing Balance: %.2f", closingBalance), "", 1, "R", false, 0, "")

	// Output PDF
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate PDF"})
	}

	// Set headers for PDF download
	filename := fmt.Sprintf("Statement_%s_%s_to_%s.pdf",
		strings.ReplaceAll(vendor.Name, " ", "_"), fromDate, toDate)
	c.Response().Header().Set("Content-Type", "application/pdf")
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	c.Response().Header().Set("Content-Length", strconv.Itoa(buf.Len()))

	return c.Blob(http.StatusOK, "application/pdf", buf.Bytes())
}

// InvoicePDF generates PDF for invoice (sales or purchase)
func (h *PDFHandler) InvoicePDF(c echo.Context) error {
	invoiceID := c.Param("id")
	invoiceType := c.QueryParam("type") // "sales" or "purchase"
	companyName := c.QueryParam("company_name")
	companyAddress := c.QueryParam("company_address")
	companyPhone := c.QueryParam("company_phone")

	fmt.Printf("PDF Request - Invoice ID: %s, Type: %s\n", invoiceID, invoiceType)

	if companyName == "" {
		companyName = "Company Name"
	}

	if invoiceType == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invoice type is required (sales or purchase)"})
	}

	// Get invoice details with items and credit notes
	var invoice struct {
		ID             uint      `json:"id"`
		InvoiceNumber  string    `json:"invoice_number"`
		InvoiceDate    time.Time `json:"invoice_date"`
		CreatedAt      time.Time `json:"created_at"`
		Subtotal       float64   `json:"subtotal"`
		TaxAmount      float64   `json:"tax_amount"`
		DiscountAmount float64   `json:"discount_amount"`
		TotalAmount    float64   `json:"total_amount"`
		PaidAmount     float64   `json:"paid_amount"`
		PaymentStatus  string    `json:"payment_status"`
		Notes          string    `json:"notes"`
		LocationName   string    `json:"location_name"`
		CustomerName   string    `json:"customer_name"`
		VendorName     string    `json:"vendor_name"`
	}

	var items []struct {
		ProductID       uint    `json:"product_id"`
		ProductName     string  `json:"product_name"`
		Quantity        float64 `json:"quantity"`
		UnitPrice       float64 `json:"unit_price"`
		DiscountPercent float64 `json:"discount_percent"`
		Total           float64 `json:"total"`
	}

	var creditNotes []struct {
		ID               uint      `json:"id"`
		CreditNoteNumber string    `json:"credit_note_number"`
		CreditNoteDate   time.Time `json:"credit_note_date"`
		Status           string    `json:"status"`
		TotalAmount      float64   `json:"total_amount"`
		Items            []struct {
			ProductID uint    `json:"product_id"`
			Quantity  float64 `json:"quantity"`
		} `gorm:"-"`
	}

	// Get invoice based on type
	if invoiceType == "sales" {
		if err := h.db.Table("sales_invoices si").
			Select("si.*, l.name as location_name, c.name as customer_name").
			Joins("LEFT JOIN locations l ON si.location_id = l.id").
			Joins("LEFT JOIN customers c ON si.customer_id = c.id").
			Where("si.id = ?", invoiceID).
			First(&invoice).Error; err != nil {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Invoice not found"})
		}

		// Get items
		h.db.Raw(`
			SELECT sii.product_id, 
				COALESCE(NULLIF(p.name_ar, ''), p.name_en, 'Unknown') as product_name,
				sii.quantity, sii.unit_price, sii.discount_percent, sii.total
			FROM sales_invoice_items sii
			LEFT JOIN products p ON sii.product_id = p.id
			WHERE sii.invoice_id = ?
		`, invoiceID).Scan(&items)
		fmt.Printf("Sales invoice items fetched: %d items\n", len(items))
		for i, item := range items {
			fmt.Printf("  Item %d: ProductID=%d, Name='%s'\n", i, item.ProductID, item.ProductName)
		}

		// Get credit notes
		h.db.Raw(`
			SELECT id, credit_note_number, credit_note_date, status, total_amount
			FROM credit_notes
			WHERE sales_invoice_id = ? AND status = 'approved'
		`, invoiceID).Scan(&creditNotes)

	} else {
		if err := h.db.Table("purchase_invoices pi").
			Select("pi.*, l.name as location_name, v.company_name as vendor_name").
			Joins("LEFT JOIN locations l ON pi.location_id = l.id").
			Joins("LEFT JOIN vendors v ON pi.vendor_id = v.id").
			Where("pi.id = ?", invoiceID).
			First(&invoice).Error; err != nil {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Invoice not found"})
		}

		// Get items
		h.db.Raw(`
			SELECT pii.product_id,
				COALESCE(NULLIF(p.name_ar, ''), p.name_en, 'Unknown') as product_name,
				pii.quantity, pii.unit_price, pii.discount_percent, pii.total
			FROM purchase_invoice_items pii
			LEFT JOIN products p ON pii.product_id = p.id
			WHERE pii.invoice_id = ?
		`, invoiceID).Scan(&items)
		fmt.Printf("Purchase invoice items fetched: %d items\n", len(items))
		for i, item := range items {
			fmt.Printf("  Item %d: ProductID=%d, Name='%s'\n", i, item.ProductID, item.ProductName)
		}

		// Get credit notes
		h.db.Raw(`
			SELECT id, credit_note_number, credit_note_date, status, total_amount
			FROM credit_notes
			WHERE purchase_invoice_id = ? AND status = 'approved'
		`, invoiceID).Scan(&creditNotes)
	}

	// Get credit note items for each credit note
	for i := range creditNotes {
		h.db.Raw(`
			SELECT product_id, quantity
			FROM credit_note_items
			WHERE credit_note_id = ?
		`, creditNotes[i].ID).Scan(&creditNotes[i].Items)
	}

	// Calculate credit notes total and credited quantities
	creditNotesTotal := 0.0
	creditedQuantities := make(map[uint]float64)
	for _, cn := range creditNotes {
		creditNotesTotal += cn.TotalAmount
		for _, item := range cn.Items {
			creditedQuantities[item.ProductID] += item.Quantity
		}
	}

	remaining := invoice.TotalAmount - creditNotesTotal - invoice.PaidAmount

	// Create PDF
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Add Amiri font for Arabic support
	pdf.AddUTF8Font("Amiri", "", h.getFontPath())

	// Company Header
	headerColor := []int{22, 163, 74} // Green for sales
	if invoiceType == "purchase" {
		headerColor = []int{37, 99, 235} // Blue for purchase
	}
	pdf.SetFillColor(headerColor[0], headerColor[1], headerColor[2])
	pdf.Rect(0, 0, 210, 35, "F")

	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 18)
	pdf.SetY(10)
	pdf.CellFormat(180, 8, companyName, "", 1, "C", false, 0, "")

	if companyAddress != "" || companyPhone != "" {
		pdf.SetFont("Arial", "", 10)
		contactInfo := ""
		if companyAddress != "" {
			contactInfo = companyAddress
		}
		if companyPhone != "" {
			if contactInfo != "" {
				contactInfo += " | "
			}
			contactInfo += "Tel: " + companyPhone
		}
		pdf.CellFormat(180, 6, contactInfo, "", 1, "C", false, 0, "")
	}

	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(10)

	// Invoice Title
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(headerColor[0], headerColor[1], headerColor[2])
	title := "SALES INVOICE"
	if invoiceType == "purchase" {
		title = "PURCHASE INVOICE"
	}
	pdf.CellFormat(180, 8, title, "", 1, "C", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(5)

	// Invoice Info
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(90, 6, fmt.Sprintf("Invoice #: %s", invoice.InvoiceNumber), "", 0, "L", false, 0, "")

	// Handle Arabic location name
	locationName := invoice.LocationName
	if containsArabic(locationName) {
		pdf.SetFont("Amiri", "", 12)
		locationName = fixArabicText(locationName)
	}
	pdf.CellFormat(90, 6, fmt.Sprintf("Location: %s", locationName), "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)

	invoiceDate := invoice.InvoiceDate
	if invoiceDate.IsZero() {
		invoiceDate = invoice.CreatedAt
	}
	pdf.CellFormat(90, 6, fmt.Sprintf("Date: %s", invoiceDate.Format("2006-01-02")), "", 0, "L", false, 0, "")
	pdf.CellFormat(90, 6, fmt.Sprintf("Status: %s", invoice.PaymentStatus), "", 1, "L", false, 0, "")

	entityName := invoice.CustomerName
	entityLabel := "Customer"
	if invoiceType == "purchase" {
		entityName = invoice.VendorName
		entityLabel = "Vendor"
	}
	if entityName == "" {
		entityName = "Walk-in"
	}

	// Handle Arabic names
	if containsArabic(entityName) {
		pdf.SetFont("Amiri", "", 12)
		entityName = fixArabicText(entityName)
	}
	pdf.CellFormat(180, 6, fmt.Sprintf("%s: %s", entityLabel, entityName), "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.Ln(5)

	// Items Table Header
	pdf.SetFillColor(headerColor[0], headerColor[1], headerColor[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)

	colWidths := []float64{60, 20, 25, 20, 25}
	headers := []string{"Product", "Qty", "Unit Price", "Disc%", "Total"}

	if creditNotesTotal > 0 {
		colWidths = []float64{55, 15, 20, 25, 15, 30}
		headers = []string{"Product", "Qty", "CN Qty", "Unit Price", "Disc%", "Total"}
	}

	for i, header := range headers {
		pdf.CellFormat(colWidths[i], 8, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Items Table Body
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("Arial", "", 8)

	for _, item := range items {
		productName := item.ProductName
		if containsArabic(productName) {
			pdf.SetFont("Amiri", "", 9)
			productName = fixArabicText(productName)
		}
		pdf.CellFormat(colWidths[0], 7, productName, "1", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 8)

		pdf.CellFormat(colWidths[1], 7, fmt.Sprintf("%.0f", item.Quantity), "1", 0, "C", false, 0, "")

		if creditNotesTotal > 0 {
			creditedQty := creditedQuantities[item.ProductID]
			cnQtyStr := "-"
			if creditedQty > 0 {
				cnQtyStr = fmt.Sprintf("%.0f", creditedQty)
			}
			pdf.SetTextColor(234, 88, 12) // Orange
			pdf.CellFormat(colWidths[2], 7, cnQtyStr, "1", 0, "C", false, 0, "")
			pdf.SetTextColor(0, 0, 0)
		}

		priceIdx := 2
		if creditNotesTotal > 0 {
			priceIdx = 3
		}
		pdf.CellFormat(colWidths[priceIdx], 7, fmt.Sprintf("%.2f", item.UnitPrice), "1", 0, "R", false, 0, "")
		pdf.CellFormat(colWidths[priceIdx+1], 7, fmt.Sprintf("%.0f%%", item.DiscountPercent), "1", 0, "C", false, 0, "")

		if creditNotesTotal > 0 {
			creditedQty := creditedQuantities[item.ProductID]
			remainingQty := item.Quantity - creditedQty
			afterCredit := remainingQty * item.UnitPrice * (1 - item.DiscountPercent/100)
			if creditedQty > 0 {
				pdf.SetTextColor(22, 163, 74) // Green
			}
			pdf.CellFormat(colWidths[5], 7, fmt.Sprintf("%.2f", afterCredit), "1", 0, "R", false, 0, "")
			pdf.SetTextColor(0, 0, 0)
		} else {
			pdf.CellFormat(colWidths[priceIdx+2], 7, fmt.Sprintf("%.2f", item.Total), "1", 0, "R", false, 0, "")
		}

		pdf.Ln(-1)
	}

	pdf.Ln(5)

	// Credit Notes Table (if any)
	if len(creditNotes) > 0 {
		pdf.SetFont("Arial", "B", 10)
		pdf.SetTextColor(234, 88, 12)
		pdf.CellFormat(180, 6, "Credit Notes", "", 1, "L", false, 0, "")
		pdf.SetTextColor(0, 0, 0)
		pdf.Ln(2)

		pdf.SetFillColor(234, 88, 12)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 8)
		pdf.CellFormat(50, 7, "Credit Note #", "1", 0, "C", true, 0, "")
		pdf.CellFormat(40, 7, "Date", "1", 0, "C", true, 0, "")
		pdf.CellFormat(30, 7, "Status", "1", 0, "C", true, 0, "")
		pdf.CellFormat(30, 7, "Amount", "1", 1, "C", true, 0, "")

		pdf.SetTextColor(0, 0, 0)
		pdf.SetFont("Arial", "", 8)
		for _, cn := range creditNotes {
			pdf.CellFormat(50, 6, cn.CreditNoteNumber, "1", 0, "L", false, 0, "")
			pdf.CellFormat(40, 6, cn.CreditNoteDate.Format("2006-01-02"), "1", 0, "C", false, 0, "")
			pdf.CellFormat(30, 6, cn.Status, "1", 0, "C", false, 0, "")
			pdf.SetTextColor(234, 88, 12)
			pdf.CellFormat(30, 6, fmt.Sprintf("-%.2f", cn.TotalAmount), "1", 1, "R", false, 0, "")
			pdf.SetTextColor(0, 0, 0)
		}
		pdf.Ln(5)
	}

	// Totals Section
	pdf.SetFont("Arial", "", 10)
	xPos := 130.0
	pdf.SetX(xPos)
	pdf.CellFormat(30, 6, "Subtotal:", "", 0, "R", false, 0, "")
	pdf.CellFormat(30, 6, fmt.Sprintf("%.2f", invoice.Subtotal), "", 1, "R", false, 0, "")

	if invoice.TaxAmount > 0 {
		pdf.SetX(xPos)
		pdf.CellFormat(30, 6, "Tax:", "", 0, "R", false, 0, "")
		pdf.CellFormat(30, 6, fmt.Sprintf("%.2f", invoice.TaxAmount), "", 1, "R", false, 0, "")
	}

	if invoice.DiscountAmount > 0 {
		pdf.SetX(xPos)
		pdf.CellFormat(30, 6, "Discount:", "", 0, "R", false, 0, "")
		pdf.SetTextColor(220, 38, 38)
		pdf.CellFormat(30, 6, fmt.Sprintf("-%.2f", invoice.DiscountAmount), "", 1, "R", false, 0, "")
		pdf.SetTextColor(0, 0, 0)
	}

	// Total Section
	pdf.SetFont("Arial", "B", 12)
	pdf.SetX(xPos)
	finalTotal := invoice.TotalAmount
	if creditNotesTotal > 0 {
		finalTotal = invoice.TotalAmount - creditNotesTotal
	}
	pdf.CellFormat(30, 8, "Total:", "", 0, "R", false, 0, "")
	pdf.CellFormat(30, 8, fmt.Sprintf("%.2f", finalTotal), "", 1, "R", false, 0, "")

	pdf.SetFont("Arial", "", 10)
	pdf.SetX(xPos)
	pdf.CellFormat(30, 6, "Paid:", "", 0, "R", false, 0, "")
	pdf.SetTextColor(22, 163, 74)
	pdf.CellFormat(30, 6, fmt.Sprintf("%.2f", invoice.PaidAmount), "", 1, "R", false, 0, "")
	pdf.SetTextColor(0, 0, 0)

	if remaining > 0 {
		pdf.SetFont("Arial", "B", 10)
		pdf.SetX(xPos)
		pdf.CellFormat(30, 6, "Remaining:", "", 0, "R", false, 0, "")
		pdf.SetTextColor(220, 38, 38)
		pdf.CellFormat(30, 6, fmt.Sprintf("%.2f", remaining), "", 1, "R", false, 0, "")
		pdf.SetTextColor(0, 0, 0)
	}

	// Notes
	if invoice.Notes != "" {
		pdf.Ln(5)
		pdf.SetFont("Arial", "B", 10)
		pdf.CellFormat(180, 6, "Notes:", "", 1, "L", false, 0, "")
		pdf.SetFont("Arial", "", 9)
		pdf.MultiCell(180, 5, invoice.Notes, "", "L", false)
	}

	// Output PDF
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		fmt.Printf("PDF Generation Error: %v\n", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate PDF"})
	}

	fmt.Printf("PDF Generated successfully. Buffer length: %d bytes\n", buf.Len())

	// Set headers for PDF download
	filename := fmt.Sprintf("%s_invoice_%s.pdf", invoiceType, invoice.InvoiceNumber)
	c.Response().Header().Set("Content-Type", "application/pdf")
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	c.Response().Header().Set("Content-Length", strconv.Itoa(buf.Len()))

	return c.Blob(http.StatusOK, "application/pdf", buf.Bytes())
}
