package handlers

import (
	"database/sql"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
)

const reportDateLayout = "2006-01-02"

// Per-invoice outstanding balance: total minus payments minus approved sales returns.
const salesInvoiceBalanceExpr = `(si.total_amount - si.paid_amount - COALESCE((
	SELECT SUM(cn.total_amount) FROM credit_notes cn
	WHERE cn.sales_invoice_id = si.id AND cn.type = 'sales' AND cn.status = 'approved' AND cn.deleted_at IS NULL
), 0))`

// Money received from customers: payments on live sales invoices plus unallocated customer receipts.
const collectionsFrom = `
	FROM payments p
	LEFT JOIN sales_invoices si ON p.invoice_id = si.id AND p.invoice_type = 'sales'
	WHERE (
		(p.invoice_type = 'sales' AND si.id IS NOT NULL AND si.deleted_at IS NULL AND si.status <> 'draft')
		OR ((p.invoice_id IS NULL OR p.invoice_id = 0) AND p.customer_id IS NOT NULL AND p.vendor_id IS NULL)
	)`

// salesScope returns the filter every sales metric shares: live (non-deleted,
// non-draft) invoices, optionally one location, and only the caller's own
// invoices when the caller is a sales rep.
func salesScope(user models.User, locationID string) (string, []interface{}) {
	where := " AND si.deleted_at IS NULL AND si.status <> 'draft'"
	var args []interface{}
	if locationID != "" {
		where += " AND si.location_id = ?"
		args = append(args, locationID)
	}
	if user.Role == "sales" {
		where += " AND si.created_by = ?"
		args = append(args, user.ID)
	}
	return where, args
}

// returnsScope mirrors salesScope for approved sales credit notes, attributing
// a return to the rep/location of its original invoice when there is one.
func returnsScope(user models.User, locationID string) (string, []interface{}) {
	where := " AND cn.type = 'sales' AND cn.status = 'approved' AND cn.deleted_at IS NULL"
	var args []interface{}
	if locationID != "" {
		where += " AND COALESCE(si.location_id, cn.location_id) = ?"
		args = append(args, locationID)
	}
	if user.Role == "sales" {
		where += " AND COALESCE(si.created_by, cn.created_by) = ?"
		args = append(args, user.ID)
	}
	return where, args
}

func collectionsScope(user models.User, locationID string) (string, []interface{}) {
	var where string
	var args []interface{}
	if locationID != "" {
		where += " AND si.location_id = ?"
		args = append(args, locationID)
	}
	if user.Role == "sales" {
		where += " AND p.created_by = ?"
		args = append(args, user.ID)
	}
	return where, args
}

func joinArgs(parts ...[]interface{}) []interface{} {
	var out []interface{}
	for _, p := range parts {
		out = append(out, p...)
	}
	return out
}

// scalar runs a single-value aggregate query. Callers wrap aggregates in COALESCE.
func (rh *ReportHandler) scalar(query string, args ...interface{}) float64 {
	var v sql.NullFloat64
	if err := rh.db.Raw(query, args...).Row().Scan(&v); err != nil {
		return 0
	}
	return v.Float64
}

type periodSales struct {
	Sales    float64
	Invoices float64
	Returns  float64
	COGS     float64
}

func (p periodSales) netSales() float64    { return p.Sales - p.Returns }
func (p periodSales) grossProfit() float64 { return p.netSales() - p.COGS }

// salesForPeriod computes sales, returns and net cost of goods for an inclusive date range.
func (rh *ReportHandler) salesForPeriod(user models.User, locationID, from, to string) periodSales {
	sw, sa := salesScope(user, locationID)
	rw, ra := returnsScope(user, locationID)
	var p periodSales

	p.Sales = rh.scalar(`SELECT COALESCE(SUM(si.total_amount), 0) FROM sales_invoices si
		WHERE DATE(si.created_at) BETWEEN ? AND ?`+sw, joinArgs([]interface{}{from, to}, sa)...)
	p.Invoices = rh.scalar(`SELECT COUNT(*) FROM sales_invoices si
		WHERE DATE(si.created_at) BETWEEN ? AND ?`+sw, joinArgs([]interface{}{from, to}, sa)...)
	p.Returns = rh.scalar(`SELECT COALESCE(SUM(cn.total_amount), 0) FROM credit_notes cn
		LEFT JOIN sales_invoices si ON cn.sales_invoice_id = si.id
		WHERE DATE(cn.credit_note_date) BETWEEN ? AND ?`+rw, joinArgs([]interface{}{from, to}, ra)...)
	cogs := rh.scalar(`SELECT COALESCE(SUM(sii.quantity * pr.cost_price), 0) FROM sales_invoice_items sii
		JOIN sales_invoices si ON sii.invoice_id = si.id
		JOIN products pr ON sii.product_id = pr.id
		WHERE DATE(si.created_at) BETWEEN ? AND ?`+sw, joinArgs([]interface{}{from, to}, sa)...)
	cogsReturns := rh.scalar(`SELECT COALESCE(SUM(cni.quantity * pr.cost_price), 0) FROM credit_note_items cni
		JOIN credit_notes cn ON cni.credit_note_id = cn.id
		LEFT JOIN sales_invoices si ON cn.sales_invoice_id = si.id
		JOIN products pr ON cni.product_id = pr.id
		WHERE DATE(cn.credit_note_date) BETWEEN ? AND ?`+rw, joinArgs([]interface{}{from, to}, ra)...)
	p.COGS = cogs - cogsReturns
	return p
}

func (rh *ReportHandler) collectionsForPeriod(user models.User, locationID, from, to string) float64 {
	cw, ca := collectionsScope(user, locationID)
	return rh.scalar(`SELECT COALESCE(SUM(p.amount), 0)`+collectionsFrom+`
		AND DATE(p.created_at) BETWEEN ? AND ?`+cw, joinArgs([]interface{}{from, to}, ca)...)
}

type dashboardChartPoint struct {
	Date        string  `json:"date"`
	Sales       float64 `json:"sales"`
	Collections float64 `json:"collections"`
}

type dashboardRankRow struct {
	ID       uint    `json:"id" gorm:"column:id"`
	Name     string  `json:"name" gorm:"column:name"`
	Quantity float64 `json:"quantity" gorm:"column:quantity"`
	Invoices int64   `json:"invoices" gorm:"column:invoices"`
	Total    float64 `json:"total" gorm:"column:total"`
}

type dashboardRecentInvoice struct {
	ID            uint    `json:"id" gorm:"column:id"`
	InvoiceNumber string  `json:"invoice_number" gorm:"column:invoice_number"`
	CustomerName  string  `json:"customer_name" gorm:"column:customer_name"`
	TotalAmount   float64 `json:"total_amount" gorm:"column:total_amount"`
	PaidAmount    float64 `json:"paid_amount" gorm:"column:paid_amount"`
	PaymentStatus string  `json:"payment_status" gorm:"column:payment_status"`
	CreatedAt     string  `json:"created_at" gorm:"column:created_at"`
}

type dashboardLowStockRow struct {
	ProductID    uint    `json:"product_id" gorm:"column:product_id"`
	Name         string  `json:"name" gorm:"column:name"`
	LocationName string  `json:"location_name" gorm:"column:location_name"`
	Quantity     float64 `json:"quantity" gorm:"column:quantity"`
	MinLevel     float64 `json:"min_level" gorm:"column:min_level"`
}

// Matches the Low Stock page: below the product's minimum, or 10 when none is set.
const lowStockCondition = `s.quantity < (CASE WHEN p.min_stock_level > 0 THEN p.min_stock_level ELSE 10 END)`

func (rh *ReportHandler) DashboardReportHandler(c echo.Context) error {
	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	isSales := user.Role == "sales"
	locationID := c.QueryParam("location_id")

	now := time.Now()
	today := now.Format(reportDateLayout)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	// Same number of days into last month, so month-to-date comparisons are fair.
	lastMonthStart := monthStart.AddDate(0, -1, 0)
	lastMonthSameDay := lastMonthStart.AddDate(0, 0, now.Day()-1)
	if lastMonthSameDay.After(monthStart.AddDate(0, 0, -1)) {
		lastMonthSameDay = monthStart.AddDate(0, 0, -1)
	}
	ms, lms, lmd := monthStart.Format(reportDateLayout), lastMonthStart.Format(reportDateLayout), lastMonthSameDay.Format(reportDateLayout)

	sw, sa := salesScope(user, locationID)
	d := make(map[string]interface{})

	// --- Sales performance -------------------------------------------------
	thisMonth := rh.salesForPeriod(user, locationID, ms, today)
	lastMonth := rh.salesForPeriod(user, locationID, lms, lmd)
	todaySales := rh.salesForPeriod(user, locationID, today, today)

	d["month_sales"] = thisMonth.Sales
	d["month_returns"] = thisMonth.Returns
	d["month_net_sales"] = thisMonth.netSales()
	d["month_invoices"] = thisMonth.Invoices
	d["month_gross_profit"] = thisMonth.grossProfit()
	d["last_month_net_sales"] = lastMonth.netSales()
	d["last_month_gross_profit"] = lastMonth.grossProfit()
	d["last_month_invoices"] = lastMonth.Invoices
	avgInvoice := 0.0
	if thisMonth.Invoices > 0 {
		avgInvoice = thisMonth.Sales / thisMonth.Invoices
	}
	d["avg_invoice_value"] = avgInvoice
	d["today_sales_total"] = todaySales.Sales
	d["today_sales_count"] = todaySales.Invoices

	// --- Cash ---------------------------------------------------------------
	d["today_collections"] = rh.collectionsForPeriod(user, locationID, today, today)
	d["monthly_collections"] = rh.collectionsForPeriod(user, locationID, ms, today)
	d["last_month_collections"] = rh.collectionsForPeriod(user, locationID, lms, lmd)

	if !isSales {
		expenses := rh.scalar(`SELECT COALESCE(SUM(amount), 0) FROM expenses
			WHERE deleted_at IS NULL AND DATE(expense_date) BETWEEN ? AND ?`, ms, today)
		d["month_expenses"] = expenses
		d["month_net_profit"] = thisMonth.grossProfit() - expenses
	}

	// --- Receivables (only positive balances, so overpaid invoices don't hide debt) ---
	var aging struct {
		Total     float64 `gorm:"column:total"`
		Days0_15  float64 `gorm:"column:days_0_15"`
		Days16_30 float64 `gorm:"column:days_16_30"`
		Days31_45 float64 `gorm:"column:days_31_45"`
		Over45    float64 `gorm:"column:days_over_45"`
		Customers int64   `gorm:"column:customers"`
	}
	rh.db.Raw(`
		SELECT
			COALESCE(SUM(b.balance), 0) as total,
			COALESCE(SUM(CASE WHEN b.age <= 15 THEN b.balance END), 0) as days_0_15,
			COALESCE(SUM(CASE WHEN b.age BETWEEN 16 AND 30 THEN b.balance END), 0) as days_16_30,
			COALESCE(SUM(CASE WHEN b.age BETWEEN 31 AND 45 THEN b.balance END), 0) as days_31_45,
			COALESCE(SUM(CASE WHEN b.age > 45 THEN b.balance END), 0) as days_over_45,
			COUNT(DISTINCT b.customer_id) as customers
		FROM (
			SELECT si.customer_id, DATEDIFF(?, si.created_at) as age, `+salesInvoiceBalanceExpr+` as balance
			FROM sales_invoices si WHERE 1=1`+sw+`
		) b
		WHERE b.balance > 0.009
	`, joinArgs([]interface{}{today}, sa)...).Scan(&aging)
	d["pending_payments"] = aging.Total
	d["receivables_aging"] = map[string]float64{
		"days_0_15":    aging.Days0_15,
		"days_16_30":   aging.Days16_30,
		"days_31_45":   aging.Days31_45,
		"days_over_45": aging.Over45,
	}
	d["receivables_customers"] = aging.Customers

	payables := 0.0
	if !isSales {
		payables = rh.scalar(`
			SELECT COALESCE(SUM(b.balance), 0) FROM (
				SELECT (pi.total_amount - pi.paid_amount - COALESCE((
					SELECT SUM(cn.total_amount) FROM credit_notes cn
					WHERE cn.purchase_invoice_id = pi.id AND cn.type = 'purchase' AND cn.status = 'approved' AND cn.deleted_at IS NULL
				), 0)) as balance
				FROM purchase_invoices pi
				WHERE pi.deleted_at IS NULL AND pi.status <> 'draft'
			) b WHERE b.balance > 0.009`)
	}
	d["payables"] = payables

	// --- Inventory -----------------------------------------------------------
	stockWhere := " AND p.deleted_at IS NULL AND p.is_active = true"
	var stockArgs []interface{}
	if locationID != "" {
		stockWhere += " AND s.location_id = ?"
		stockArgs = append(stockArgs, locationID)
	} else if isSales && user.LocationID != nil {
		stockWhere += " AND s.location_id = ?"
		stockArgs = append(stockArgs, *user.LocationID)
	}
	d["inventory_value"] = rh.scalar(`SELECT COALESCE(SUM(GREATEST(s.quantity, 0) * p.cost_price), 0)
		FROM stocks s JOIN products p ON s.product_id = p.id WHERE 1=1`+stockWhere, stockArgs...)
	d["inventory_retail_value"] = rh.scalar(`SELECT COALESCE(SUM(GREATEST(s.quantity, 0) * p.unit_price), 0)
		FROM stocks s JOIN products p ON s.product_id = p.id WHERE 1=1`+stockWhere, stockArgs...)
	d["low_stock_count"] = rh.scalar(`SELECT COUNT(DISTINCT s.product_id)
		FROM stocks s JOIN products p ON s.product_id = p.id WHERE `+lowStockCondition+stockWhere, stockArgs...)
	d["out_of_stock_count"] = rh.scalar(`SELECT COUNT(DISTINCT s.product_id)
		FROM stocks s JOIN products p ON s.product_id = p.id WHERE s.quantity <= 0`+stockWhere, stockArgs...)

	lowStock := []dashboardLowStockRow{}
	rh.db.Raw(`
		SELECT p.id as product_id, p.name_en as name, l.name as location_name, s.quantity,
			(CASE WHEN p.min_stock_level > 0 THEN p.min_stock_level ELSE 10 END) as min_level
		FROM stocks s
		JOIN products p ON s.product_id = p.id
		JOIN locations l ON s.location_id = l.id
		WHERE `+lowStockCondition+stockWhere+`
		ORDER BY s.quantity ASC, p.name_en
		LIMIT 6`, stockArgs...).Scan(&lowStock)
	d["low_stock_items"] = lowStock

	var totalProducts, activeLocations int64
	rh.db.Table("products").Where("is_active = ? AND deleted_at IS NULL", true).Count(&totalProducts)
	rh.db.Table("locations").Where("is_active = ? AND deleted_at IS NULL", true).Count(&activeLocations)
	d["total_products"] = totalProducts
	d["active_locations"] = activeLocations

	// --- 30-day trend, with empty days filled in ---------------------------------
	chartStart := now.AddDate(0, 0, -29).Format(reportDateLayout)
	type dayTotal struct {
		Day   string  `gorm:"column:day"`
		Total float64 `gorm:"column:total"`
	}
	var salesDays, collectionDays []dayTotal
	rh.db.Raw(`SELECT DATE_FORMAT(si.created_at, '%Y-%m-%d') as day, SUM(si.total_amount) as total
		FROM sales_invoices si WHERE DATE(si.created_at) BETWEEN ? AND ?`+sw+`
		GROUP BY day`, joinArgs([]interface{}{chartStart, today}, sa)...).Scan(&salesDays)
	cw, ca := collectionsScope(user, locationID)
	rh.db.Raw(`SELECT DATE_FORMAT(p.created_at, '%Y-%m-%d') as day, SUM(p.amount) as total`+collectionsFrom+`
		AND DATE(p.created_at) BETWEEN ? AND ?`+cw+`
		GROUP BY day`, joinArgs([]interface{}{chartStart, today}, ca)...).Scan(&collectionDays)
	byDay := map[string]*dashboardChartPoint{}
	chart := make([]dashboardChartPoint, 30)
	for i := 0; i < 30; i++ {
		day := now.AddDate(0, 0, i-29).Format(reportDateLayout)
		chart[i] = dashboardChartPoint{Date: day}
		byDay[day] = &chart[i]
	}
	for _, r := range salesDays {
		if pt, ok := byDay[r.Day]; ok {
			pt.Sales = r.Total
		}
	}
	for _, r := range collectionDays {
		if pt, ok := byDay[r.Day]; ok {
			pt.Collections = r.Total
		}
	}
	d["sales_chart"] = chart

	// --- This month's leaders ---------------------------------------------------
	monthArgs := joinArgs([]interface{}{ms, today}, sa)

	topProducts := []dashboardRankRow{}
	rh.db.Raw(`SELECT pr.id, pr.name_en as name, SUM(sii.quantity) as quantity,
			COUNT(DISTINCT si.id) as invoices, SUM(sii.total) as total
		FROM sales_invoice_items sii
		JOIN sales_invoices si ON sii.invoice_id = si.id
		JOIN products pr ON sii.product_id = pr.id
		WHERE DATE(si.created_at) BETWEEN ? AND ?`+sw+`
		GROUP BY pr.id, pr.name_en ORDER BY total DESC LIMIT 5`, monthArgs...).Scan(&topProducts)
	d["top_products"] = topProducts

	topCustomers := []dashboardRankRow{}
	rh.db.Raw(`SELECT COALESCE(c.id, 0) as id, COALESCE(c.name, 'Walk-in Customers') as name,
			COUNT(*) as invoices, SUM(si.total_amount) as total
		FROM sales_invoices si
		LEFT JOIN customers c ON si.customer_id = c.id
		WHERE DATE(si.created_at) BETWEEN ? AND ?`+sw+`
		GROUP BY c.id, c.name ORDER BY total DESC LIMIT 5`, monthArgs...).Scan(&topCustomers)
	d["top_customers"] = topCustomers

	if !isSales {
		topReps := []dashboardRankRow{}
		rh.db.Raw(`SELECT u.id, COALESCE(NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), u.email) as name,
				COUNT(*) as invoices, SUM(si.total_amount) as total
			FROM sales_invoices si
			JOIN users u ON si.created_by = u.id
			WHERE DATE(si.created_at) BETWEEN ? AND ?`+sw+`
			GROUP BY u.id, u.first_name, u.last_name, u.email ORDER BY total DESC LIMIT 5`, monthArgs...).Scan(&topReps)
		d["top_reps"] = topReps

		byLocation := []dashboardRankRow{}
		rh.db.Raw(`SELECT l.id, l.name, COUNT(*) as invoices, SUM(si.total_amount) as total
			FROM sales_invoices si
			JOIN locations l ON si.location_id = l.id
			WHERE DATE(si.created_at) BETWEEN ? AND ?`+sw+`
			GROUP BY l.id, l.name ORDER BY total DESC`, monthArgs...).Scan(&byLocation)
		d["sales_by_location"] = byLocation
	}

	recent := []dashboardRecentInvoice{}
	rh.db.Raw(`SELECT si.id, si.invoice_number, COALESCE(c.name, 'Walk-in Customer') as customer_name,
			si.total_amount, si.paid_amount, si.payment_status,
			DATE_FORMAT(si.created_at, '%Y-%m-%d %H:%i') as created_at
		FROM sales_invoices si
		LEFT JOIN customers c ON si.customer_id = c.id
		WHERE 1=1`+sw+`
		ORDER BY si.created_at DESC LIMIT 6`, sa...).Scan(&recent)
	d["recent_invoices"] = recent

	d["period"] = map[string]string{
		"month_start":          ms,
		"today":                today,
		"last_month_start":     lms,
		"last_month_same_day":  lmd,
	}

	return ResponseOK(c, d, "data")
}
