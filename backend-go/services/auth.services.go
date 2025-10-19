package services

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/gonext-tech/invoicing-system/backend/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	User models.User
	DB   *gorm.DB
}

func NewAuthService(u models.User, db *gorm.DB) *AuthService {
	return &AuthService{
		User: u,
		DB:   db,
	}
}

func (s *AuthService) Register(email, password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := models.User{
		Email:    email,
		Password: string(hashedPassword),
	}
	result := s.DB.Create(&user)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (s *AuthService) CheckEmail(email string) (models.User, error) {
	var user models.User
	if result := s.DB.Preload("Van").Where("email = ?", email).Find(&user); result.Error != nil {
		return models.User{}, errors.New("credentials not match")
	}
	
	// Populate computed fields
	user.FullName = user.FirstName + " " + user.LastName
	user.IsActive = user.Status == "ACTIVE"
	if user.Van != nil {
		user.VanName = user.Van.Name
	}
	
	return user, nil
}

func (s *AuthService) CheckPassword(user models.User, password string) error {
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return errors.New("credentials not match")

	}
	return nil
}

func (as *AuthService) CheckDeactive(user models.User) error {
	if user.Status == "NOTACTIVE" {
		return errors.New("user is not active\ncontact the admin please")
	}
	return nil
}

func (as *AuthService) Login(email, password string) (*http.Cookie, string, error) {

	tokenString, err := generateJWT(email)
	if err != nil {
		return nil, "", err
	}
	// Create a cookie containing the token
	cookie := as.GenerateCookie("jwt", tokenString, "ADD")
	return cookie, tokenString, nil
}

func (as *AuthService) Logout() *http.Cookie {
	// Create a new cookie with an expired value to clear the existing JWT token cookie
	cookie := as.GenerateCookie("jwt", "", "REMOVE")

	return cookie
}

func (s *AuthService) GetUser(tokenString string) (*models.User, error) {
	token, err := jwt.ParseWithClaims(tokenString, &models.Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte("secret"), nil // Replace "secret" with your secret key
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*models.Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	var user models.User
	result := s.DB.Preload("Van").Where("email = ?", claims.Email).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	
	// Populate computed fields
	user.FullName = user.FirstName + " " + user.LastName
	user.IsActive = user.Status == "ACTIVE"
	if user.Van != nil {
		user.VanName = user.Van.Name
	}

	return &user, nil
}

func generateJWT(email string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, &models.Claims{
		Email: email,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(time.Hour * 24).Unix(), // Token expires in 24 hours
		},
	})
	tokenString, err := token.SignedString([]byte("secret")) // Replace "secret" with your secret key
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

func (as *AuthService) GenerateCookie(name, value, action string) *http.Cookie {
	if action == "ADD" {
		return &http.Cookie{
			Name:     name,
			Value:    value,
			Path:     "/",
			Expires:  time.Now().Add(24 * time.Hour), // Token expires in 24 hours
			Domain:   "localhost",                    // Available only on anotherdomain.com
			HttpOnly: true,
			Secure:   false, // Set to true in production with HTTPS
			//SameSite: http.SameSiteNoneMode, // For cross-origin requests

		}
	} else {
		return &http.Cookie{
			Name:    "jwt",
			Value:   "",
			Path:    "/",
			Expires: time.Now().Add(-time.Hour), // Set expiry in the past to expire immediately
			//Domain:   "gonext.tech",
			Domain:   "localhost",
			HttpOnly: true,
			Secure:   false, // Set to true in production with HTTPS
			//SameSite: http.SameSiteNoneMode, // For cross-origin requests
		}
	}
}
