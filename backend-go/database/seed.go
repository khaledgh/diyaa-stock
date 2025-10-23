package database

import (
	"log"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedDatabase seeds the database with initial data
func SeedDatabase(db *gorm.DB) error {
	log.Println("Starting database seeding...")

	// Seed in order of dependencies
	if err := seedUsers(db); err != nil {
		return err
	}

	if err := seedCategories(db); err != nil {
		return err
	}

	if err := seedProductTypes(db); err != nil {
		return err
	}

	if err := seedProductBrands(db); err != nil {
		return err
	}

	if err := seedLocations(db); err != nil {
		return err
	}

	if err := seedCustomers(db); err != nil {
		return err
	}

	if err := seedVendors(db); err != nil {
		return err
	}

	if err := seedSuppliers(db); err != nil {
		return err
	}

	if err := seedProducts(db); err != nil {
		return err
	}

	if err := seedEmployees(db); err != nil {
		return err
	}

	if err := seedVans(db); err != nil {
		return err
	}

	if err := seedStock(db); err != nil {
		return err
	}

	log.Println("Database seeding completed successfully!")
	return nil
}

func seedUsers(db *gorm.DB) error {
	log.Println("Seeding users...")

	// Check if users already exist
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		log.Println("Users already exist, skipping...")
		return nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	users := []models.User{
		{
			Email:     "admin@diyaa.com",
			CompanyID: 1001,
			FirstName: "Admin",
			LastName:  "User",
			Phone:     "+1234567890",
			Status:    "ACTIVE",
			Password:  string(hashedPassword),
			Role:      "ADMIN",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			Email:     "manager@diyaa.com",
			CompanyID: 1002,
			FirstName: "Manager",
			LastName:  "User",
			Phone:     "+1234567891",
			Status:    "ACTIVE",
			Password:  string(hashedPassword),
			Role:      "MANAGER",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			Email:     "user@diyaa.com",
			CompanyID: 1003,
			FirstName: "Regular",
			LastName:  "User",
			Phone:     "+1234567892",
			Status:    "ACTIVE",
			Password:  string(hashedPassword),
			Role:      "USER",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	result := db.Create(&users)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d users\n", len(users))
	return nil
}

func seedCategories(db *gorm.DB) error {
	log.Println("Seeding categories...")

	var count int64
	db.Model(&models.Category{}).Count(&count)
	if count > 0 {
		log.Println("Categories already exist, skipping...")
		return nil
	}

	nameAr1 := "إلكترونيات"
	nameAr2 := "ملابس"
	nameAr3 := "أغذية ومشروبات"
	nameAr4 := "أدوات منزلية"
	nameAr5 := "رياضة وترفيه"

	desc1 := "Electronic devices and accessories"
	desc2 := "Clothing and fashion items"
	desc3 := "Food and beverage products"
	desc4 := "Home and kitchen appliances"
	desc5 := "Sports and entertainment equipment"

	categories := []models.Category{
		{
			NameEn:      "Electronics",
			NameAr:      &nameAr1,
			Description: &desc1,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			NameEn:      "Clothing",
			NameAr:      &nameAr2,
			Description: &desc2,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			NameEn:      "Food & Beverages",
			NameAr:      &nameAr3,
			Description: &desc3,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			NameEn:      "Home Appliances",
			NameAr:      &nameAr4,
			Description: &desc4,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			NameEn:      "Sports & Entertainment",
			NameAr:      &nameAr5,
			Description: &desc5,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	result := db.Create(&categories)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d categories\n", len(categories))
	return nil
}

func seedProductTypes(db *gorm.DB) error {
	log.Println("Seeding product types...")

	var count int64
	db.Model(&models.ProductType{}).Count(&count)
	if count > 0 {
		log.Println("Product types already exist, skipping...")
		return nil
	}

	nameAr1 := "هواتف ذكية"
	nameAr2 := "أجهزة كمبيوتر محمولة"
	nameAr3 := "قمصان"
	nameAr4 := "مشروبات"
	nameAr5 := "وجبات خفيفة"

	productTypes := []models.ProductType{
		{
			NameEn:    "Smartphones",
			NameAr:    &nameAr1,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			NameEn:    "Laptops",
			NameAr:    &nameAr2,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			NameEn:    "T-Shirts",
			NameAr:    &nameAr3,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			NameEn:    "Beverages",
			NameAr:    &nameAr4,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			NameEn:    "Snacks",
			NameAr:    &nameAr5,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	result := db.Create(&productTypes)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d product types\n", len(productTypes))
	return nil
}

func seedProductBrands(db *gorm.DB) error {
	log.Println("Seeding product brands...")

	var count int64
	db.Model(&models.ProductBrand{}).Count(&count)
	if count > 0 {
		log.Println("Product brands already exist, skipping...")
		return nil
	}

	nameAr1 := "سامسونج"
	nameAr2 := "أبل"
	nameAr3 := "ديل"
	nameAr4 := "نايكي"
	nameAr5 := "أديداس"

	productBrands := []models.ProductBrand{
		{
			NameEn:    "Samsung",
			NameAr:    &nameAr1,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			NameEn:    "Apple",
			NameAr:    &nameAr2,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			NameEn:    "Dell",
			NameAr:    &nameAr3,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			NameEn:    "Nike",
			NameAr:    &nameAr4,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			NameEn:    "Adidas",
			NameAr:    &nameAr5,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	result := db.Create(&productBrands)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d product brands\n", len(productBrands))
	return nil
}

func seedLocations(db *gorm.DB) error {
	log.Println("Seeding locations...")

	var count int64
	db.Model(&models.Location{}).Count(&count)
	if count > 0 {
		log.Println("Locations already exist, skipping...")
		return nil
	}

	address1 := "123 Main St, City Center"
	address2 := "456 Industrial Ave, Warehouse District"
	address3 := "789 Shopping Mall, Downtown"
	phone1 := "+1234567800"
	phone2 := "+1234567801"
	phone3 := "+1234567802"
	manager1 := "John Smith"
	manager2 := "Jane Doe"
	manager3 := "Mike Johnson"

	locations := []models.Location{
		{
			Name:        "Main Warehouse",
			Type:        "warehouse",
			Address:     &address1,
			Phone:       &phone1,
			ManagerName: &manager1,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Name:        "Secondary Warehouse",
			Type:        "warehouse",
			Address:     &address2,
			Phone:       &phone2,
			ManagerName: &manager2,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Name:        "Retail Store #1",
			Type:        "store",
			Address:     &address3,
			Phone:       &phone3,
			ManagerName: &manager3,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	result := db.Create(&locations)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d locations\n", len(locations))
	return nil
}

func seedCustomers(db *gorm.DB) error {
	log.Println("Seeding customers...")

	var count int64
	db.Model(&models.Customer{}).Count(&count)
	if count > 0 {
		log.Println("Customers already exist, skipping...")
		return nil
	}

	phone1 := "+1234567810"
	phone2 := "+1234567811"
	phone3 := "+1234567812"
	email1 := "customer1@example.com"
	email2 := "customer2@example.com"
	email3 := "customer3@example.com"
	address1 := "100 Customer St, City"
	address2 := "200 Client Ave, Town"
	address3 := "300 Buyer Blvd, Village"
	tax1 := "TAX-001"
	tax2 := "TAX-002"
	tax3 := "TAX-003"

	customers := []models.Customer{
		{
			Name:        "ABC Corporation",
			Phone:       &phone1,
			Email:       &email1,
			Address:     &address1,
			TaxNumber:   &tax1,
			CreditLimit: 10000.00,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Name:        "XYZ Trading",
			Phone:       &phone2,
			Email:       &email2,
			Address:     &address2,
			TaxNumber:   &tax2,
			CreditLimit: 5000.00,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Name:        "Retail Plus",
			Phone:       &phone3,
			Email:       &email3,
			Address:     &address3,
			TaxNumber:   &tax3,
			CreditLimit: 7500.00,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	result := db.Create(&customers)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d customers\n", len(customers))
	return nil
}

func seedVendors(db *gorm.DB) error {
	log.Println("Seeding vendors...")

	var count int64
	db.Model(&models.Vendor{}).Count(&count)
	if count > 0 {
		log.Println("Vendors already exist, skipping...")
		return nil
	}

	phone1 := "+1234567820"
	phone2 := "+1234567821"
	email1 := "vendor1@example.com"
	email2 := "vendor2@example.com"
	address1 := "500 Vendor St, City"
	address2 := "600 Supplier Ave, Town"
	tax1 := "VTAX-001"
	tax2 := "VTAX-002"
	company1 := "Tech Supplies Corporation"
	company2 := "Global Distributors LLC"
	payment1 := "Net 30"
	payment2 := "Net 60"

	vendors := []models.Vendor{
		{
			Name:         "Tech Supplies Inc",
			CompanyName:  &company1,
			Phone:        &phone1,
			Email:        &email1,
			Address:      &address1,
			TaxNumber:    &tax1,
			PaymentTerms: &payment1,
			IsActive:     true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			Name:         "Global Distributors",
			CompanyName:  &company2,
			Phone:        &phone2,
			Email:        &email2,
			Address:      &address2,
			TaxNumber:    &tax2,
			PaymentTerms: &payment2,
			IsActive:     true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	result := db.Create(&vendors)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d vendors\n", len(vendors))
	return nil
}

func seedSuppliers(db *gorm.DB) error {
	log.Println("Seeding suppliers...")

	var count int64
	db.Model(&models.Supplier{}).Count(&count)
	if count > 0 {
		log.Println("Suppliers already exist, skipping...")
		return nil
	}

	startingDate := time.Now().AddDate(-1, 0, 0) // 1 year ago

	suppliers := []models.Supplier{
		{
			SupplierName:    "Premium Suppliers Ltd",
			SupplierAddress: "700 Supplier St, City",
			SupplierPhone:   "+1234567830",
			TaxNumber:       "STAX-001",
			StartingDate:    &startingDate,
			CompanyID:       1001,
			UserID:          1,
		},
		{
			SupplierName:    "Wholesale Partners",
			SupplierAddress: "800 Wholesaler Ave, Town",
			SupplierPhone:   "+1234567831",
			TaxNumber:       "STAX-002",
			StartingDate:    &startingDate,
			CompanyID:       1001,
			UserID:          1,
		},
	}

	result := db.Create(&suppliers)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d suppliers\n", len(suppliers))
	return nil
}

func seedProducts(db *gorm.DB) error {
	log.Println("Seeding products...")

	var count int64
	db.Model(&models.Product{}).Count(&count)
	if count > 0 {
		log.Println("Products already exist, skipping...")
		return nil
	}

	barcode1 := "1234567890123"
	barcode2 := "2345678901234"
	barcode3 := "3456789012345"
	barcode4 := "4567890123456"
	barcode5 := "5678901234567"

	nameAr1 := "سامسونج جالاكسي S21"
	nameAr2 := "آيفون 13 برو"
	nameAr3 := "ديل XPS 15"
	nameAr4 := "قميص نايكي رياضي"
	nameAr5 := "ماء معدني"

	desc1 := "Latest Samsung flagship smartphone"
	desc2 := "Apple iPhone 13 Pro with advanced features"
	desc3 := "High-performance Dell laptop"
	desc4 := "Comfortable sports t-shirt"
	desc5 := "Natural mineral water 500ml"

	categoryID1 := uint(1) // Electronics
	categoryID2 := uint(2) // Clothing
	categoryID3 := uint(3) // Food & Beverages

	typeID1 := uint(1) // Smartphones
	typeID2 := uint(2) // Laptops
	typeID3 := uint(3) // T-Shirts
	typeID4 := uint(4) // Beverages

	products := []models.Product{
		{
			SKU:           "SAMS-S21-001",
			Barcode:       &barcode1,
			NameEn:        "Samsung Galaxy S21",
			NameAr:        &nameAr1,
			Description:   &desc1,
			CategoryID:    &categoryID1,
			TypeID:        &typeID1,
			UnitPrice:     799.99,
			CostPrice:     650.00,
			Unit:          "piece",
			MinStockLevel: 10,
			IsActive:      true,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		},
		{
			SKU:           "APPL-IP13P-001",
			Barcode:       &barcode2,
			NameEn:        "iPhone 13 Pro",
			NameAr:        &nameAr2,
			Description:   &desc2,
			CategoryID:    &categoryID1,
			TypeID:        &typeID1,
			UnitPrice:     999.99,
			CostPrice:     850.00,
			Unit:          "piece",
			MinStockLevel: 5,
			IsActive:      true,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		},
		{
			SKU:           "DELL-XPS15-001",
			Barcode:       &barcode3,
			NameEn:        "Dell XPS 15",
			NameAr:        &nameAr3,
			Description:   &desc3,
			CategoryID:    &categoryID1,
			TypeID:        &typeID2,
			UnitPrice:     1499.99,
			CostPrice:     1200.00,
			Unit:          "piece",
			MinStockLevel: 3,
			IsActive:      true,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		},
		{
			SKU:           "NIKE-TSH-001",
			Barcode:       &barcode4,
			NameEn:        "Nike Sports T-Shirt",
			NameAr:        &nameAr4,
			Description:   &desc4,
			CategoryID:    &categoryID2,
			TypeID:        &typeID3,
			UnitPrice:     29.99,
			CostPrice:     15.00,
			Unit:          "piece",
			MinStockLevel: 50,
			IsActive:      true,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		},
		{
			SKU:           "WATER-MIN-500",
			Barcode:       &barcode5,
			NameEn:        "Mineral Water 500ml",
			NameAr:        &nameAr5,
			Description:   &desc5,
			CategoryID:    &categoryID3,
			TypeID:        &typeID4,
			UnitPrice:     1.50,
			CostPrice:     0.80,
			Unit:          "bottle",
			MinStockLevel: 200,
			IsActive:      true,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		},
	}

	result := db.Create(&products)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d products\n", len(products))
	return nil
}

func seedEmployees(db *gorm.DB) error {
	log.Println("Seeding employees...")

	var count int64
	db.Model(&models.Employee{}).Count(&count)
	if count > 0 {
		log.Println("Employees already exist, skipping...")
		return nil
	}

	phone1 := "+1234567840"
	phone2 := "+1234567841"
	phone3 := "+1234567842"
	email1 := "emp1@diyaa.com"
	email2 := "emp2@diyaa.com"
	email3 := "emp3@diyaa.com"
	position1 := "Warehouse Manager"
	position2 := "Sales Associate"
	position3 := "Store Manager"
	hireDate := time.Now().AddDate(0, -6, 0) // 6 months ago

	employees := []models.Employee{
		{
			FullName:  "Ahmed Hassan",
			Phone:     &phone1,
			Email:     &email1,
			Position:  &position1,
			HireDate:  &hireDate,
			Salary:    3500.00,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			FullName:  "Sara Mohamed",
			Phone:     &phone2,
			Email:     &email2,
			Position:  &position2,
			HireDate:  &hireDate,
			Salary:    2800.00,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			FullName:  "Omar Ali",
			Phone:     &phone3,
			Email:     &email3,
			Position:  &position3,
			HireDate:  &hireDate,
			Salary:    3200.00,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	result := db.Create(&employees)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d employees\n", len(employees))
	return nil
}

func seedVans(db *gorm.DB) error {
	log.Println("Seeding vans...")

	var count int64
	db.Model(&models.Van{}).Count(&count)
	if count > 0 {
		log.Println("Vans already exist, skipping...")
		return nil
	}

	plateNumber1 := "ABC-1234"
	plateNumber2 := "XYZ-5678"

	vans := []models.Van{
		{
			Name:        "Van 1 - Ford Transit",
			PlateNumber: &plateNumber1,
			OwnerType:   "company",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Name:        "Van 2 - Mercedes Sprinter",
			PlateNumber: &plateNumber2,
			OwnerType:   "company",
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	result := db.Create(&vans)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d vans\n", len(vans))
	return nil
}

func seedStock(db *gorm.DB) error {
	log.Println("Seeding stock...")

	var count int64
	db.Model(&models.Stock{}).Count(&count)
	if count > 0 {
		log.Println("Stock already exists, skipping...")
		return nil
	}

	stocks := []models.Stock{
		{
			ProductID:    1,
			LocationType: "warehouse",
			LocationID:   1,
			Quantity:     50,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ProductID:    2,
			LocationType: "warehouse",
			LocationID:   1,
			Quantity:     30,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ProductID:    3,
			LocationType: "warehouse",
			LocationID:   1,
			Quantity:     20,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ProductID:    4,
			LocationType: "warehouse",
			LocationID:   2,
			Quantity:     100,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ProductID:    5,
			LocationType: "location",
			LocationID:   3,
			Quantity:     500,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	result := db.Create(&stocks)
	if result.Error != nil {
		return result.Error
	}

	log.Printf("Created %d stock records\n", len(stocks))
	return nil
}
