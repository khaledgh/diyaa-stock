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
	stockService := services.NewStockService(models.Stock{}, store)
	stockHandler := handlers.NewStockHandler(stockService)
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
}
