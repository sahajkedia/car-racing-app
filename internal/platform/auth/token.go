package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenManager struct {
	secret []byte
}

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func NewTokenManager(secret string) *TokenManager {
	return &TokenManager{secret: []byte(secret)}
}

func (m *TokenManager) Issue(userID uuid.UUID) (string, error) {
	claims := Claims{
		UserID: userID.String(),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

func (m *TokenManager) Parse(raw string) (uuid.UUID, error) {
	token, err := jwt.ParseWithClaims(raw, &Claims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil {
		return uuid.Nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return uuid.Nil, fmt.Errorf("invalid token")
	}

	return uuid.Parse(claims.UserID)
}
