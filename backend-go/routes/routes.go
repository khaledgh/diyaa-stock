package routes

import (
	"github.com/gonext-tech/invoicing-system/backend/handlers"
	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/gonext-tech/invoicing-system/backend/services"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func SetupRoutes(e *echo.Echo, store *gorm.DB) {
	// Initialize services
	authService := services.NewAuthService(models.User{}, store)
	auth := handlers.NewAuthHandler(authService)

	// Public routes (no authentication required)
	e.POST("/api/login", auth.LoginHandler)

	// Protected routes (authentication required)
	apiGroup := e.Group("/api", auth.JWTMiddleware)

	// Auth routes
	apiGroup.GET("/me", auth.GetUserHandler)

	// Product routes - matches PHP: /api/products
	productService := services.NewProductServices(models.Product{}, store)
	productHandler := handlers.NewProductHandler(productService)
	apiGroup.GET("/products", productHandler.GetAllHandler)
	apiGroup.GET("/products/:id", productHandler.GetIDHandler)
	apiGroup.POST("/products", productHandler.CreateHandler)
	apiGroup.PUT("/products/:id", productHandler.UpdateHandler)
	apiGroup.DELETE("/products/:id", productHandler.Delete)

	// Category routes - matches PHP: /api/categories
	categoryService := services.NewCategoryService(models.Category{}, store)
	categoryHandler := handlers.NewCategoryHandler(categoryService)
	apiGroup.GET("/categories", categoryHandler.GetAllHandler)
	apiGroup.POST("/categories", categoryHandler.CreateHandler)
	apiGroup.PUT("/categories/:id", categoryHandler.UpdateHandler)
	apiGroup.DELETE("/categories/:id", categoryHandler.Delete)

	// Product Type routes - matches PHP: /api/product-types
	productTypeService := services.NewProductTypeServices(models.ProductType{}, store)
	productTypeHandler := handlers.NewProductTypeHandler(productTypeService)
	apiGroup.GET("/product-types", productTypeHandler.GetAllHandler)
	apiGroup.POST("/product-types", productTypeHandler.CreateHandler)
	apiGroup.PUT("/product-types/:id", productTypeHandler.UpdateHandler)
	apiGroup.DELETE("/product-types/:id", productTypeHandler.Delete)

	// Customer routes - matches PHP: /api/customers
	customerService := services.NewCustomerService(models.Customer{}, store)
	customerHandler := handlers.NewCustomerHandler(customerService)
	apiGroup.GET("/customers", customerHandler.GetAllHandler)
	apiGroup.GET("/customers/:id", customerHandler.GetIDHandler)
	apiGroup.POST("/customers", customerHandler.CreateHandler)
	apiGroup.PUT("/customers/:id", customerHandler.UpdateHandler)
	apiGroup.DELETE("/customers/:id", customerHandler.Delete)

	// Location routes - matches PHP: /api/locations
	locationService := services.NewLocationService(models.Location{}, store)
	locationHandler := handlers.NewLocationHandler(locationService)
	apiGroup.GET("/locations", locationHandler.GetAllHandler)
	apiGroup.GET("/locations/:id", locationHandler.GetIDHandler)
	apiGroup.POST("/locations", locationHandler.CreateHandler)
	apiGroup.PUT("/locations/:id", locationHandler.UpdateHandler)
	apiGroup.DELETE("/locations/:id", locationHandler.Delete)

	// Stock service for location stock endpoint
	stockService := services.NewStockService(models.Stock{}, store)
	stockHandler := handlers.NewStockHandler(stockService)
	apiGroup.GET("/locations/:id/stock", stockHandler.LocationStockHandler)

	// Employee routes - matches PHP: /api/employees
	employeeService := services.NewEmployeeService(models.Employee{}, store)
	employeeHandler := handlers.NewEmployeeHandler(employeeService)
	apiGroup.GET("/employees", employeeHandler.GetAllHandler)
	apiGroup.GET("/employees/:id", employeeHandler.GetIDHandler)
	apiGroup.POST("/employees", employeeHandler.CreateHandler)
	apiGroup.PUT("/employees/:id", employeeHandler.UpdateHandler)
	apiGroup.DELETE("/employees/:id", employeeHandler.Delete)

	// Van routes - matches PHP: /api/vans
	vanService := services.NewVanService(models.Van{}, store)
	vanHandler := handlers.NewVanHandler(vanService)
	apiGroup.GET("/vans", vanHandler.GetAllHandler)
	apiGroup.GET("/vans/:id", vanHandler.GetIDHandler)
	apiGroup.GET("/vans/:id/stock", stockHandler.VanStockHandler)
	apiGroup.POST("/vans", vanHandler.CreateHandler)
	apiGroup.PUT("/vans/:id", vanHandler.UpdateHandler)
	apiGroup.DELETE("/vans/:id", vanHandler.Delete)

	// Stock routes - matches PHP: /api/stock
	apiGroup.GET("/stock", stockHandler.WarehouseStockHandler)
	apiGroup.GET("/stock/all", stockHandler.AllStockHandler)
	apiGroup.GET("/stock/inventory", stockHandler.InventorySummaryHandler)
	apiGroup.GET("/stock/location/:id", stockHandler.LocationStockHandler)
	apiGroup.GET("/stock/movements", stockHandler.MovementsHandler)
	apiGroup.POST("/stock/adjust", stockHandler.AdjustStockHandler)
	apiGroup.POST("/stock/add", stockHandler.AddStockHandler)

	// Transfer routes - matches PHP: /api/transfers
	transferService := services.NewTransferService(models.Transfer{}, store)
	transferHandler := handlers.NewTransferHandler(transferService, stockService)
	apiGroup.GET("/transfers", transferHandler.GetAllHandler)
	apiGroup.GET("/transfers/:id", transferHandler.GetIDHandler)
	apiGroup.POST("/transfers", transferHandler.CreateHandler)

	// Payment service - needed by invoice handler
	paymentService := services.NewPaymentService(models.Payment{}, store)

	// Invoice routes - matches PHP: /api/invoices
	salesInvoiceService := services.NewSalesInvoiceService(models.SalesInvoice{}, store)
	purchaseInvoiceService := services.NewPurchaseInvoiceService(models.PurchaseInvoice{}, store)
	invoiceHandler := handlers.NewInvoiceHandler(salesInvoiceService, purchaseInvoiceService, stockService, paymentService)
	apiGroup.GET("/invoices/stats", invoiceHandler.StatsHandler)
	apiGroup.GET("/invoices", invoiceHandler.GetAllHandler)
	apiGroup.GET("/invoices/:id", invoiceHandler.GetIDHandler)
	apiGroup.POST("/invoices/purchase", invoiceHandler.CreatePurchaseHandler)
	apiGroup.POST("/invoices/sales", invoiceHandler.CreateSalesHandler)
	apiGroup.PUT("/invoices/sales/:id/items/:item_id", invoiceHandler.UpdateSalesInvoiceItem)
	apiGroup.PUT("/invoices/purchase/:id/items/:item_id", invoiceHandler.UpdatePurchaseInvoiceItem)
	apiGroup.POST("/invoices/sales/:id/items", invoiceHandler.AddSalesInvoiceItem)
	apiGroup.POST("/invoices/purchase/:id/items", invoiceHandler.AddPurchaseInvoiceItem)

	// Payment routes - matches PHP: /api/payments
	paymentHandler := handlers.NewPaymentHandler(paymentService, salesInvoiceService, purchaseInvoiceService)
	apiGroup.GET("/payments", paymentHandler.GetAllHandler)
	apiGroup.POST("/payments", paymentHandler.CreateHandler)

	// Report routes - matches PHP: /api/reports
	reportHandler := handlers.NewReportHandler(store)
	apiGroup.GET("/reports/sales", reportHandler.SalesReportHandler)
	apiGroup.GET("/reports/stock-movements", reportHandler.StockMovementsReportHandler)
	apiGroup.GET("/reports/receivables", reportHandler.ReceivablesReportHandler)
	apiGroup.GET("/reports/product-performance", reportHandler.ProductPerformanceReportHandler)
	apiGroup.GET("/reports/dashboard", reportHandler.DashboardReportHandler)

	// User routes - matches PHP: /api/users
	userservice := services.NewUserService(models.User{}, store)
	userHandler := handlers.NewUserHandler(userservice)
	apiGroup.GET("/users", userHandler.GetAllHandler)
	apiGroup.GET("/users/:id", userHandler.GetIDHandler)
	apiGroup.POST("/users", userHandler.CreateHandler)
	apiGroup.PUT("/users/:id", userHandler.UpdateHandler)
	apiGroup.DELETE("/users/:id", userHandler.UpdateToDelete)

	// Vendor routes - matches PHP: /api/vendors
	vendorService := services.NewVendorService(models.Vendor{}, store)
	vendorHandler := handlers.NewVendorHandler(vendorService)
	apiGroup.GET("/vendors", vendorHandler.GetAllHandler)
	apiGroup.GET("/vendors/:id", vendorHandler.GetIDHandler)
	apiGroup.POST("/vendors", vendorHandler.CreateHandler)
	apiGroup.PUT("/vendors/:id", vendorHandler.UpdateHandler)
	apiGroup.DELETE("/vendors/:id", vendorHandler.Delete)

	// Credit Note routes
	creditNoteService := services.NewCreditNoteService(store)
	creditNoteHandler := handlers.NewCreditNoteHandler(creditNoteService)
	apiGroup.GET("/credit-notes", creditNoteHandler.GetAllHandler)
	apiGroup.GET("/credit-notes/:id", creditNoteHandler.GetByIDHandler)
	apiGroup.POST("/credit-notes", creditNoteHandler.CreateHandler)
	apiGroup.PUT("/credit-notes/:id", creditNoteHandler.UpdateHandler)
	apiGroup.POST("/credit-notes/:id/approve", creditNoteHandler.ApproveHandler)
	apiGroup.POST("/credit-notes/:id/cancel", creditNoteHandler.CancelHandler)
	apiGroup.DELETE("/credit-notes/:id", creditNoteHandler.DeleteHandler)

	// Payment Allocation routes
	paymentAllocationService := services.NewPaymentAllocationService(store)
	apiGroup.POST("/payment-allocations/allocate-fifo", func(c echo.Context) error {
		var req struct {
			CustomerID      *uint   `json:"customer_id"`
			VendorID        *uint   `json:"vendor_id"`
			InvoiceType     string  `json:"invoice_type"`
			Amount          float64 `json:"amount"`
			PaymentMethod   string  `json:"payment_method"`
			PaymentDate     string  `json:"payment_date"`
			ReferenceNumber *string `json:"reference_number"`
			Notes           *string `json:"notes"`
		}
		if err := c.Bind(&req); err != nil {
			return handlers.ResponseError(c, err)
		}

		// Parse payment date
		paymentDate, err := handlers.ParseDate(req.PaymentDate)
		if err != nil {
			return handlers.ResponseError(c, err)
		}

		// Get user ID from context
		userID := handlers.GetUserIDFromContext(c)

		payment, allocations, err := paymentAllocationService.AllocatePaymentFIFO(
			req.CustomerID,
			req.VendorID,
			req.InvoiceType,
			req.Amount,
			req.PaymentMethod,
			paymentDate,
			req.ReferenceNumber,
			req.Notes,
			userID,
		)
		if err != nil {
			return handlers.ResponseError(c, err)
		}

		return handlers.ResponseSuccess(c, "Payment allocated successfully", map[string]interface{}{
			"payment":     payment,
			"allocations": allocations,
		})
	})
	apiGroup.GET("/payment-allocations/:id/allocations", func(c echo.Context) error {
		paymentID := c.Param("id")
		id, err := handlers.ParseUint(paymentID)
		if err != nil {
			return handlers.ResponseError(c, err)
		}
		allocations, err := paymentAllocationService.GetPaymentAllocations(id)
		if err != nil {
			return handlers.ResponseError(c, err)
		}
		return handlers.ResponseOK(c, allocations, "data")
	})
	apiGroup.GET("/invoices/:id/allocations", func(c echo.Context) error {
		invoiceID := c.Param("id")
		invoiceType := c.QueryParam("invoice_type")
		id, err := handlers.ParseUint(invoiceID)
		if err != nil {
			return handlers.ResponseError(c, err)
		}
		allocations, err := paymentAllocationService.GetInvoiceAllocations(id, invoiceType)
		if err != nil {
			return handlers.ResponseError(c, err)
		}
		return handlers.ResponseOK(c, allocations, "data")
	})
	apiGroup.GET("/payment-allocations/:id/allocation-summary", func(c echo.Context) error {
		paymentID := c.Param("id")
		id, err := handlers.ParseUint(paymentID)
		if err != nil {
			return handlers.ResponseError(c, err)
		}
		summary, err := paymentAllocationService.GetAllocationSummary(id)
		if err != nil {
			return handlers.ResponseError(c, err)
		}
		return handlers.ResponseOK(c, summary, "data")
	})

	// Role and Permission routes
	roleService := services.NewRoleService(models.Role{}, store)
	roleHandler := handlers.NewRoleHandler(roleService)
	apiGroup.GET("/roles", roleHandler.GetRoles)
	apiGroup.GET("/roles/:id", roleHandler.GetRole)
	apiGroup.POST("/roles", roleHandler.CreateRole)
	apiGroup.PUT("/roles/:id", roleHandler.UpdateRole)
	apiGroup.DELETE("/roles/:id", roleHandler.DeleteRole)
	apiGroup.GET("/permissions", roleHandler.GetPermissions)
	apiGroup.POST("/roles/:id/permissions", roleHandler.AssignPermissions)
	apiGroup.POST("/users/assign-role", roleHandler.AssignRoleToUser)
	apiGroup.POST("/users/remove-role", roleHandler.RemoveRoleFromUser)
	apiGroup.GET("/users-with-roles", roleHandler.GetUsersWithRoles)
	apiGroup.GET("/check-permission", roleHandler.CheckPermission)
}
