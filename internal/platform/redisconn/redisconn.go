package redisconn

import (
	"crypto/tls"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
	"github.com/vjt/spiritualmeet/internal/platform/config"
)

func ClientOptions(cfg config.Config) *redis.Options {
	opts := &redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	}
	if cfg.RedisTLS {
		opts.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12}
	}
	return opts
}

func AsynqRedisOpt(cfg config.Config) asynq.RedisClientOpt {
	o := asynq.RedisClientOpt{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	}
	if cfg.RedisTLS {
		o.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12}
	}
	return o
}
