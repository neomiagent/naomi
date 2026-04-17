.PHONY: install dev scan build typecheck clean

install:
	npm install

dev:
	npm run dev

scan:
	npm run scan

build:
	npm run build

typecheck:
	npm run typecheck

clean:
	rm -rf dist node_modules
