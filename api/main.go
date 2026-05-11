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
	ID                  string `json:"id" db:"id"`
	DisplayName         string `json:"display_name" db:"display_name"`
	PrimaryDepartmentID string `json:"primary_department_id" db:"primary_department_id"`
	ProfileImageURL     string `json:"profile_image_url" db:"profile_image_url"`
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
		SELECT u.id, u.display_name, u.primary_department_id, up.profile_image_url 
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
		SELECT u.id as user_id, u.display_name, u.email, up.bio, up.hobbies, up.skills, 
			up.joined_year, up.career_history, up.profile_image_url, d.name as department_name 
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
		SELECT u.id, u.display_name, d.name as department_name, up.profile_image_url,
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
		SELECT u.id, u.display_name, d.name as department_name, up.profile_image_url
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
