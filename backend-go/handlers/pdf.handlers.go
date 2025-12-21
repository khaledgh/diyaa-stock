package handlers

import (
	"bytes"
	"fmt"
	"net/http"
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
	transactions = append(transactions, payments...)

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
	pdf.AddUTF8Font("Amiri", "", "fonts/Amiri-Regular.ttf")

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
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
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
	pdf.AddUTF8Font("Amiri", "", "fonts/Amiri-Regular.ttf")

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
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Response().Header().Set("Content-Length", strconv.Itoa(buf.Len()))

	return c.Blob(http.StatusOK, "application/pdf", buf.Bytes())
}
