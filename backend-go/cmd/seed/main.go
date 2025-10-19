package main

import (
	"fmt"
	"log"

	"github.com/gonext-tech/invoicing-system/backend/database"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("Warning: Error loading .env file, using environment variables")
	}

	// Initialize database connection
	db, err := database.DBInit()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	fmt.Println("===========================================")
	fmt.Println("Starting Database Seeding Process")
	fmt.Println("===========================================")

	// Run the seeder
	if err := database.SeedDatabase(db); err != nil {
		log.Fatal("Failed to seed database:", err)
	}

	fmt.Println("===========================================")
	fmt.Println("Database Seeding Completed Successfully!")
	fmt.Println("===========================================")
	fmt.Println("\nDefault credentials:")
	fmt.Println("  Admin: admin@diyaa.com / password123")
	fmt.Println("  Manager: manager@diyaa.com / password123")
	fmt.Println("  User: user@diyaa.com / password123")
}
