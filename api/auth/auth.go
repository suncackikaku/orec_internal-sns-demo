package auth

import (
	"database/sql"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound       = errors.New("user not found")
	ErrTokenInvalid       = errors.New("invalid token")
)

// Authenticator interface for different auth methods
type Authenticator interface {
	Authenticate(email, password string) (*User, error)
	GenerateToken(user *User) (string, error)
	ValidateToken(tokenString string) (*User, error)
	HashPassword(password string) (string, error)
}

// User represents an authenticated user
type User struct {
	ID           string         `json:"id" db:"id"`
	DisplayName  string         `json:"display_name" db:"display_name"`
	Email        string         `json:"email" db:"email"`
	DepartmentID sql.NullString `json:"primary_department_id" db:"primary_department_id"`
}

// JWTClaims represents JWT claims
type JWTClaims struct {
	UserID       string `json:"user_id"`
	DisplayName  string `json:"display_name"`
	Email        string `json:"email"`
	DepartmentID string `json:"primary_department_id"`
	jwt.RegisteredClaims
}

// LocalAuthenticator implements Authenticator for local email/password auth
type LocalAuthenticator struct {
	secretKey []byte
	db        DBInterface
}

// DBInterface defines the database operations needed for auth
type DBInterface interface {
	GetUserByEmail(email string) (*User, error)
	GetUserByID(id string) (*User, error)
}

// NewLocalAuthenticator creates a new local authenticator
func NewLocalAuthenticator(secretKey string, db DBInterface) *LocalAuthenticator {
	return &LocalAuthenticator{
		secretKey: []byte(secretKey),
		db:        db,
	}
}

// HashPassword hashes a password using bcrypt
func (a *LocalAuthenticator) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// CheckPassword compares a password with a hash
func (a *LocalAuthenticator) CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Authenticate validates email/password and returns user
func (a *LocalAuthenticator) Authenticate(email, password string) (*User, error) {
	// This will be implemented with actual DB lookup in main.go
	return nil, ErrInvalidCredentials
}

// GenerateToken creates a JWT token for a user
func (a *LocalAuthenticator) GenerateToken(user *User) (string, error) {
	claims := JWTClaims{
		UserID:       user.ID,
		DisplayName:  user.DisplayName,
		Email:        user.Email,
		DepartmentID: user.DepartmentID.String,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(a.secretKey)
}

// ValidateToken validates a JWT token and returns the user
func (a *LocalAuthenticator) ValidateToken(tokenString string) (*User, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return a.secretKey, nil
	})

	if err != nil {
		return nil, ErrTokenInvalid
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return &User{
			ID:           claims.UserID,
			DisplayName:  claims.DisplayName,
			Email:        claims.Email,
			DepartmentID: sql.NullString{String: claims.DepartmentID, Valid: true},
		}, nil
	}

	return nil, ErrTokenInvalid
}
