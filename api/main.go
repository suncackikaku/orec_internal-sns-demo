package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"api/auth"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// DBAuth implements auth.DBInterface
type DBAuth struct {
	db *sqlx.DB
}

func (d *DBAuth) GetUserByEmail(email string) (*auth.User, error) {
	var user auth.User
	err := d.db.Get(&user, `
		SELECT id, display_name, email, primary_department_id 
		FROM users 
		WHERE email = $1 AND auth_provider = 'local'`, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, auth.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (d *DBAuth) GetUserByID(id string) (*auth.User, error) {
	var user auth.User
	err := d.db.Get(&user, `
		SELECT id, display_name, email, primary_department_id 
		FROM users 
		WHERE id = $1`, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, auth.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

type Department struct {
	ID            string         `json:"id" db:"id"`
	Name          string         `json:"name" db:"name"`
	Catchcopy     string         `json:"catchcopy" db:"catchcopy"`
	Description   string         `json:"description" db:"description"`
	CoverImageURL string         `json:"cover_image_url" db:"cover_image_url"`
	ManagerUserID sql.NullString `json:"manager_user_id" db:"manager_user_id"`
}

type User struct {
	ID                  string         `json:"id" db:"id"`
	DisplayName         string         `json:"display_name" db:"display_name"`
	PrimaryDepartmentID sql.NullString `json:"primary_department_id" db:"primary_department_id"`
	ProfileImageURL     string         `json:"profile_image_url" db:"profile_image_url"`
}

type UserProfile struct {
	UserID          string `json:"user_id" db:"user_id"`
	DisplayName     string `json:"display_name" db:"display_name"`
	Email           string `json:"email" db:"email"`
	Bio             string `json:"bio" db:"bio"`
	Hobbies         string `json:"hobbies" db:"hobbies"`
	Skills          string `json:"skills" db:"skills"`
	JoinedYear      int    `json:"joined_year" db:"joined_year"`
	CareerHistory   string `json:"career_history" db:"career_history"`
	ProfileImageURL string `json:"profile_image_url" db:"profile_image_url"`
	DepartmentName  string `json:"department_name" db:"department_name"`
}

type Post struct {
	ID         string    `json:"id" db:"id"`
	AuthorID   string    `json:"author_id" db:"author_id"`
	AuthorName string    `json:"author_name" db:"author_name"`
	Body       string    `json:"body" db:"body"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type DepartmentResponse struct {
	Department Department `json:"department"`
	Members    []User     `json:"members"`
	Posts      []Post     `json:"posts"`
}

type RegisterRequest struct {
	DisplayName  string `json:"display_name"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	DepartmentID string `json:"department_id"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string    `json:"token"`
	User  auth.User `json:"user"`
}

type UpdateProfileRequest struct {
	Bio             string `json:"bio"`
	Hobbies         string `json:"hobbies"`
	Skills          string `json:"skills"`
	CareerHistory   string `json:"career_history"`
	ProfileImageURL string `json:"profile_image_url"`
}

type SearchResult struct {
	Users       []SearchUser       `json:"users"`
	Departments []SearchDepartment `json:"departments"`
	Posts       []SearchPost       `json:"posts"`
}

type SearchUser struct {
	ID              string `json:"id" db:"id"`
	DisplayName     string `json:"display_name" db:"display_name"`
	DepartmentName  string `json:"department_name" db:"department_name"`
	ProfileImageURL string `json:"profile_image_url" db:"profile_image_url"`
	MatchedField    string `json:"matched_field" db:"matched_field"`
	MatchedText     string `json:"matched_text" db:"matched_text"`
}

type SearchDepartment struct {
	ID            string `json:"id" db:"id"`
	Name          string `json:"name" db:"name"`
	Catchcopy     string `json:"catchcopy" db:"catchcopy"`
	CoverImageURL string `json:"cover_image_url" db:"cover_image_url"`
	MatchedField  string `json:"matched_field" db:"matched_field"`
}

type SearchPost struct {
	ID          string    `json:"id" db:"id"`
	AuthorName  string    `json:"author_name" db:"author_name"`
	Body        string    `json:"body" db:"body"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	MatchedText string    `json:"matched_text" db:"matched_text"`
}

type Activity struct {
	ID        string    `json:"id" db:"id"`
	ActorID   string    `json:"actor_id" db:"actor_id"`
	ActorName string    `json:"actor_name" db:"actor_name"`
	Type      string    `json:"type" db:"type"`
	Message   string    `json:"message" db:"message"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

var db *sqlx.DB
var authenticator *auth.LocalAuthenticator

// ActivityChannel for SSE broadcasting
var activityChannel = make(chan Activity, 100)
var activityClients = make(map[chan Activity]bool)
var activityClientsMutex sync.Mutex

func (d *DBAuth) GetUserByWoffID(woffID string) (*auth.User, error) {
	var user auth.User
	err := d.db.Get(&user, `
		SELECT id, display_name, email, primary_department_id 
		FROM users 
		WHERE woff_id = $1`, woffID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, auth.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (d *DBAuth) CreateWoffUser(woffID, displayName, domainID string) (*auth.User, error) {
	var userID string
	err := d.db.QueryRow(`
		INSERT INTO users (id, display_name, email, auth_provider, woff_id, domain_id, primary_department_id)
		VALUES (gen_random_uuid(), $1, $2, 'woff', $3, $4, NULL)
		RETURNING id::text`,
		displayName, fmt.Sprintf("%s@lineworks", woffID), woffID, domainID).Scan(&userID)
	if err != nil {
		return nil, err
	}

	// Create empty profile
	_, err = d.db.Exec(`
		INSERT INTO user_profiles (user_id)
		VALUES ($1)`, userID)
	if err != nil {
		return nil, err
	}

	return d.GetUserByID(userID)
}

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://snsuser:snspassword@localhost:5432/snsdb?sslmode=disable"
	}

	var err error
	db, err = sqlx.Connect("postgres", databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Initialize authenticator
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key-change-in-production"
	}
	dbAuth := &DBAuth{db: db}
	authenticator = auth.NewLocalAuthenticator(jwtSecret, dbAuth)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}))

	// Public routes
	r.Post("/api/auth/register", registerHandler)
	r.Post("/api/auth/login", loginHandler)
	r.Post("/api/auth/woff", woffAuthHandler)
	r.Get("/api/departments", getDepartmentsList)
	r.Get("/api/departments/{deptId}", getDepartment)
	r.Get("/api/users/{userId}/profile", getUserProfile)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)
		r.Get("/api/auth/me", getMeHandler)
		r.Put("/api/users/me/profile", updateProfileHandler)
		r.Get("/api/search", searchHandler)
		r.Get("/api/users", getUsersList)
		r.Get("/api/activities", getActivitiesHandler)
		r.Get("/api/activities/stream", activitiesStreamHandler)

		// フォロー機能
		r.Post("/api/users/{userId}/follow", followHandler)
		r.Delete("/api/users/{userId}/follow", unfollowHandler)
		r.Get("/api/users/{userId}/followers", getFollowersHandler)
		r.Get("/api/users/{userId}/following", getFollowingHandler)
		r.Get("/api/users/{userId}/is-following", isFollowingHandler)

		// いいね機能
		r.Post("/api/posts/{postId}/like", likeHandler)
		r.Delete("/api/posts/{postId}/like", unlikeHandler)
		r.Get("/api/posts/{postId}/likes", getLikesHandler)
		r.Get("/api/posts/{postId}/is-liked", isLikedHandler)

		// フィード機能
		r.Get("/api/feed", getFeedHandler)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		var tokenString string

		// Try Authorization header first
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			tokenString = strings.Replace(authHeader, "Bearer ", "", 1)
		} else {
			// Fallback to query parameter for SSE
			tokenString = r.URL.Query().Get("token")
		}

		if tokenString == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		user, err := authenticator.ValidateToken(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Store user in context
		ctx := r.Context()
		ctx = context.WithValue(ctx, "user", user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Hash password
	hash, err := authenticator.HashPassword(req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Insert user
	var userID string
	err = db.QueryRow(`
		INSERT INTO users (display_name, email, password_hash, auth_provider, primary_department_id)
		VALUES ($1, $2, $3, 'local', $4)
		RETURNING id`,
		req.DisplayName, req.Email, hash, req.DepartmentID).Scan(&userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create empty profile
	_, err = db.Exec(`
		INSERT INTO user_profiles (user_id)
		VALUES ($1)`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create activity for new user registration
	activityMessage := fmt.Sprintf("%sさんが新規追加されました", req.DisplayName)
	err = createActivity(userID, "user_registered", activityMessage)
	if err != nil {
		// Log error but don't fail registration
		fmt.Printf("Failed to create activity: %v\n", err)
	}

	// Get user and generate token
	user, err := (&DBAuth{db: db}).GetUserByID(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	token, err := authenticator.GenerateToken(user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{Token: token, User: *user})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get user with password hash
	var user struct {
		auth.User
		PasswordHash string `db:"password_hash"`
	}
	err := db.Get(&user, `
		SELECT id, display_name, email, primary_department_id, password_hash
		FROM users
		WHERE email = $1 AND auth_provider = 'local'`, req.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Check password
	if !authenticator.CheckPassword(req.Password, user.PasswordHash) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Generate token
	authUser := &auth.User{
		ID:           user.ID,
		DisplayName:  user.DisplayName,
		Email:        user.Email,
		DepartmentID: user.DepartmentID,
	}
	token, err := authenticator.GenerateToken(authUser)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{Token: token, User: *authUser})
}

func getMeHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*auth.User)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func updateProfileHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*auth.User)

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Update user_profiles
	_, err := db.Exec(`
		UPDATE user_profiles
		SET bio = $1, hobbies = $2, skills = $3, career_history = $4, profile_image_url = $5
		WHERE user_id = $6`,
		req.Bio, req.Hobbies, req.Skills, req.CareerHistory, req.ProfileImageURL, user.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create activity for profile update
	activityMessage := fmt.Sprintf("%sさんがプロフィールを更新しました", user.DisplayName)
	err = createActivity(user.ID, "profile_update", activityMessage)
	if err != nil {
		// Log error but don't fail update
		fmt.Printf("Failed to create activity: %v\n", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Profile updated successfully"})
}

func getDepartmentsList(w http.ResponseWriter, r *http.Request) {
	var departments []Department
	err := db.Select(&departments, "SELECT * FROM departments ORDER BY name")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(departments)
}

func getDepartment(w http.ResponseWriter, r *http.Request) {
	deptID := chi.URLParam(r, "deptId")

	var dept Department
	err := db.Get(&dept, "SELECT * FROM departments WHERE id = $1", deptID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Department not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var members []User
	err = db.Select(&members, `
		SELECT u.id, u.display_name, u.primary_department_id, COALESCE(up.profile_image_url, '') as profile_image_url 
		FROM users u 
		LEFT JOIN user_profiles up ON u.id = up.user_id 
		WHERE u.primary_department_id = $1`, deptID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var posts []Post
	err = db.Select(&posts, `
		SELECT p.id, p.author_id, u.display_name as author_name, p.body, p.created_at 
		FROM posts p 
		JOIN users u ON p.author_id = u.id 
		WHERE u.primary_department_id = $1 
		ORDER BY p.created_at DESC`, deptID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := DepartmentResponse{
		Department: dept,
		Members:    members,
		Posts:      posts,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getUserProfile(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")

	var profile UserProfile
	err := db.Get(&profile, `
		SELECT u.id as user_id, u.display_name, u.email, COALESCE(up.bio, '') as bio, COALESCE(up.hobbies, '') as hobbies, COALESCE(up.skills, '') as skills, 
			COALESCE(up.joined_year, 0) as joined_year, COALESCE(up.career_history, '') as career_history, COALESCE(up.profile_image_url, '') as profile_image_url, COALESCE(d.name, '') as department_name 
		FROM users u 
		LEFT JOIN user_profiles up ON u.id = up.user_id 
		LEFT JOIN departments d ON u.primary_department_id = d.id 
		WHERE u.id = $1`, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

func searchHandler(w http.ResponseWriter, r *http.Request) {
	keyword := r.URL.Query().Get("q")
	if keyword == "" {
		http.Error(w, "検索キーワードを入力してください", http.StatusBadRequest)
		return
	}

	likeKeyword := "%" + keyword + "%"
	result := SearchResult{}

	// 社員検索
	var users []SearchUser
	err := db.Select(&users, `
		SELECT u.id, u.display_name, COALESCE(d.name, '') as department_name, COALESCE(up.profile_image_url, '') as profile_image_url,
			CASE 
				WHEN u.display_name ILIKE $1 THEN 'name'
				WHEN up.skills ILIKE $1 THEN 'skills'
				WHEN up.hobbies ILIKE $1 THEN 'hobbies'
				WHEN up.bio ILIKE $1 THEN 'bio'
				ELSE 'other'
			END as matched_field,
			COALESCE(up.skills, up.hobbies, up.bio, u.display_name) as matched_text
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		LEFT JOIN departments d ON u.primary_department_id = d.id
		WHERE u.display_name ILIKE $1 
			OR up.skills ILIKE $1 
			OR up.hobbies ILIKE $1 
			OR up.bio ILIKE $1
		ORDER BY u.created_at DESC
		LIMIT 10`, likeKeyword)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	result.Users = users

	// 部署検索
	var departments []SearchDepartment
	err = db.Select(&departments, `
		SELECT id, name, catchcopy, cover_image_url,
			CASE 
				WHEN name ILIKE $1 THEN 'name'
				WHEN catchcopy ILIKE $1 THEN 'catchcopy'
				ELSE 'description'
			END as matched_field
		FROM departments
		WHERE name ILIKE $1 
			OR catchcopy ILIKE $1 
			OR description ILIKE $1
		ORDER BY name
		LIMIT 10`, likeKeyword)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	result.Departments = departments

	// 投稿検索
	var posts []SearchPost
	err = db.Select(&posts, `
		SELECT p.id, u.display_name as author_name, p.body, p.created_at,
			p.body as matched_text
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.body ILIKE $1
		ORDER BY p.created_at DESC
		LIMIT 10`, likeKeyword)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	result.Posts = posts

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

type UsersListResponse struct {
	Users      []UserListItem `json:"users"`
	TotalCount int            `json:"total_count"`
	Page       int            `json:"page"`
	PerPage    int            `json:"per_page"`
}

type UserListItem struct {
	ID              string `json:"id" db:"id"`
	DisplayName     string `json:"display_name" db:"display_name"`
	DepartmentName  string `json:"department_name" db:"department_name"`
	ProfileImageURL string `json:"profile_image_url" db:"profile_image_url"`
}

func getUsersList(w http.ResponseWriter, r *http.Request) {
	page := 1
	perPage := 12

	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	if pp := r.URL.Query().Get("per_page"); pp != "" {
		if parsed, err := strconv.Atoi(pp); err == nil && parsed > 0 {
			perPage = parsed
		}
	}

	departmentID := r.URL.Query().Get("department_id")
	searchKeyword := r.URL.Query().Get("q")

	offset := (page - 1) * perPage

	// Build query
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argCount := 0

	if departmentID != "" {
		argCount++
		whereClause += fmt.Sprintf(" AND u.primary_department_id = $%d", argCount)
		args = append(args, departmentID)
	}

	if searchKeyword != "" {
		argCount++
		whereClause += fmt.Sprintf(" AND (u.display_name ILIKE $%d OR up.bio ILIKE $%d OR up.skills ILIKE $%d OR up.hobbies ILIKE $%d)", argCount, argCount, argCount, argCount)
		args = append(args, "%"+searchKeyword+"%")
	}

	// Get total count
	var totalCount int
	countQuery := "SELECT COUNT(*) FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id " + whereClause
	err := db.Get(&totalCount, countQuery, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get users
	argCount++
	limitOffset := fmt.Sprintf(" ORDER BY u.display_name LIMIT $%d OFFSET $%d", argCount, argCount+1)
	args = append(args, perPage, offset)

	var users []UserListItem
	query := `
		SELECT u.id, u.display_name, COALESCE(d.name, '') as department_name, COALESCE(up.profile_image_url, '') as profile_image_url
		FROM users u
		LEFT JOIN user_profiles up ON u.id = up.user_id
		LEFT JOIN departments d ON u.primary_department_id = d.id
	` + whereClause + limitOffset

	err = db.Select(&users, query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := UsersListResponse{
		Users:      users,
		TotalCount: totalCount,
		Page:       page,
		PerPage:    perPage,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func getActivitiesHandler(w http.ResponseWriter, r *http.Request) {
	var activities []Activity
	err := db.Select(&activities, `
		SELECT a.id, a.actor_id, u.display_name as actor_name, a.type, a.message, a.created_at
		FROM activities a
		JOIN users u ON a.actor_id = u.id
		ORDER BY a.created_at DESC
		LIMIT 10`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(activities)
}

func createActivity(actorID string, activityType string, message string) error {
	_, err := db.Exec(`
		INSERT INTO activities (actor_id, type, message)
		VALUES ($1, $2, $3)`,
		actorID, activityType, message)
	if err != nil {
		return err
	}

	// Fetch the created activity with actor name
	var activity Activity
	err = db.Get(&activity, `
		SELECT a.id, a.actor_id, u.display_name as actor_name, a.type, a.message, a.created_at
		FROM activities a
		JOIN users u ON a.actor_id = u.id
		WHERE a.actor_id = $1
		ORDER BY a.created_at DESC
		LIMIT 1`, actorID)
	if err != nil {
		return err
	}

	// Broadcast to all connected clients
	activityClientsMutex.Lock()
	defer activityClientsMutex.Unlock()
	for client := range activityClients {
		select {
		case client <- activity:
		default:
			// Client buffer full, skip
		}
	}

	return nil
}

// Follow handlers
func followHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*auth.User)
	targetID := chi.URLParam(r, "userId")

	if user.ID == targetID {
		http.Error(w, "Cannot follow yourself", http.StatusBadRequest)
		return
	}

	_, err := db.Exec(`
		INSERT INTO followers (follower_id, following_id)
		VALUES ($1, $2)
		ON CONFLICT (follower_id, following_id) DO NOTHING`,
		user.ID, targetID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Followed successfully"})
}

func unfollowHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*auth.User)
	targetID := chi.URLParam(r, "userId")

	_, err := db.Exec(`
		DELETE FROM followers
		WHERE follower_id = $1 AND following_id = $2`,
		user.ID, targetID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Unfollowed successfully"})
}

func getFollowersHandler(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")

	var followers []User
	err := db.Select(&followers, `
		SELECT u.id, u.display_name, COALESCE(up.profile_image_url, '') as profile_image_url
		FROM followers f
		JOIN users u ON f.follower_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE f.following_id = $1
		ORDER BY f.created_at DESC`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(followers)
}

func getFollowingHandler(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userId")

	var following []User
	err := db.Select(&following, `
		SELECT u.id, u.display_name, COALESCE(up.profile_image_url, '') as profile_image_url
		FROM followers f
		JOIN users u ON f.following_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		WHERE f.follower_id = $1
		ORDER BY f.created_at DESC`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(following)
}

func isFollowingHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*auth.User)
	targetID := chi.URLParam(r, "userId")

	var count int
	err := db.Get(&count, `
		SELECT COUNT(*) FROM followers
		WHERE follower_id = $1 AND following_id = $2`,
		user.ID, targetID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"is_following": count > 0})
}

// Like handlers
func likeHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*auth.User)
	postID := chi.URLParam(r, "postId")

	_, err := db.Exec(`
		INSERT INTO likes (user_id, post_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, post_id) DO NOTHING`,
		user.ID, postID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Liked successfully"})
}

func unlikeHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*auth.User)
	postID := chi.URLParam(r, "postId")

	_, err := db.Exec(`
		DELETE FROM likes
		WHERE user_id = $1 AND post_id = $2`,
		user.ID, postID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Unliked successfully"})
}

func getLikesHandler(w http.ResponseWriter, r *http.Request) {
	postID := chi.URLParam(r, "postId")

	var count int
	err := db.Get(&count, `
		SELECT COUNT(*) FROM likes
		WHERE post_id = $1`, postID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"count": count})
}

func isLikedHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*auth.User)
	postID := chi.URLParam(r, "postId")

	var count int
	err := db.Get(&count, `
		SELECT COUNT(*) FROM likes
		WHERE user_id = $1 AND post_id = $2`,
		user.ID, postID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"is_liked": count > 0})
}

// Feed handler
func getFeedHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*auth.User)

	page := 1
	perPage := 20

	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	if pp := r.URL.Query().Get("per_page"); pp != "" {
		if parsed, err := strconv.Atoi(pp); err == nil && parsed > 0 {
			perPage = parsed
		}
	}

	offset := (page - 1) * perPage

	var posts []struct {
		Post
		AuthorImageURL string `json:"author_image_url" db:"author_image_url"`
		LikeCount      int    `json:"like_count" db:"like_count"`
		IsLiked        bool   `json:"is_liked" db:"is_liked"`
	}

	err := db.Select(&posts, `
		SELECT 
			p.id, p.author_id, u.display_name as author_name, p.body, p.created_at,
			COALESCE(up.profile_image_url, '') as author_image_url,
			COALESCE(l.count, 0) as like_count,
			CASE WHEN ul.user_id IS NOT NULL THEN true ELSE false END as is_liked
		FROM posts p
		JOIN users u ON p.author_id = u.id
		LEFT JOIN user_profiles up ON u.id = up.user_id
		LEFT JOIN (
			SELECT post_id, COUNT(*) as count 
			FROM likes 
			GROUP BY post_id
		) l ON p.id = l.post_id
		LEFT JOIN likes ul ON p.id = ul.post_id AND ul.user_id = $1
		WHERE p.author_id = $1 
			OR p.author_id IN (
				SELECT following_id 
				FROM followers 
				WHERE follower_id = $1
			)
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3`,
		user.ID, perPage, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

func activitiesStreamHandler(w http.ResponseWriter, r *http.Request) {
	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Create a client channel
	client := make(chan Activity, 10)

	// Register client
	activityClientsMutex.Lock()
	activityClients[client] = true
	activityClientsMutex.Unlock()

	// Unregister client when connection closes
	defer func() {
		activityClientsMutex.Lock()
		delete(activityClients, client)
		activityClientsMutex.Unlock()
		close(client)
	}()

	// Send initial activities
	var activities []Activity
	err := db.Select(&activities, `
		SELECT a.id, a.actor_id, u.display_name as actor_name, a.type, a.message, a.created_at
		FROM activities a
		JOIN users u ON a.actor_id = u.id
		ORDER BY a.created_at DESC
		LIMIT 10`)
	if err == nil {
		for i := len(activities) - 1; i >= 0; i-- {
			activityJSON, _ := json.Marshal(activities[i])
			fmt.Fprintf(w, "data: %s\n\n", activityJSON)
		}
		w.(http.Flusher).Flush()
	}

	// Listen for new activities
	for {
		select {
		case activity := <-client:
			activityJSON, err := json.Marshal(activity)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", activityJSON)
			w.(http.Flusher).Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func woffAuthHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID      string `json:"userId"`
		DisplayName string `json:"displayName"`
		DomainID    string `json:"domainId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	dbAuth := &DBAuth{db: db}

	// Check if user already exists with this WOFF ID
	user, err := dbAuth.GetUserByWoffID(req.UserID)
	if err != nil {
		if err == auth.ErrUserNotFound {
			// Create new user
			user, err = dbAuth.CreateWoffUser(req.UserID, req.DisplayName, req.DomainID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// Create activity for new user registration
			activityMessage := fmt.Sprintf("%sさんが新規追加されました", req.DisplayName)
			createActivity(user.ID, "user_registered", activityMessage)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Generate token
	token, err := authenticator.GenerateToken(user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{Token: token, User: *user})
}
