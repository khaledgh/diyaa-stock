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
		AllowOrigins: []string{
			"http://localhost:3000",
			"http://localhost:5173",
			"http://localhost:5174",
			"https://qwikbill.gonext.tech",
			"https://transgate.linksbridge.top",
			"https://transgate-api.linksbridge.top",
			"capacitor://localhost", // For mobile apps
			"ionic://localhost",     // For mobile apps
			"http://localhost",      // For mobile apps
		},
		AllowMethods:     []string{echo.GET, echo.POST, echo.PUT, echo.DELETE, echo.PATCH, echo.OPTIONS},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
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
	e.Logger.Fatal(e.Start(":9001"))
}
