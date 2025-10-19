package handlers

import (
	"log"
	"net/http"

	"github.com/golang-jwt/jwt"
	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
)

type AuthService interface {
	Register(email, password string) error
	CheckEmail(username string) (models.User, error)
	CheckPassword(user models.User, password string) error
	CheckDeactive(user models.User) error
	Login(username, password string) (*http.Cookie, string, error)
	Logout() *http.Cookie
	GetUser(tokenString string) (*models.User, error)
}
type AuthHandler struct {
	AuthServices AuthService
}

func NewAuthHandler(us AuthService) *AuthHandler {
	return &AuthHandler{
		AuthServices: us,
	}
}

func (ah *AuthHandler) RegisterHandler(c echo.Context) error {
	var formData struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&formData); err != nil {
		return err
	}

	err := ah.AuthServices.Register(formData.Email, formData.Password)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]string{"message": "user registered successfully"})
}

func (ah *AuthHandler) LoginHandler(c echo.Context) error {
	var formData struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.Bind(&formData); err != nil {
		return err
	}
	user, err := ah.AuthServices.CheckEmail(formData.Email)
	if err != nil {
		return ResponseError(c, err)
	}

	err = ah.AuthServices.CheckPassword(user, formData.Password)
	if err != nil {
		return ResponseError(c, err)
	}

	err = ah.AuthServices.CheckDeactive(user)
	if err != nil {
		return ResponseError(c, err)
	}

	cookie, tokenString, err := ah.AuthServices.Login(formData.Email, formData.Password)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}
	c.SetCookie(cookie)

	type LoginData struct {
		User  models.User `json:"user"`
		Token string      `json:"token"`
	}
	type LoginResponse struct {
		OK      bool      `json:"ok"`
		Data    LoginData `json:"data"`
		Message string    `json:"message"`
	}
	response := LoginResponse{
		OK: true,
		Data: LoginData{
			User:  user,
			Token: tokenString,
		},
		Message: "Login successful",
	}
	return c.JSON(http.StatusOK, response)
}

func (ah *AuthHandler) GetUserHandler(c echo.Context) error {
	// Retrieve token string from the cookie
	cookie, err := c.Cookie("jwt")
	log.Printf("Setting cookie: %v", cookie)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "missing or invalid token cookie")
	}
	tokenString := cookie.Value

	// Call the GetUser method to retrieve user details
	user, err := ah.AuthServices.GetUser(tokenString)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}

	return ResponseOK(c, user, "data")
}

// Logout handler
func (ah *AuthHandler) LogoutHandler(c echo.Context) error {
	// Call the Logout method to get the logout cookie
	cookie := ah.AuthServices.Logout()

	// Set the cookie in the response to clear the existing JWT token cookie
	c.SetCookie(cookie)
	return ResponseOK(c, nil, "")
}

func (ah *AuthHandler) JWTMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		var tokenString string

		// Try to get token from Authorization header first (Bearer token)
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		} else {
			// Fallback to cookie
			cookie, err := c.Cookie("jwt")
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing or invalid token")
			}
			tokenString = cookie.Value
		}

		// Parse and validate JWT token
		token, err := jwt.ParseWithClaims(tokenString, &models.Claims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte("secret"), nil // Replace "secret" with your secret key
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
		}

		claims, ok := token.Claims.(*models.Claims)
		if !ok || !token.Valid {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
		}

		user, err := ah.AuthServices.CheckEmail(claims.Email)
		if err != nil {
			log.Println(err.Error())
		}
		// Set user details in context
		c.Set("user", user)
		return next(c)
	}
}
