.PHONY: install build test dev docker-up prisma-generate db-push db-seed clean

install:
	npm install

build: prisma-generate
	npm run build

test:
	npm run test

dev:
	npm run dev

docker-up:
	docker compose up -d

prisma-generate:
	npm run prisma:generate

db-push:
	npm run prisma:migrate

db-seed:
	npm run prisma:seed

clean:
	rm -rf dist node_modules apps/api/dist apps/api/node_modules apps/worker/dist apps/worker/node_modules packages/database/dist packages/database/node_modules packages/shared/dist packages/shared/node_modules packages/sdk/dist packages/sdk/node_modules
