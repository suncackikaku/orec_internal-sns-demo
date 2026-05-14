package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrAdminNotFound           = errors.New("admin not found")
	ErrInvalidAdminCredentials = errors.New("invalid admin credentials")
)

// Admin represents an admin user
type Admin struct {
	ID          string `json:"id" db:"id"`
	Email       string `json:"email" db:"email"`
	DisplayName string `json:"display_name" db:"display_name"`
}

// AdminJWTClaims represents JWT claims for admin
type AdminJWTClaims struct {
	AdminID     string `json:"admin_id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	IsAdmin     bool   `json:"is_admin"`
	jwt.RegisteredClaims
}

// AdminDBInterface defines the database operations needed for admin auth
type AdminDBInterface interface {
	GetAdminByEmail(email string) (*Admin, error)
	GetAdminByID(id string) (*Admin, error)
}

// AdminAuthenticator implements authentication for admin users
type AdminAuthenticator struct {
	secretKey []byte
	db        AdminDBInterface
}

// NewAdminAuthenticator creates a new admin authenticator
func NewAdminAuthenticator(secretKey string, db AdminDBInterface) *AdminAuthenticator {
	return &AdminAuthenticator{
		secretKey: []byte(secretKey),
		db:        db,
	}
}

// HashPassword hashes a password using bcrypt
func (a *AdminAuthenticator) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// CheckPassword compares a password with a hash
func (a *AdminAuthenticator) CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateToken creates a JWT token for an admin
func (a *AdminAuthenticator) GenerateToken(admin *Admin) (string, error) {
	claims := AdminJWTClaims{
		AdminID:     admin.ID,
		Email:       admin.Email,
		DisplayName: admin.DisplayName,
		IsAdmin:     true,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(a.secretKey)
}

// ValidateToken validates a JWT token and returns the admin
func (a *AdminAuthenticator) ValidateToken(tokenString string) (*Admin, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AdminJWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return a.secretKey, nil
	})

	if err != nil {
		return nil, ErrTokenInvalid
	}

	if claims, ok := token.Claims.(*AdminJWTClaims); ok && token.Valid {
		return &Admin{
			ID:          claims.AdminID,
			Email:       claims.Email,
			DisplayName: claims.DisplayName,
		}, nil
	}

	return nil, ErrTokenInvalid
}
