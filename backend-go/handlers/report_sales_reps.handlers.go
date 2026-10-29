package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

// salesRepRow is one rep's performance for a period. Sales are attributed by
// invoice creator; returns follow their original invoice; collections are the
// payments the rep recorded (cash the rep took in and must hand over).
type salesRepRow struct {
	UserID                uint    `json:"user_id" gorm:"column:user_id"`
	Name                  string  `json:"name" gorm:"column:name"`
	Email                 string  `json:"email" gorm:"column:email"`
	Phone                 string  `json:"phone" gorm:"column:phone"`
	Role                  string  `json:"role" gorm:"column:role"`
	LocationName          string  `json:"location_name" gorm:"column:location_name"`
	CommissionRate        float64 `json:"commission_rate" gorm:"column:commission_rate"`
	Invoices              int64   `json:"invoices"`
	Customers             int64   `json:"customers"`
	ItemsSold             float64 `json:"items_sold"`
	GrossSales            float64 `json:"gross_sales"`
	Discounts             float64 `json:"discounts"`
	Returns               float64 `json:"returns"`
	NetSales              float64 `json:"net_sales"`
	COGS                  float64 `json:"cogs"`
	GrossProfit           float64 `json:"gross_profit"`
	MarginPercent         float64 `json:"margin_percent"`
	Collected             float64 `json:"collected"`
	PaidOnInvoices        float64 `json:"paid_on_invoices"`
	Outstanding           float64 `json:"outstanding"`
	CommissionOnSales     float64 `json:"commission_on_sales"`
	CommissionOnCollected float64 `json:"commission_on_collected"`
}

type repAgg struct {
	UserID uint    `gorm:"column:user_id"`
	A      float64 `gorm:"column:a"`
	B      float64 `gorm:"column:b"`
	C      float64 `gorm:"column:c"`
	D      float64 `gorm:"column:d"`
	E      float64 `gorm:"column:e"`
}

type repFilter struct {
	from, to, locationID string
	userID               uint // 0 = all reps
}

func (f repFilter) sales() (string, []interface{}) {
	where := " AND si.deleted_at IS NULL AND si.status <> 'draft' AND DATE(si.created_at) BETWEEN ? AND ?"
	args := []interface{}{f.from, f.to}
	if f.locationID != "" {
		where += " AND si.location_id = ?"
		args = append(args, f.locationID)
	}
	if f.userID != 0 {
		where += " AND si.created_by = ?"
		args = append(args, f.userID)
	}
	return where, args
}

func (f repFilter) returns() (string, []interface{}) {
	where := " AND cn.type = 'sales' AND cn.status = 'approved' AND cn.deleted_at IS NULL AND DATE(cn.credit_note_date) BETWEEN ? AND ?"
	args := []interface{}{f.from, f.to}
	if f.locationID != "" {
		where += " AND COALESCE(si.location_id, cn.location_id) = ?"
		args = append(args, f.locationID)
	}
	if f.userID != 0 {
		where += " AND COALESCE(si.created_by, cn.created_by) = ?"
		args = append(args, f.userID)
	}
	return where, args
}

func (f repFilter) collections() (string, []interface{}) {
	where := " AND DATE(p.created_at) BETWEEN ? AND ?"
	args := []interface{}{f.from, f.to}
	if f.locationID != "" {
		where += " AND si.location_id = ?"
		args = append(args, f.locationID)
	}
	if f.userID != 0 {
		where += " AND p.created_by = ?"
		args = append(args, f.userID)
	}
	return where, args
}

func repFilterFromRequest(c echo.Context) repFilter {
	f := repFilter{
		from:       c.QueryParam("from_date"),
		to:         c.QueryParam("to_date"),
		locationID: c.QueryParam("location_id"),
	}
	now := time.Now()
	if f.from == "" {
		f.from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format(reportDateLayout)
	}
	if f.to == "" {
		f.to = now.Format(reportDateLayout)
	}
	return f
}

func (rh *ReportHandler) salesRepSummaries(f repFilter) ([]salesRepRow, error) {
	sw, sa := f.sales()

	// Everyone with the sales role, plus anyone else who issued invoices in the period.
	var reps []salesRepRow
	repQuery := `
		SELECT u.id as user_id,
			COALESCE(NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), u.email) as name,
			u.email, COALESCE(u.phone, '') as phone, u.role,
			COALESCE(l.name, '') as location_name,
			COALESCE(u.commission_rate, 0) as commission_rate
		FROM users u
		LEFT JOIN locations l ON u.location_id = l.id
		WHERE `
	var repArgs []interface{}
	if f.userID != 0 {
		repQuery += "u.id = ?"
		repArgs = append(repArgs, f.userID)
	} else {
		repQuery += "u.role = 'sales' OR u.id IN (SELECT DISTINCT si.created_by FROM sales_invoices si WHERE 1=1" + sw + ")"
		repArgs = append(repArgs, sa...)
	}
	if err := rh.db.Raw(repQuery, repArgs...).Scan(&reps).Error; err != nil {
		return nil, err
	}

	byUser := make(map[uint]*salesRepRow, len(reps))
	for i := range reps {
		byUser[reps[i].UserID] = &reps[i]
	}
	apply := func(query string, args []interface{}, fn func(r *salesRepRow, a repAgg)) error {
		var rows []repAgg
		if err := rh.db.Raw(query, args...).Scan(&rows).Error; err != nil {
			return err
		}
		for _, a := range rows {
			if r, ok := byUser[a.UserID]; ok {
				fn(r, a)
			}
		}
		return nil
	}

	if err := apply(`
		SELECT si.created_by as user_id,
			COUNT(*) as a,
			COALESCE(SUM(si.total_amount), 0) as b,
			COALESCE(SUM(si.discount_amount), 0) as c,
			COALESCE(SUM(si.paid_amount), 0) as d,
			COUNT(DISTINCT si.customer_id) as e
		FROM sales_invoices si WHERE 1=1`+sw+`
		GROUP BY si.created_by`, sa, func(r *salesRepRow, a repAgg) {
		r.Invoices, r.GrossSales, r.Discounts, r.PaidOnInvoices, r.Customers = int64(a.A), a.B, a.C, a.D, int64(a.E)
	}); err != nil {
		return nil, err
	}

	if err := apply(`
		SELECT si.created_by as user_id, COALESCE(SUM(GREATEST(`+salesInvoiceBalanceExpr+`, 0)), 0) as a
		FROM sales_invoices si WHERE 1=1`+sw+`
		GROUP BY si.created_by`, sa, func(r *salesRepRow, a repAgg) {
		r.Outstanding = a.A
	}); err != nil {
		return nil, err
	}

	if err := apply(`
		SELECT si.created_by as user_id,
			COALESCE(SUM(sii.quantity), 0) as a,
			COALESCE(SUM(sii.quantity * pr.cost_price), 0) as b
		FROM sales_invoice_items sii
		JOIN sales_invoices si ON sii.invoice_id = si.id
		JOIN products pr ON sii.product_id = pr.id
		WHERE 1=1`+sw+`
		GROUP BY si.created_by`, sa, func(r *salesRepRow, a repAgg) {
		r.ItemsSold, r.COGS = a.A, a.B
	}); err != nil {
		return nil, err
	}

	rw, ra := f.returns()
	if err := apply(`
		SELECT COALESCE(si.created_by, cn.created_by) as user_id,
			COALESCE(SUM(cn.total_amount), 0) as a
		FROM credit_notes cn
		LEFT JOIN sales_invoices si ON cn.sales_invoice_id = si.id
		WHERE 1=1`+rw+`
		GROUP BY COALESCE(si.created_by, cn.created_by)`, ra, func(r *salesRepRow, a repAgg) {
		r.Returns = a.A
	}); err != nil {
		return nil, err
	}
	if err := apply(`
		SELECT COALESCE(si.created_by, cn.created_by) as user_id,
			COALESCE(SUM(cni.quantity), 0) as a,
			COALESCE(SUM(cni.quantity * pr.cost_price), 0) as b
		FROM credit_note_items cni
		JOIN credit_notes cn ON cni.credit_note_id = cn.id
		LEFT JOIN sales_invoices si ON cn.sales_invoice_id = si.id
		JOIN products pr ON cni.product_id = pr.id
		WHERE 1=1`+rw+`
		GROUP BY COALESCE(si.created_by, cn.created_by)`, ra, func(r *salesRepRow, a repAgg) {
		r.ItemsSold -= a.A
		r.COGS -= a.B
	}); err != nil {
		return nil, err
	}

	cw, ca := f.collections()
	if err := apply(`SELECT p.created_by as user_id, COALESCE(SUM(p.amount), 0) as a`+collectionsFrom+cw+`
		GROUP BY p.created_by`, ca, func(r *salesRepRow, a repAgg) {
		r.Collected = a.A
	}); err != nil {
		return nil, err
	}

	for i := range reps {
		r := &reps[i]
		r.NetSales = r.GrossSales - r.Returns
		r.GrossProfit = r.NetSales - r.COGS
		if r.NetSales > 0 {
			r.MarginPercent = r.GrossProfit / r.NetSales * 100
		}
		r.CommissionOnSales = r.NetSales * r.CommissionRate / 100
		r.CommissionOnCollected = r.Collected * r.CommissionRate / 100
	}
	return reps, nil
}

// SalesRepsReportHandler lists every sales rep's performance and commission for a period.
func (rh *ReportHandler) SalesRepsReportHandler(c echo.Context) error {
	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	f := repFilterFromRequest(c)
	if user.Role == "sales" {
		f.userID = user.ID
	}

	reps, err := rh.salesRepSummaries(f)
	if err != nil {
		return ResponseError(c, err)
	}

	var totals salesRepRow
	for _, r := range reps {
		totals.Invoices += r.Invoices
		totals.ItemsSold += r.ItemsSold
		totals.GrossSales += r.GrossSales
		totals.Discounts += r.Discounts
		totals.Returns += r.Returns
		totals.NetSales += r.NetSales
		totals.COGS += r.COGS
		totals.GrossProfit += r.GrossProfit
		totals.Collected += r.Collected
		totals.Outstanding += r.Outstanding
		totals.CommissionOnSales += r.CommissionOnSales
		totals.CommissionOnCollected += r.CommissionOnCollected
	}
	if totals.NetSales > 0 {
		totals.MarginPercent = totals.GrossProfit / totals.NetSales * 100
	}

	return ResponseOK(c, map[string]interface{}{
		"from_date": f.from,
		"to_date":   f.to,
		"reps":      reps,
		"summary":   totals,
	}, "data")
}

type repBreakdownRow struct {
	ID          uint    `json:"id" gorm:"column:id"`
	Name        string  `json:"name" gorm:"column:name"`
	SKU         string  `json:"sku,omitempty" gorm:"column:sku"`
	Invoices    int64   `json:"invoices" gorm:"column:invoices"`
	Quantity    float64 `json:"quantity" gorm:"column:quantity"`
	Returned    float64 `json:"returned" gorm:"column:returned"`
	Total       float64 `json:"total" gorm:"column:total"`
	Cost        float64 `json:"cost" gorm:"column:cost"`
	Paid        float64 `json:"paid" gorm:"column:paid"`
	Outstanding float64 `json:"outstanding" gorm:"column:outstanding"`
}

type repInvoiceRow struct {
	ID            uint    `json:"id" gorm:"column:id"`
	InvoiceNumber string  `json:"invoice_number" gorm:"column:invoice_number"`
	Date          string  `json:"date" gorm:"column:date"`
	CustomerName  string  `json:"customer_name" gorm:"column:customer_name"`
	LocationName  string  `json:"location_name" gorm:"column:location_name"`
	TotalAmount   float64 `json:"total_amount" gorm:"column:total_amount"`
	PaidAmount    float64 `json:"paid_amount" gorm:"column:paid_amount"`
	Balance       float64 `json:"balance" gorm:"column:balance"`
	PaymentStatus string  `json:"payment_status" gorm:"column:payment_status"`
}

type repPaymentRow struct {
	ID            uint    `json:"id" gorm:"column:id"`
	Date          string  `json:"date" gorm:"column:date"`
	CustomerName  string  `json:"customer_name" gorm:"column:customer_name"`
	InvoiceNumber string  `json:"invoice_number" gorm:"column:invoice_number"`
	Method        string  `json:"payment_method" gorm:"column:payment_method"`
	Amount        float64 `json:"amount" gorm:"column:amount"`
}

// SalesRepDetailHandler breaks one rep's period down by product, customer,
// location, day, payment method and invoice.
func (rh *ReportHandler) SalesRepDetailHandler(c echo.Context) error {
	user, err := GetUserContext(c)
	if err != nil {
		return ResponseError(c, err)
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		return ResponseError(c, errors.New("invalid sales rep id"))
	}
	if user.Role == "sales" && uint(id) != user.ID {
		return c.JSON(http.StatusForbidden, map[string]interface{}{"ok": false, "error": "forbidden"})
	}

	f := repFilterFromRequest(c)
	f.userID = uint(id)

	reps, err := rh.salesRepSummaries(f)
	if err != nil {
		return ResponseError(c, err)
	}
	if len(reps) == 0 {
		return c.JSON(http.StatusNotFound, map[string]interface{}{"ok": false, "error": "sales rep not found"})
	}

	sw, sa := f.sales()
	rw, ra := f.returns()
	cw, ca := f.collections()

	products := []repBreakdownRow{}
	if err := rh.db.Raw(`
		SELECT pr.id, pr.name_en as name, pr.sku,
			COALESCE(s.invoices, 0) as invoices,
			COALESCE(s.quantity, 0) as quantity,
			COALESCE(r.returned, 0) as returned,
			COALESCE(s.total, 0) - COALESCE(r.returned_total, 0) as total,
			(COALESCE(s.quantity, 0) - COALESCE(r.returned, 0)) * pr.cost_price as cost
		FROM products pr
		LEFT JOIN (
			SELECT sii.product_id, COUNT(DISTINCT si.id) as invoices, SUM(sii.quantity) as quantity, SUM(sii.total) as total
			FROM sales_invoice_items sii JOIN sales_invoices si ON sii.invoice_id = si.id
			WHERE 1=1`+sw+` GROUP BY sii.product_id
		) s ON s.product_id = pr.id
		LEFT JOIN (
			SELECT cni.product_id, SUM(cni.quantity) as returned, SUM(cni.total) as returned_total
			FROM credit_note_items cni
			JOIN credit_notes cn ON cni.credit_note_id = cn.id
			LEFT JOIN sales_invoices si ON cn.sales_invoice_id = si.id
			WHERE 1=1`+rw+` GROUP BY cni.product_id
		) r ON r.product_id = pr.id
		WHERE s.product_id IS NOT NULL OR r.product_id IS NOT NULL
		ORDER BY total DESC`, joinArgs(sa, ra)...).Scan(&products).Error; err != nil {
		return ResponseError(c, err)
	}

	customers := []repBreakdownRow{}
	if err := rh.db.Raw(`
		SELECT COALESCE(c.id, 0) as id, COALESCE(c.name, 'Walk-in Customers') as name,
			COUNT(*) as invoices,
			SUM(si.total_amount) as total,
			SUM(si.paid_amount) as paid,
			SUM(GREATEST(`+salesInvoiceBalanceExpr+`, 0)) as outstanding
		FROM sales_invoices si
		LEFT JOIN customers c ON si.customer_id = c.id
		WHERE 1=1`+sw+`
		GROUP BY c.id, c.name ORDER BY total DESC`, sa...).Scan(&customers).Error; err != nil {
		return ResponseError(c, err)
	}

	locations := []repBreakdownRow{}
	if err := rh.db.Raw(`
		SELECT l.id, l.name, COUNT(*) as invoices, SUM(si.total_amount) as total, SUM(si.paid_amount) as paid
		FROM sales_invoices si
		JOIN locations l ON si.location_id = l.id
		WHERE 1=1`+sw+`
		GROUP BY l.id, l.name ORDER BY total DESC`, sa...).Scan(&locations).Error; err != nil {
		return ResponseError(c, err)
	}

	type methodRow struct {
		Method string  `json:"payment_method" gorm:"column:method"`
		Count  int64   `json:"count" gorm:"column:count"`
		Amount float64 `json:"amount" gorm:"column:amount"`
	}
	methods := []methodRow{}
	if err := rh.db.Raw(`SELECT COALESCE(NULLIF(p.payment_method, ''), 'other') as method,
			COUNT(*) as count, SUM(p.amount) as amount`+collectionsFrom+cw+`
		GROUP BY method ORDER BY amount DESC`, ca...).Scan(&methods).Error; err != nil {
		return ResponseError(c, err)
	}

	invoices := []repInvoiceRow{}
	if err := rh.db.Raw(`
		SELECT si.id, si.invoice_number, DATE_FORMAT(si.created_at, '%Y-%m-%d %H:%i') as date,
			COALESCE(c.name, 'Walk-in Customer') as customer_name,
			COALESCE(l.name, '') as location_name,
			si.total_amount, si.paid_amount,
			GREATEST(`+salesInvoiceBalanceExpr+`, 0) as balance,
			si.payment_status
		FROM sales_invoices si
		LEFT JOIN customers c ON si.customer_id = c.id
		LEFT JOIN locations l ON si.location_id = l.id
		WHERE 1=1`+sw+`
		ORDER BY si.created_at DESC`, sa...).Scan(&invoices).Error; err != nil {
		return ResponseError(c, err)
	}

	payments := []repPaymentRow{}
	err = rh.db.Raw(`
		SELECT p.id, DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') as date,
			COALESCE((SELECT cu.name FROM customers cu WHERE cu.id = COALESCE(p.customer_id, si.customer_id)), '-') as customer_name,
			COALESCE(si.invoice_number, '-') as invoice_number,
			p.payment_method, p.amount
		`+collectionsFrom+cw+`
		ORDER BY p.created_at DESC`, ca...).Scan(&payments).Error
	if err != nil {
		return ResponseError(c, err)
	}

	// Trend over the period: daily buckets, or monthly once the range passes ~2 months.
	type dayTotal struct {
		Day   string  `gorm:"column:day"`
		Total float64 `gorm:"column:total"`
	}
	start, errFrom := time.Parse(reportDateLayout, f.from)
	end, errTo := time.Parse(reportDateLayout, f.to)
	validRange := errFrom == nil && errTo == nil && !end.Before(start)
	granularity, sqlFormat, goLayout := "day", "%Y-%m-%d", reportDateLayout
	if validRange && end.Sub(start) > 62*24*time.Hour {
		granularity, sqlFormat, goLayout = "month", "%Y-%m", "2006-01"
	}
	var salesDays, collectionDays []dayTotal
	rh.db.Raw(`SELECT DATE_FORMAT(si.created_at, '`+sqlFormat+`') as day, SUM(si.total_amount) as total
		FROM sales_invoices si WHERE 1=1`+sw+` GROUP BY day`, sa...).Scan(&salesDays)
	rh.db.Raw(`SELECT DATE_FORMAT(p.created_at, '`+sqlFormat+`') as day, SUM(p.amount) as total`+collectionsFrom+cw+`
		GROUP BY day`, ca...).Scan(&collectionDays)
	daily := []dashboardChartPoint{}
	if validRange {
		idx := map[string]int{}
		step := func(d time.Time) time.Time { return d.AddDate(0, 0, 1) }
		if granularity == "month" {
			start = time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, start.Location())
			step = func(d time.Time) time.Time { return d.AddDate(0, 1, 0) }
		}
		for d := start; !d.After(end); d = step(d) {
			idx[d.Format(goLayout)] = len(daily)
			daily = append(daily, dashboardChartPoint{Date: d.Format(goLayout)})
		}
		for _, r := range salesDays {
			if i, ok := idx[r.Day]; ok {
				daily[i].Sales = r.Total
			}
		}
		for _, r := range collectionDays {
			if i, ok := idx[r.Day]; ok {
				daily[i].Collections = r.Total
			}
		}
	}

	return ResponseOK(c, map[string]interface{}{
		"from_date":       f.from,
		"to_date":         f.to,
		"rep":             reps[0],
		"products":        products,
		"customers":       customers,
		"locations":       locations,
		"payment_methods": methods,
		"invoices":        invoices,
		"payments":        payments,
		"trend":           daily,
		"granularity":     granularity,
	}, "data")
}
