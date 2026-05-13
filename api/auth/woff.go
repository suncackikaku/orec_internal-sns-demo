package auth

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrWoffAuthFailed = errors.New("woff authentication failed")
)

// WoffAuthRequest represents the request from frontend
type WoffAuthRequest struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	DomainID    string `json:"domainId"`
}

// WoffTokenResponse represents LINE WORKS token response
type WoffTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// WoffUserInfo represents LINE WORKS user info
type WoffUserInfo struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	DomainID    string `json:"domainId"`
}

// WoffAuthenticator handles WOFF authentication
type WoffAuthenticator struct {
	clientID     string
	clientSecret string
	secretKey    []byte
	db           DBInterface
}

// NewWoffAuthenticator creates a new WOFF authenticator
func NewWoffAuthenticator(clientID, clientSecret, secretKey string, db DBInterface) *WoffAuthenticator {
	return &WoffAuthenticator{
		clientID:     clientID,
		clientSecret: clientSecret,
		secretKey:    []byte(secretKey),
		db:           db,
	}
}

// GetAccessToken gets access token from LINE WORKS
func (a *WoffAuthenticator) GetAccessToken() (*WoffTokenResponse, error) {
	url := "https://auth.worksmobile.com/oauth2/v2.0/token"

	data := fmt.Sprintf("grant_type=client_credentials&client_id=%s&client_secret=%s&scope=bot",
		a.clientID, a.clientSecret)

	req, err := http.NewRequest("POST", url, strings.NewReader(data))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get access token: %s", string(body))
	}

	var tokenResp WoffTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

// VerifyWoffUser verifies the WOFF user with LINE WORKS API
func (a *WoffAuthenticator) VerifyWoffUser(userID, domainID string) (*WoffUserInfo, error) {
	// Get access token
	token, err := a.GetAccessToken()
	if err != nil {
		return nil, err
	}

	// Call LINE WORKS API to verify user
	url := fmt.Sprintf("https://www.worksapis.com/v1.0/users/%s", userID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token.AccessToken))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to verify user: %s", string(body))
	}

	var userInfo WoffUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}

// AuthenticateWoffUser authenticates a user with WOFF credentials
func (a *WoffAuthenticator) AuthenticateWoffUser(req *WoffAuthRequest) (*User, error) {
	// For now, we'll trust the WOFF SDK validation and create/login the user
	// In production, you might want to verify with LINE WORKS API

	// Check if user exists
	user, err := a.db.GetUserByID(req.UserID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			// User doesn't exist, will need to be created
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

// GenerateToken creates a JWT token for a user (same as LocalAuthenticator)
func (a *WoffAuthenticator) GenerateToken(user *User) (string, error) {
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
func (a *WoffAuthenticator) ValidateToken(tokenString string) (*User, error) {
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
