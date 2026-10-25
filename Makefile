# Shortcuts for the Docker commands in README.md.
#   make setup_tv IP=192.168.1.50 PASS=ABC123   once: register the TV and fetch its key (the passphrase is
#                                               on the TV, in the Developer Mode app)
#   make install_tv                             install or update the app on the TV (renews Developer Mode
#                                               when under 7 days are left)
#   make preview                                the app on http://localhost:8080

TV ?= tv
CLI = docker compose run --rm cli

.PHONY: setup_tv install_tv preview stop package

# getkey downloads the key (its passphrase prompt needs a terminal, so it is given to the device's settings
# instead): no terminal needed
setup_tv:
	@test -n "$(IP)" -a -n "$(PASS)" || { echo "Usage: make setup_tv IP=<the TV's IP> PASS=<passphrase>"; exit 1; }
	$(CLI) ares-setup-device -a $(TV) -i "host=$(IP)" -i "port=9922" -i "username=prisoner" -i "default=true" \
		|| $(CLI) ares-setup-device -m $(TV) -i "host=$(IP)" -i "port=9922" -i "username=prisoner" -i "default=true"
	docker compose run --rm -T cli ares-novacom -d $(TV) --getkey < /dev/null || true
	$(CLI) ares-setup-device -m $(TV) -i "privatekey=$(TV)_webos" -i "passphrase=$(PASS)"
	$(CLI) ares-device -i -d $(TV)

install_tv:
	docker compose run --rm --build cli install-tv $(TV)

preview:
	docker compose up -d --build preview
	@echo "http://localhost:8080"

stop:
	docker compose down

package:
	docker build --target ipk --output dist .
