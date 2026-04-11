.PHONY: install dev paper live build typecheck clean

install:
	npm install

dev:
	npm run dev

paper:
	MODE=paper npm run paper

live:
	MODE=live npm run live

build:
	npm run build

typecheck:
	npm run typecheck

clean:
	rm -rf dist node_modules
