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
