package handlers

import (
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type ReportHandler struct {
	db *gorm.DB
}

func NewReportHandler(db *gorm.DB) *ReportHandler {
	return &ReportHandler{
		db: db,
	}
}

func (rh *ReportHandler) SalesReportHandler(c echo.Context) error {
	vanID := c.QueryParam("van_id")
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT 
			i.id,
			i.invoice_number,
			i.created_at,
			i.total_amount,
			i.paid_amount,
			i.payment_status,
			c.name as customer_name,
			v.name as van_name,
			u.full_name as created_by_name
		FROM sales_invoices i
		LEFT JOIN customers c ON i.customer_id = c.id
		LEFT JOIN vans v ON i.van_id = v.id
		LEFT JOIN users u ON i.created_by = u.id
		WHERE DATE(i.created_at) BETWEEN ? AND ?
	`

	args := []interface{}{fromDate, toDate}

	if vanID != "" {
		query += " AND i.van_id = ?"
		args = append(args, vanID)
	}

	query += " ORDER BY i.created_at DESC"

	var sales []map[string]interface{}
	if err := rh.db.Raw(query, args...).Scan(&sales).Error; err != nil {
		return ResponseError(c, err)
	}

	// Calculate summary
	var totalSales, totalPaid float64
	for _, sale := range sales {
		if amt, ok := sale["total_amount"].(float64); ok {
			totalSales += amt
		}
		if amt, ok := sale["paid_amount"].(float64); ok {
			totalPaid += amt
		}
	}

	summary := map[string]interface{}{
		"total_sales":  totalSales,
		"total_paid":   totalPaid,
		"total_unpaid": totalSales - totalPaid,
		"count":        len(sales),
	}

	result := map[string]interface{}{
		"sales":   sales,
		"summary": summary,
	}

	return ResponseOK(c, result, "data")
}

func (rh *ReportHandler) StockMovementsReportHandler(c echo.Context) error {
	productID := c.QueryParam("product_id")
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT 
			sm.*,
			p.name_en,
			p.name_ar,
			p.sku,
			u.full_name as created_by_name
		FROM stock_movements sm
		JOIN products p ON sm.product_id = p.id
		LEFT JOIN users u ON sm.created_by = u.id
		WHERE DATE(sm.created_at) BETWEEN ? AND ?
	`

	args := []interface{}{fromDate, toDate}

	if productID != "" {
		query += " AND sm.product_id = ?"
		args = append(args, productID)
	}

	query += " ORDER BY sm.created_at DESC LIMIT 500"

	var movements []map[string]interface{}
	if err := rh.db.Raw(query, args...).Scan(&movements).Error; err != nil {
		return ResponseError(c, err)
	}

	return ResponseOK(c, movements, "data")
}

func (rh *ReportHandler) ReceivablesReportHandler(c echo.Context) error {
	query := `
		SELECT 
			i.id,
			i.invoice_number,
			i.created_at,
			i.total_amount,
			i.paid_amount,
			(i.total_amount - i.paid_amount) as balance,
			i.payment_status,
			c.name as customer_name,
			c.phone as customer_phone,
			v.name as van_name
		FROM sales_invoices i
		LEFT JOIN customers c ON i.customer_id = c.id
		LEFT JOIN vans v ON i.van_id = v.id
		WHERE i.payment_status IN ('unpaid', 'partial')
		ORDER BY i.created_at DESC
	`

	var receivables []map[string]interface{}
	if err := rh.db.Raw(query).Scan(&receivables).Error; err != nil {
		return ResponseError(c, err)
	}

	// Calculate summary
	var totalReceivable float64
	for _, item := range receivables {
		if balance, ok := item["balance"].(float64); ok {
			totalReceivable += balance
		}
	}

	summary := map[string]interface{}{
		"total_receivable": totalReceivable,
		"count":            len(receivables),
	}

	result := map[string]interface{}{
		"receivables": receivables,
		"summary":     summary,
	}

	return ResponseOK(c, result, "data")
}

func (rh *ReportHandler) ProductPerformanceReportHandler(c echo.Context) error {
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT 
			p.id,
			p.sku,
			p.name_en,
			p.name_ar,
			c.name_en as category_name,
			SUM(ii.quantity) as total_sold,
			SUM(ii.total) as total_revenue,
			COUNT(DISTINCT i.id) as invoice_count
		FROM products p
		LEFT JOIN sales_invoice_items ii ON p.id = ii.product_id
		LEFT JOIN sales_invoices i ON ii.invoice_id = i.id
			AND DATE(i.created_at) BETWEEN ? AND ?
		LEFT JOIN categories c ON p.category_id = c.id
		GROUP BY p.id
		ORDER BY total_sold DESC
		LIMIT 50
	`

	var products []map[string]interface{}
	if err := rh.db.Raw(query, fromDate, toDate).Scan(&products).Error; err != nil {
		return ResponseError(c, err)
	}

	return ResponseOK(c, products, "data")
}

func (rh *ReportHandler) LocationSalesReportHandler(c echo.Context) error {
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")

	if fromDate == "" {
		fromDate = time.Now().Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT
			l.id as location_id,
			l.name as location_name,
			COUNT(DISTINCT i.id) as invoice_count,
			SUM(i.total_amount) as total_sales,
			SUM(i.paid_amount) as total_paid,
			SUM(i.total_amount - i.paid_amount) as total_unpaid,
			COUNT(DISTINCT ii.product_id) as products_sold
		FROM locations l
		LEFT JOIN sales_invoices i ON l.id = i.location_id
			AND DATE(i.created_at) BETWEEN ? AND ?
		LEFT JOIN sales_invoice_items ii ON i.id = ii.invoice_id
		WHERE l.is_active = true
		GROUP BY l.id, l.name
		ORDER BY total_sales DESC
	`

	var locationSales []map[string]interface{}
	if err := rh.db.Raw(query, fromDate, toDate).Scan(&locationSales).Error; err != nil {
		return ResponseError(c, err)
	}

	// Calculate summary
	var totalLocations, totalInvoices int64
	var totalSales, totalPaid, totalUnpaid float64
	for _, location := range locationSales {
		totalLocations++
		if count, ok := location["invoice_count"].(int64); ok {
			totalInvoices += count
		}
		if sales, ok := location["total_sales"].(float64); ok {
			totalSales += sales
		}
		if paid, ok := location["total_paid"].(float64); ok {
			totalPaid += paid
		}
		if unpaid, ok := location["total_unpaid"].(float64); ok {
			totalUnpaid += unpaid
		}
	}

	summary := map[string]interface{}{
		"total_locations": totalLocations,
		"total_invoices":  totalInvoices,
		"total_sales":     totalSales,
		"total_paid":      totalPaid,
		"total_unpaid":    totalUnpaid,
		"date_from":       fromDate,
		"date_to":         toDate,
	}

	result := map[string]interface{}{
		"locations": locationSales,
		"summary":   summary,
	}

	return ResponseOK(c, result, "data")
}

func (rh *ReportHandler) DashboardReportHandler(c echo.Context) error {
	dashboard := make(map[string]interface{})

	// Total products
	var totalProducts int64
	rh.db.Table("products").Where("is_active = ?", true).Count(&totalProducts)
	dashboard["total_products"] = totalProducts

	// Total inventory value
	var inventoryValue float64
	rh.db.Raw(`
		SELECT SUM(s.quantity * p.cost_price) as value
		FROM stocks s
		JOIN products p ON s.product_id = p.id
	`).Scan(&inventoryValue)
	dashboard["inventory_value"] = inventoryValue

	// Today's sales
	var todaySales struct {
		Count int     `json:"count"`
		Total float64 `json:"total"`
	}
	rh.db.Raw(`
		SELECT COUNT(*) as count, SUM(total_amount) as total
		FROM sales_invoices
		WHERE DATE(created_at) = CURDATE()
	`).Scan(&todaySales)
	dashboard["today_sales_count"] = todaySales.Count
	dashboard["today_sales_total"] = todaySales.Total

	// Pending payments (Receivables)
	var pendingPayments float64
	rh.db.Raw(`
		SELECT COALESCE(SUM(total_amount - paid_amount), 0) as total
		FROM sales_invoices
		WHERE payment_status IN ('unpaid', 'partial')
	`).Scan(&pendingPayments)
	dashboard["pending_payments"] = pendingPayments

	// Payables
	var payables float64
	rh.db.Raw(`
		SELECT COALESCE(SUM(total_amount - paid_amount), 0) as total
		FROM purchase_invoices
		WHERE payment_status IN ('unpaid', 'partial')
	`).Scan(&payables)
	dashboard["payables"] = payables

	// Low stock products
	var lowStockCount int64
	rh.db.Raw(`
		SELECT COUNT(DISTINCT s.product_id) as count
		FROM stocks s
		JOIN products p ON s.product_id = p.id
		WHERE s.quantity <= COALESCE(p.min_stock_level, 10)
	`).Scan(&lowStockCount)
	dashboard["low_stock_count"] = lowStockCount

	// Active locations
	var activeLocations int64
	rh.db.Table("locations").Where("is_active = ?", true).Count(&activeLocations)
	dashboard["active_locations"] = activeLocations

	// Credit notes statistics
	var creditNotes struct {
		TotalCount    int64   `json:"total_count"`
		PendingCount  int64   `json:"pending_count"`
		ApprovedCount int64   `json:"approved_count"`
		TotalAmount   float64 `json:"total_amount"`
	}
	rh.db.Raw(`
		SELECT
			COUNT(*) as total_count,
			COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
			COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
			COALESCE(SUM(total_amount), 0) as total_amount
		FROM credit_notes
	`).Scan(&creditNotes)
	dashboard["credit_notes_total"] = creditNotes.TotalCount
	dashboard["credit_notes_pending"] = creditNotes.PendingCount
	dashboard["credit_notes_approved"] = creditNotes.ApprovedCount
	dashboard["credit_notes_amount"] = creditNotes.TotalAmount

	// Product revenue (top products revenue for current month)
	var productRevenue struct {
		TotalRevenue float64 `json:"total_revenue"`
		TopProducts  int64   `json:"top_products"`
	}
	rh.db.Raw(`
		SELECT
			COALESCE(SUM(ii.total), 0) as total_revenue,
			COUNT(DISTINCT ii.product_id) as top_products
		FROM sales_invoice_items ii
		JOIN sales_invoices i ON ii.invoice_id = i.id
		WHERE MONTH(i.created_at) = MONTH(CURDATE())
		AND YEAR(i.created_at) = YEAR(CURDATE())
	`).Scan(&productRevenue)
	dashboard["product_revenue"] = productRevenue.TotalRevenue
	dashboard["top_products_count"] = productRevenue.TopProducts

	// Recent sales chart (last 7 days)
	var salesChart []map[string]interface{}
	rh.db.Raw(`
		SELECT DATE(created_at) as date, SUM(total_amount) as total
		FROM sales_invoices
		WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`).Scan(&salesChart)
	dashboard["sales_chart"] = salesChart

	return ResponseOK(c, dashboard, "data")
}

// CustomerStatementHandler generates a running balance statement for a customer
func (rh *ReportHandler) CustomerStatementHandler(c echo.Context) error {
	customerID := c.Param("id")
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, -6, 0).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}

	// Get customer details
	var customer struct {
		ID      uint   `json:"id"`
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		Address string `json:"address"`
	}
	if err := rh.db.Table("customers").Where("id = ?", customerID).First(&customer).Error; err != nil {
		return ResponseError(c, err)
	}

	// Get all transactions (invoices and payments) for the customer
	var transactions []map[string]interface{}

	// Get invoices
	invoiceQuery := `
		SELECT 
			'invoice' as type,
			id,
			invoice_number as reference,
			created_at as date,
			total_amount as debit,
			0 as credit,
			'Sales Invoice' as description
		FROM sales_invoices
		WHERE customer_id = ?
		AND DATE(created_at) BETWEEN ? AND ?
	`
	var invoices []map[string]interface{}
	rh.db.Raw(invoiceQuery, customerID, fromDate, toDate).Scan(&invoices)
	transactions = append(transactions, invoices...)

	// Get payments
	paymentQuery := `
		SELECT 
			'payment' as type,
			p.id,
			COALESCE(p.reference_number, CONCAT('PAY-', p.id)) as reference,
			p.created_at as date,
			0 as debit,
			p.amount as credit,
			CONCAT('Payment (', p.payment_method, ')') as description
		FROM payments p
		WHERE p.customer_id = ?
		AND p.invoice_type = 'sales'
		AND DATE(p.created_at) BETWEEN ? AND ?
	`
	var payments []map[string]interface{}
	rh.db.Raw(paymentQuery, customerID, fromDate, toDate).Scan(&payments)
	transactions = append(transactions, payments...)

	// Get credit notes
	creditNoteQuery := `
		SELECT 
			'credit_note' as type,
			id,
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
	var creditNotes []map[string]interface{}
	rh.db.Raw(creditNoteQuery, customerID, fromDate, toDate).Scan(&creditNotes)
	transactions = append(transactions, creditNotes...)

	// Calculate opening balance (all transactions before from_date)
	var openingBalance float64
	rh.db.Raw(`
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
		if debit, ok := t["debit"].(float64); ok {
			totalDebit += debit
		}
		if credit, ok := t["credit"].(float64); ok {
			totalCredit += credit
		}
	}
	closingBalance := openingBalance + totalDebit - totalCredit

	result := map[string]interface{}{
		"customer":        customer,
		"from_date":       fromDate,
		"to_date":         toDate,
		"opening_balance": openingBalance,
		"transactions":    transactions,
		"total_debit":     totalDebit,
		"total_credit":    totalCredit,
		"closing_balance": closingBalance,
	}

	return ResponseOK(c, result, "data")
}

// VendorStatementHandler generates a running balance statement for a vendor
func (rh *ReportHandler) VendorStatementHandler(c echo.Context) error {
	vendorID := c.Param("id")
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, -6, 0).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}

	// Get vendor details
	var vendor struct {
		ID      uint   `json:"id"`
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		Address string `json:"address"`
	}
	if err := rh.db.Table("vendors").Where("id = ?", vendorID).First(&vendor).Error; err != nil {
		return ResponseError(c, err)
	}

	// Get all transactions (invoices, payments, and credit notes) for the vendor

	// Get purchase invoices query
	invoiceQuery := `
		SELECT 
			'invoice' as type,
			id,
			invoice_number as reference,
			created_at as date,
			total_amount as credit,
			0 as debit,
			'Purchase Invoice' as description
		FROM purchase_invoices
		WHERE vendor_id = ?
		AND DATE(created_at) BETWEEN ? AND ?
	`

	// Get payments query
	paymentQuery := `
		SELECT 
			'payment' as type,
			p.id,
			COALESCE(p.reference_number, CONCAT('PAY-', p.id)) as reference,
			p.created_at as date,
			ABS(p.amount) as debit,
			0 as credit,
			CONCAT('Payment (', p.payment_method, ')') as description
		FROM payments p
		WHERE p.vendor_id = ?
		AND p.invoice_type = 'purchase'
		AND DATE(p.created_at) BETWEEN ? AND ?
	`

	// Get credit notes query
	creditNoteQuery := `
		SELECT 
			'credit_note' as type,
			cn.id,
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
	`

	// Calculate opening balance (include credit notes - linked directly or via purchase invoice)
	var openingBalance float64
	rh.db.Raw(`
		SELECT COALESCE(
			(SELECT SUM(total_amount) FROM purchase_invoices WHERE vendor_id = ? AND DATE(created_at) < ?), 0
		) - COALESCE(
			(SELECT SUM(ABS(amount)) FROM payments WHERE vendor_id = ? AND invoice_type = 'purchase' AND DATE(created_at) < ?), 0
		) - COALESCE(
			(SELECT SUM(cn.total_amount) FROM credit_notes cn
			 LEFT JOIN purchase_invoices pi ON cn.purchase_invoice_id = pi.id
			 WHERE (cn.vendor_id = ? OR pi.vendor_id = ?) AND cn.type = 'purchase' AND DATE(cn.created_at) < ?), 0
		) as opening_balance
	`, vendorID, fromDate, vendorID, fromDate, vendorID, vendorID, fromDate).Scan(&openingBalance)

	// Use a struct to ensure GORM handles type conversions correctly
	type StatementTransaction struct {
		Type        string    `json:"type"`
		ID          uint      `json:"id"`
		Reference   string    `json:"reference"`
		Date        time.Time `json:"date"`
		Debit       float64   `json:"debit"`
		Credit      float64   `json:"credit"`
		Description string    `json:"description"`
	}

	var allTransactions []StatementTransaction

	// Get purchase invoices
	var invs []StatementTransaction
	rh.db.Raw(invoiceQuery, vendorID, fromDate, toDate).Scan(&invs)
	allTransactions = append(allTransactions, invs...)

	// Get payments
	var pmts []StatementTransaction
	rh.db.Raw(paymentQuery, vendorID, fromDate, toDate).Scan(&pmts)
	allTransactions = append(allTransactions, pmts...)

	// Get credit notes
	var cns []StatementTransaction
	rh.db.Raw(creditNoteQuery, vendorID, vendorID, fromDate, toDate).Scan(&cns)
	allTransactions = append(allTransactions, cns...)

	// Calculate totals (separated by type)
	var totalBills, totalPayments, totalCreditNotes float64
	for _, t := range allTransactions {
		switch t.Type {
		case "invoice":
			totalBills += t.Credit
		case "payment":
			totalPayments += t.Debit
		case "credit_note":
			totalCreditNotes += t.Debit
		}
	}
	
	// Total debit = payments + credit notes, Total credit = bills
	totalDebit := totalPayments + totalCreditNotes
	totalCredit := totalBills
	closingBalance := openingBalance + totalCredit - totalDebit

	result := map[string]interface{}{
		"vendor":             vendor,
		"from_date":          fromDate,
		"to_date":            toDate,
		"opening_balance":    openingBalance,
		"transactions":       allTransactions,
		"total_bills":        totalBills,
		"total_payments":     totalPayments,
		"total_credit_notes": totalCreditNotes,
		"total_debit":        totalDebit,
		"total_credit":       totalCredit,
		"closing_balance":    closingBalance,
	}

	return ResponseOK(c, result, "data")
}

// InventoryValuationHandler provides a report on stock value
func (rh *ReportHandler) InventoryValuationHandler(c echo.Context) error {
	query := `
		SELECT 
			p.id,
			p.sku,
			p.name_en,
			p.name_ar,
			p.cost_price,
			p.unit_price,
			c.name_en as category_name,
			COALESCE(SUM(s.quantity), 0) as total_quantity,
			COALESCE(SUM(s.quantity * p.cost_price), 0) as stock_value,
			COALESCE(SUM(s.quantity * p.unit_price), 0) as retail_value
		FROM products p
		LEFT JOIN stocks s ON p.id = s.product_id
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.is_active = true
		GROUP BY p.id
		ORDER BY stock_value DESC
	`

	var products []map[string]interface{}
	if err := rh.db.Raw(query).Scan(&products).Error; err != nil {
		return ResponseError(c, err)
	}

	// Calculate summary
	var totalQuantity float64
	var totalCostValue, totalRetailValue float64
	for _, p := range products {
		if qty, ok := p["total_quantity"].(float64); ok {
			totalQuantity += qty
		}
		if val, ok := p["stock_value"].(float64); ok {
			totalCostValue += val
		}
		if val, ok := p["retail_value"].(float64); ok {
			totalRetailValue += val
		}
	}

	summary := map[string]interface{}{
		"total_items":        len(products),
		"total_quantity":     totalQuantity,
		"total_cost_value":   totalCostValue,
		"total_retail_value": totalRetailValue,
		"potential_profit":   totalRetailValue - totalCostValue,
	}

	result := map[string]interface{}{
		"products": products,
		"summary":  summary,
	}

	return ResponseOK(c, result, "data")
}

// ReceivablesAgingHandler provides an aging report for customer receivables
func (rh *ReportHandler) ReceivablesAgingHandler(c echo.Context) error {
	asOfDate := c.QueryParam("as_of_date")
	if asOfDate == "" {
		asOfDate = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT 
			c.id as customer_id,
			c.name as customer_name,
			c.phone as customer_phone,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, si.created_at) <= 0 THEN (si.total_amount - si.paid_amount - COALESCE((SELECT SUM(total_amount) FROM credit_notes WHERE sales_invoice_id = si.id AND status = 'approved' AND deleted_at IS NULL), 0)) ELSE 0 END), 0) as current_amount,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, si.created_at) BETWEEN 1 AND 15 THEN (si.total_amount - si.paid_amount - COALESCE((SELECT SUM(total_amount) FROM credit_notes WHERE sales_invoice_id = si.id AND status = 'approved' AND deleted_at IS NULL), 0)) ELSE 0 END), 0) as days_1_15,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, si.created_at) BETWEEN 16 AND 30 THEN (si.total_amount - si.paid_amount - COALESCE((SELECT SUM(total_amount) FROM credit_notes WHERE sales_invoice_id = si.id AND status = 'approved' AND deleted_at IS NULL), 0)) ELSE 0 END), 0) as days_16_30,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, si.created_at) BETWEEN 31 AND 45 THEN (si.total_amount - si.paid_amount - COALESCE((SELECT SUM(total_amount) FROM credit_notes WHERE sales_invoice_id = si.id AND status = 'approved' AND deleted_at IS NULL), 0)) ELSE 0 END), 0) as days_31_45,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, si.created_at) > 45 THEN (si.total_amount - si.paid_amount - COALESCE((SELECT SUM(total_amount) FROM credit_notes WHERE sales_invoice_id = si.id AND status = 'approved' AND deleted_at IS NULL), 0)) ELSE 0 END), 0) as days_over_45,
			COALESCE(SUM(si.total_amount - si.paid_amount - COALESCE((SELECT SUM(total_amount) FROM credit_notes WHERE sales_invoice_id = si.id AND status = 'approved' AND deleted_at IS NULL), 0)), 0) as total_outstanding
		FROM customers c
		LEFT JOIN sales_invoices si ON c.id = si.customer_id 
			AND si.payment_status != 'paid'
			AND si.deleted_at IS NULL
		WHERE c.deleted_at IS NULL
		GROUP BY c.id, c.name, c.phone
		HAVING total_outstanding > 0
		ORDER BY total_outstanding DESC
	`

	var customers []map[string]interface{}
	if err := rh.db.Raw(query, asOfDate, asOfDate, asOfDate, asOfDate, asOfDate).Scan(&customers).Error; err != nil {
		return ResponseError(c, err)
	}

	// Calculate summary totals
	var totalCurrent, total1_15, total16_30, total31_45, totalOver45, grandTotal float64
	for _, cust := range customers {
		if v, ok := cust["current_amount"].(float64); ok {
			totalCurrent += v
		}
		if v, ok := cust["days_1_15"].(float64); ok {
			total1_15 += v
		}
		if v, ok := cust["days_16_30"].(float64); ok {
			total16_30 += v
		}
		if v, ok := cust["days_31_45"].(float64); ok {
			total31_45 += v
		}
		if v, ok := cust["days_over_45"].(float64); ok {
			totalOver45 += v
		}
		if v, ok := cust["total_outstanding"].(float64); ok {
			grandTotal += v
		}
	}

	summary := map[string]interface{}{
		"current_amount":  totalCurrent,
		"days_1_15":       total1_15,
		"days_16_30":      total16_30,
		"days_31_45":      total31_45,
		"days_over_45":    totalOver45,
		"grand_total":     grandTotal,
		"total_customers": len(customers),
	}

	result := map[string]interface{}{
		"as_of_date": asOfDate,
		"customers":  customers,
		"summary":    summary,
	}

	return ResponseOK(c, result, "data")
}

// PayablesAgingHandler provides an aging report for vendor payables
func (rh *ReportHandler) PayablesAgingHandler(c echo.Context) error {
	asOfDate := c.QueryParam("as_of_date")
	if asOfDate == "" {
		asOfDate = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT 
			v.id as vendor_id,
			v.name as vendor_name,
			v.phone as vendor_phone,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, pi.created_at) <= 0 THEN pi.total_amount - pi.paid_amount ELSE 0 END), 0) as current_amount,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, pi.created_at) BETWEEN 1 AND 15 THEN pi.total_amount - pi.paid_amount ELSE 0 END), 0) as days_1_15,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, pi.created_at) BETWEEN 16 AND 30 THEN pi.total_amount - pi.paid_amount ELSE 0 END), 0) as days_16_30,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, pi.created_at) BETWEEN 31 AND 45 THEN pi.total_amount - pi.paid_amount ELSE 0 END), 0) as days_31_45,
			COALESCE(SUM(CASE WHEN DATEDIFF(?, pi.created_at) > 45 THEN pi.total_amount - pi.paid_amount ELSE 0 END), 0) as days_over_45,
			COALESCE(SUM(pi.total_amount - pi.paid_amount), 0) as total_outstanding
		FROM vendors v
		LEFT JOIN purchase_invoices pi ON v.id = pi.vendor_id 
			AND pi.payment_status != 'paid'
			AND pi.deleted_at IS NULL
		WHERE v.deleted_at IS NULL
		GROUP BY v.id, v.name, v.phone
		HAVING total_outstanding > 0
		ORDER BY total_outstanding DESC
	`

	var vendors []map[string]interface{}
	if err := rh.db.Raw(query, asOfDate, asOfDate, asOfDate, asOfDate, asOfDate).Scan(&vendors).Error; err != nil {
		return ResponseError(c, err)
	}

	// Calculate summary totals
	var totalCurrent, total1_15, total16_30, total31_45, totalOver45, grandTotal float64
	for _, vend := range vendors {
		if val, ok := vend["current_amount"].(float64); ok {
			totalCurrent += val
		}
		if val, ok := vend["days_1_15"].(float64); ok {
			total1_15 += val
		}
		if val, ok := vend["days_16_30"].(float64); ok {
			total16_30 += val
		}
		if val, ok := vend["days_31_45"].(float64); ok {
			total31_45 += val
		}
		if val, ok := vend["days_over_45"].(float64); ok {
			totalOver45 += val
		}
		if val, ok := vend["total_outstanding"].(float64); ok {
			grandTotal += val
		}
	}

	summary := map[string]interface{}{
		"current_amount": totalCurrent,
		"days_1_15":      total1_15,
		"days_16_30":     total16_30,
		"days_31_45":     total31_45,
		"days_over_45":   totalOver45,
		"grand_total":    grandTotal,
		"total_vendors":  len(vendors),
	}

	result := map[string]interface{}{
		"as_of_date": asOfDate,
		"vendors":    vendors,
		"summary":    summary,
	}

	return ResponseOK(c, result, "data")
}

// SalesByCustomerHandler provides sales breakdown by customer
func (rh *ReportHandler) SalesByCustomerHandler(c echo.Context) error {
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}
	query := `
		SELECT 
			COALESCE(c.id, 0) as customer_id,
			COALESCE(c.name, 'Walk-in Customers') as customer_name,
			COUNT(DISTINCT si.id) as invoice_count,
			COALESCE(SUM(si.total_amount), 0) as total_sales,
			COALESCE(SUM(si.paid_amount), 0) as total_paid,
			COALESCE((
				SELECT SUM(total_amount) 
				FROM credit_notes 
				WHERE (customer_id = c.id OR (c.id IS NULL AND customer_id IS NULL))
				AND status = 'approved' 
				AND deleted_at IS NULL
				AND DATE(created_at) BETWEEN ? AND ?
			), 0) as total_credit_notes,
			COALESCE(SUM(si.total_amount - si.paid_amount), 0) as total_outstanding
		FROM sales_invoices si
		LEFT JOIN customers c ON si.customer_id = c.id
		WHERE si.deleted_at IS NULL
		AND DATE(si.created_at) BETWEEN ? AND ?
		GROUP BY c.id, c.name
		ORDER BY total_sales DESC
	`

	var customers []map[string]interface{}
	if err := rh.db.Raw(query, fromDate, toDate, fromDate, toDate).Scan(&customers).Error; err != nil {
		return ResponseError(c, err)
	}

	// Calculate totals
	var totalSales, totalPaid, totalOutstanding, totalCreditNotes float64
	var totalInvoices int64
	for _, cust := range customers {
		if v, ok := cust["total_sales"].(float64); ok {
			totalSales += v
		}
		if v, ok := cust["total_paid"].(float64); ok {
			totalPaid += v
		}
		if v, ok := cust["total_credit_notes"].(float64); ok {
			totalCreditNotes += v
		}
		if v, ok := cust["total_outstanding"].(float64); ok {
			totalOutstanding += v
		}
		if v, ok := cust["invoice_count"].(int64); ok {
			totalInvoices += v
		}
	}

	summary := map[string]interface{}{
		"total_sales":        totalSales,
		"total_paid":         totalPaid,
		"total_credit_notes": totalCreditNotes,
		"total_outstanding":  totalOutstanding,
		"total_invoices":     totalInvoices,
		"total_customers":    len(customers),
	}

	result := map[string]interface{}{
		"from_date": fromDate,
		"to_date":   toDate,
		"customers": customers,
		"summary":   summary,
	}

	return ResponseOK(c, result, "data")
}

// SalesByItemHandler provides sales breakdown by product
func (rh *ReportHandler) SalesByItemHandler(c echo.Context) error {
	fromDate := c.QueryParam("from_date")
	toDate := c.QueryParam("to_date")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}

	query := `
		SELECT 
			p.id as product_id,
			p.sku,
			p.name_en as product_name,
			COALESCE(cat.name_en, 'Uncategorized') as category_name,
			(COALESCE(SUM(sii.quantity), 0) - COALESCE((
				SELECT SUM(cni.quantity)
				FROM credit_note_items cni
				JOIN credit_notes cn ON cni.credit_note_id = cn.id
				WHERE cni.product_id = p.id
				AND cn.type = 'sales'
				AND cn.status = 'approved'
				AND cn.deleted_at IS NULL
				AND DATE(cn.credit_note_date) BETWEEN ? AND ?
			), 0)) as quantity_sold,
			(COALESCE(SUM(sii.total), 0) - COALESCE((
				SELECT SUM(cni.total)
				FROM credit_note_items cni
				JOIN credit_notes cn ON cni.credit_note_id = cn.id
				WHERE cni.product_id = p.id
				AND cn.type = 'sales'
				AND cn.status = 'approved'
				AND cn.deleted_at IS NULL
				AND DATE(cn.credit_note_date) BETWEEN ? AND ?
			), 0)) as total_sales,
			COALESCE(AVG(sii.unit_price), 0) as avg_price,
			COUNT(DISTINCT si.id) as invoice_count
		FROM products p
		LEFT JOIN sales_invoice_items sii ON p.id = sii.product_id
		LEFT JOIN sales_invoices si ON sii.invoice_id = si.id 
			AND si.deleted_at IS NULL
			AND DATE(si.created_at) BETWEEN ? AND ?
		LEFT JOIN categories cat ON p.category_id = cat.id
		WHERE p.deleted_at IS NULL AND p.is_active = true
		GROUP BY p.id, p.sku, p.name_en, cat.name_en
		HAVING quantity_sold > 0 OR total_sales > 0
		ORDER BY total_sales DESC
	`

	var prods []map[string]interface{}
	if err := rh.db.Raw(query, fromDate, toDate, fromDate, toDate, fromDate, toDate).Scan(&prods).Error; err != nil {
		return ResponseError(c, err)
	}

	// Calculate totals
	var totalQuantity float64
	var totalSales float64
	for _, prod := range prods {
		if v, ok := prod["quantity_sold"].(float64); ok {
			totalQuantity += v
		}
		if v, ok := prod["total_sales"].(float64); ok {
			totalSales += v
		}
	}

	summary := map[string]interface{}{
		"total_quantity_sold": totalQuantity,
		"total_sales":         totalSales,
		"total_products":      len(prods),
	}

	result := map[string]interface{}{
		"from_date": fromDate,
		"to_date":   toDate,
		"products":  prods,
		"summary":   summary,
	}

	return ResponseOK(c, result, "data")
}
