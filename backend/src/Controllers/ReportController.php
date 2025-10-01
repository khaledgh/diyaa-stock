<?php

namespace App\Controllers;

use App\Config\Database;
use App\Utils\Response;

class ReportController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function sales() {
        $vanId = $_GET['van_id'] ?? null;
        $fromDate = $_GET['from_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $toDate = $_GET['to_date'] ?? date('Y-m-d');

        $sql = "SELECT 
                    i.id,
                    i.invoice_number,
                    i.created_at,
                    i.total_amount,
                    i.paid_amount,
                    i.payment_status,
                    c.name as customer_name,
                    v.name as van_name,
                    u.full_name as created_by_name
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                LEFT JOIN vans v ON i.van_id = v.id
                LEFT JOIN users u ON i.created_by = u.id
                WHERE i.invoice_type = 'sales'
                AND DATE(i.created_at) BETWEEN ? AND ?";

        $params = [$fromDate, $toDate];

        if ($vanId) {
            $sql .= " AND i.van_id = ?";
            $params[] = $vanId;
        }

        $sql .= " ORDER BY i.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $sales = $stmt->fetchAll();

        // Calculate summary
        $summary = [
            'total_sales' => 0,
            'total_paid' => 0,
            'total_unpaid' => 0,
            'count' => count($sales)
        ];

        foreach ($sales as $sale) {
            $summary['total_sales'] += $sale['total_amount'];
            $summary['total_paid'] += $sale['paid_amount'];
        }

        $summary['total_unpaid'] = $summary['total_sales'] - $summary['total_paid'];

        Response::success([
            'sales' => $sales,
            'summary' => $summary
        ]);
    }

    public function stockMovements() {
        $productId = $_GET['product_id'] ?? null;
        $fromDate = $_GET['from_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $toDate = $_GET['to_date'] ?? date('Y-m-d');

        $sql = "SELECT 
                    sm.*,
                    p.name_en,
                    p.name_ar,
                    p.sku,
                    u.full_name as created_by_name
                FROM stock_movements sm
                JOIN products p ON sm.product_id = p.id
                LEFT JOIN users u ON sm.created_by = u.id
                WHERE DATE(sm.created_at) BETWEEN ? AND ?";

        $params = [$fromDate, $toDate];

        if ($productId) {
            $sql .= " AND sm.product_id = ?";
            $params[] = $productId;
        }

        $sql .= " ORDER BY sm.created_at DESC LIMIT 500";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $movements = $stmt->fetchAll();

        Response::success($movements);
    }

    public function receivables() {
        $sql = "SELECT 
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
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                LEFT JOIN vans v ON i.van_id = v.id
                WHERE i.invoice_type = 'sales'
                AND i.payment_status IN ('unpaid', 'partial')
                ORDER BY i.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $receivables = $stmt->fetchAll();

        // Calculate summary
        $summary = [
            'total_receivable' => 0,
            'count' => count($receivables)
        ];

        foreach ($receivables as $item) {
            $summary['total_receivable'] += $item['balance'];
        }

        Response::success([
            'receivables' => $receivables,
            'summary' => $summary
        ]);
    }

    public function productPerformance() {
        $fromDate = $_GET['from_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $toDate = $_GET['to_date'] ?? date('Y-m-d');

        $sql = "SELECT 
                    p.id,
                    p.sku,
                    p.name_en,
                    p.name_ar,
                    c.name_en as category_name,
                    SUM(ii.quantity) as total_sold,
                    SUM(ii.total) as total_revenue,
                    COUNT(DISTINCT i.id) as invoice_count
                FROM products p
                LEFT JOIN invoice_items ii ON p.id = ii.product_id
                LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.invoice_type = 'sales'
                    AND DATE(i.created_at) BETWEEN ? AND ?
                LEFT JOIN categories c ON p.category_id = c.id
                GROUP BY p.id
                ORDER BY total_sold DESC
                LIMIT 50";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$fromDate, $toDate]);
        $products = $stmt->fetchAll();

        Response::success($products);
    }

    public function dashboard() {
        // Total products
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM products WHERE is_active = 1");
        $totalProducts = $stmt->fetch()['count'];

        // Total warehouse stock value
        $stmt = $this->db->query("
            SELECT SUM(s.quantity * p.cost_price) as value
            FROM stock s
            JOIN products p ON s.product_id = p.id
            WHERE s.location_type = 'warehouse' AND s.location_id = 0
        ");
        $warehouseValue = $stmt->fetch()['value'] ?? 0;

        // Today's sales
        $stmt = $this->db->query("
            SELECT COUNT(*) as count, SUM(total_amount) as total
            FROM invoices
            WHERE invoice_type = 'sales' AND DATE(created_at) = CURDATE()
        ");
        $todaySales = $stmt->fetch();

        // Pending payments (Receivables from sales)
        $stmt = $this->db->query("
            SELECT SUM(total_amount - paid_amount) as total
            FROM invoices
            WHERE invoice_type = 'sales' AND payment_status IN ('unpaid', 'partial')
        ");
        $pendingPayments = $stmt->fetch()['total'] ?? 0;

        // Payables (Amount to pay for purchases)
        $stmt = $this->db->query("
            SELECT SUM(total_amount - paid_amount) as total
            FROM invoices
            WHERE invoice_type = 'purchase' AND payment_status IN ('unpaid', 'partial')
        ");
        $payables = $stmt->fetch()['total'] ?? 0;

        // Low stock products
        $stmt = $this->db->query("
            SELECT COUNT(*) as count
            FROM stock s
            JOIN products p ON s.product_id = p.id
            WHERE s.location_type = 'warehouse' 
            AND s.location_id = 0
            AND s.quantity <= p.min_stock_level
        ");
        $lowStockCount = $stmt->fetch()['count'];

        // Active vans
        $stmt = $this->db->query("SELECT COUNT(*) as count FROM vans WHERE is_active = 1");
        $activeVans = $stmt->fetch()['count'];

        // Recent sales chart (last 7 days)
        $stmt = $this->db->query("
            SELECT DATE(created_at) as date, SUM(total_amount) as total
            FROM invoices
            WHERE invoice_type = 'sales' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
        $salesChart = $stmt->fetchAll();

        Response::success([
            'total_products' => $totalProducts,
            'warehouse_value' => round($warehouseValue, 2),
            'today_sales_count' => $todaySales['count'],
            'today_sales_total' => round($todaySales['total'] ?? 0, 2),
            'pending_payments' => round($pendingPayments, 2),
            'payables' => round($payables, 2),
            'low_stock_count' => $lowStockCount,
            'active_vans' => $activeVans,
            'sales_chart' => $salesChart
        ]);
    }
}
