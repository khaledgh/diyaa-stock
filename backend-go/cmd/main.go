package main

import (
	"fmt"

	"github.com/gonext-tech/invoicing-system/backend/database"
	"github.com/gonext-tech/invoicing-system/backend/routes"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		fmt.Println("Error loading .env file")
	}
	e := echo.New()
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173", "https://qwikbill.gonext.tech"},
		AllowCredentials: true,
	}))
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	db, err := database.DBInit()
	if err != nil {
		e.Logger.Fatal(err)
	}

	routes.SetupRoutes(e, db)
	// cron.StartCron(db)
	e.Logger.Fatal(e.Start(":9000"))
}
