package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrOIDCAuthFailed = errors.New("oidc authentication failed")
)

// FlexInt は JSON の数値と文字列の両方を受けられる整数。
// LINE WORKS の token エンドポイントは expires_in を "86400" のような
// 文字列で返すため、int で受けると復号時に失敗する。
type FlexInt int

func (f *FlexInt) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), `"`)
	if s == "" || s == "null" {
		*f = 0
		return nil
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return fmt.Errorf("expires_in を数値として解釈できません: %s", s)
	}
	*f = FlexInt(n)
	return nil
}

// OIDCAuthenticator handles OIDC authentication for PC browsers
type OIDCAuthenticator struct {
	clientID     string
	clientSecret string
	redirectURI  string
	secretKey    []byte
	db           DBInterface
	StateStore   *StateStore
}

// StateStore manages OAuth state parameters
type StateStore struct {
	states map[string]time.Time
	mu     sync.RWMutex
}

// PKCEData holds PKCE parameters
type PKCEData struct {
	CodeVerifier  string
	CodeChallenge string
}

// OIDCTokenResponse represents LINE WORKS token response
type OIDCTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    FlexInt `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
}

// OIDCUserInfo represents user info from LINE WORKS
type OIDCUserInfo struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	PhotoUrl    string `json:"photoUrl"`
}

// NewOIDCAuthenticator creates a new OIDC authenticator
func NewOIDCAuthenticator(clientID, clientSecret, redirectURI, secretKey string, db DBInterface) *OIDCAuthenticator {
	return &OIDCAuthenticator{
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURI:  redirectURI,
		secretKey:    []byte(secretKey),
		db:           db,
		StateStore: &StateStore{
			states: make(map[string]time.Time),
		},
	}
}

// GeneratePKCE generates PKCE code verifier and challenge
func GeneratePKCE() (*PKCEData, error) {
	// Generate 128 bytes random string for code verifier
	b := make([]byte, 128)
	if _, err := rand.Read(b); err != nil {
		return nil, err
	}
	codeVerifier := base64.RawURLEncoding.EncodeToString(b)

	// Generate code challenge (S256)
	h := sha256.New()
	h.Write([]byte(codeVerifier))
	codeChallenge := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	return &PKCEData{
		CodeVerifier:  codeVerifier,
		CodeChallenge: codeChallenge,
	}, nil
}

// GenerateState generates a random state parameter
func GenerateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// StoreState stores a state parameter with expiration
func (s *StateStore) StoreState(state string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.states[state] = time.Now().Add(10 * time.Minute)
}

// ValidateState validates and removes a state parameter
func (s *StateStore) ValidateState(state string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	expiry, exists := s.states[state]
	if !exists {
		return false
	}
	delete(s.states, state)
	return time.Now().Before(expiry)
}

// CleanupExpiredStates removes expired states
func (s *StateStore) CleanupExpiredStates() {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for state, expiry := range s.states {
		if now.After(expiry) {
			delete(s.states, state)
		}
	}
}

// GetAuthorizationURL returns the LINE WORKS authorization URL
func (a *OIDCAuthenticator) GetAuthorizationURL(state, codeChallenge string) string {
	params := url.Values{}
	params.Set("client_id", a.clientID)
	params.Set("redirect_uri", a.redirectURI)
	params.Set("response_type", "code")
	params.Set("scope", "openid email profile")
	params.Set("state", state)
	params.Set("code_challenge", codeChallenge)
	params.Set("code_challenge_method", "S256")

	return fmt.Sprintf("https://auth.worksmobile.com/oauth2/v2.0/authorize?%s", params.Encode())
}

// ExchangeCode exchanges authorization code for tokens
func (a *OIDCAuthenticator) ExchangeCode(code, codeVerifier string) (*OIDCTokenResponse, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", a.clientID)
	data.Set("client_secret", a.clientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", a.redirectURI)
	data.Set("code_verifier", codeVerifier)

	req, err := http.NewRequest("POST", "https://auth.worksmobile.com/oauth2/v2.0/token", strings.NewReader(data.Encode()))
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
		return nil, fmt.Errorf("failed to exchange code: %s", string(body))
	}

	var tokenResp OIDCTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

// GetUserInfo gets user info from LINE WORKS API using access token
func (a *OIDCAuthenticator) GetUserInfo(accessToken string) (*OIDCUserInfo, error) {
	req, err := http.NewRequest("GET", "https://www.worksapis.com/v1.0/users/me", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get user info: %s", string(body))
	}

	var userInfo OIDCUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}

// ParseIDToken は id_token のクレームからユーザー情報を取り出す。
//
// users/me（worksapis.com）を叩く GetUserInfo は Works API 側のスコープが
// 別途必要で、付与されていないと FORBIDDEN / has not permission api scope になる。
// id_token は openid email profile の範囲で既に取得できているため、
// 追加の権限を要求せずに済むこちらを使う。
//
// 署名検証は行わない。id_token を token エンドポイントから TLS 経由で
// 直接受け取っており（client_secret による認証済み）、OIDC Core 3.1.3.7 が
// 認めるケースに該当する。第三者経由で id_token を受け取る作りに変える場合は
// 署名検証が必須になる。
func (a *OIDCAuthenticator) ParseIDToken(idToken string) (*OIDCUserInfo, error) {
	parts := strings.Split(idToken, ".")
	if len(parts) < 2 {
		return nil, fmt.Errorf("id_token の形式が不正です")
	}

	payload, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(parts[1], "="))
	if err != nil {
		return nil, fmt.Errorf("id_token のペイロードを復号できません: %w", err)
	}

	var claims struct {
		Sub     string `json:"sub"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("id_token のクレームを解釈できません: %w", err)
	}

	if claims.Email == "" {
		return nil, fmt.Errorf("id_token に email が含まれていません")
	}

	// users.display_name は NOT NULL のため、name が無い場合の代替を用意する
	displayName := claims.Name
	if displayName == "" {
		displayName = strings.Split(claims.Email, "@")[0]
	}

	return &OIDCUserInfo{
		UserID:      claims.Sub,
		DisplayName: displayName,
		Email:       claims.Email,
		PhotoUrl:    claims.Picture,
	}, nil
}

// AuthenticateOIDCUser authenticates a user with OIDC credentials
func (a *OIDCAuthenticator) AuthenticateOIDCUser(userInfo *OIDCUserInfo) (*User, error) {
	// Check if user exists by email (OIDC users are identified by email)
	user, err := a.db.GetUserByEmail(userInfo.Email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

// GenerateToken creates a JWT token for a user
func (a *OIDCAuthenticator) GenerateToken(user *User) (string, error) {
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
func (a *OIDCAuthenticator) ValidateToken(tokenString string) (*User, error) {
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
