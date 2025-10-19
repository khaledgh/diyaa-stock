package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var counts int64

func DBInit() (d *gorm.DB, err error) {
	database := connectToDB()
	if database == nil {
		log.Panic("Can't connect to Postgres!")
	}
	database.AutoMigrate(
		// Core models
		models.User{},
		models.Category{},
		models.ProductType{},
		models.ProductBrand{},
		models.Product{},
		
		// Customer/Vendor models
		models.Customer{},
		models.Vendor{},
		models.Supplier{},
		
		// Location models
		models.Location{},
		models.Employee{},
		models.Van{},
		
		// Stock models
		models.Stock{},
		models.StockMovement{},
		models.Transfer{},
		models.TransferItem{},
		
		// Invoice models
		models.SalesInvoice{},
		models.SalesInvoiceItem{},
		models.PurchaseInvoice{},
		models.PurchaseInvoiceItem{},
		models.Payment{},
	)
	return database, nil
}

func connectToDB() *gorm.DB {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	dbHost := os.Getenv("DB_HOST")
	fmt.Println("DB_HOST:", dbHost)
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dsn := dbUser + ":" + dbPassword + "@(" + dbHost + ":" + dbPort + ")/" + dbName + "?parseTime=true"
	for {
		connection, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true,
		})

		if err != nil {
			log.Println("DB not yet ready ...")
			counts++
		} else {
			log.Println("Connected to DB!")
			return connection
		}

		if counts > 10 {
			log.Println(err)
			return nil
		}
		log.Println("Backing off for two seconds ...")
		time.Sleep(1 * time.Second)
		continue
	}
}
