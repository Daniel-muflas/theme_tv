# Shortcuts for the Docker commands in README.md.
#   make setup_tv IP=192.168.1.50   once: register the TV and fetch its key (asks for the passphrase)
#   make install_tv                 install or update the app on the TV, renewing Developer Mode
#   make preview                    the app on http://localhost:8080

TV ?= tv
CLI = docker compose run --rm cli

.PHONY: setup_tv install_tv preview stop package

setup_tv:
	@test -n "$(IP)" || { echo "Usage: make setup_tv IP=<the TV's IP>"; exit 1; }
	$(CLI) ares-setup-device -a $(TV) -i "host=$(IP)" -i "port=9922" -i "username=prisoner" -i "default=true"
	$(CLI) ares-novacom -d $(TV) --getkey

install_tv:
	docker compose run --rm --build cli install-tv $(TV)

preview:
	docker compose up -d --build preview
	@echo "http://localhost:8080"

stop:
	docker compose down

package:
	docker build --target ipk --output dist .
