#!/usr/bin/env bash
# =============================================================================
#  ASAS Backend — Staging Server Bootstrap
#  Run this script ONCE on your staging VPS / bare-metal server as root (sudo).
#
#  What it does:
#   1. Installs Docker, Docker Compose plugin
#   2. Creates a dedicated "deploy" user for the GitHub Actions runner
#   3. Registers & starts the GitHub Actions self-hosted runner
#   4. Creates /opt/asas-backend with correct permissions
#
#  Usage:
#    sudo bash setup-staging-server.sh \
#         --gh-repo  "YOUR_ORG/asas-backend" \
#         --gh-token "YOUR_RUNNER_REGISTRATION_TOKEN"
#
#  Runner token: GitHub repo → Settings → Actions → Runners → New self-hosted runner
# =============================================================================
set -euo pipefail

# ── Parse args ────────────────────────────────────────────────────────────────
GH_REPO=""
GH_TOKEN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --gh-repo)  GH_REPO="$2";  shift 2 ;;
    --gh-token) GH_TOKEN="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$GH_REPO" || -z "$GH_TOKEN" ]]; then
  echo "Usage: $0 --gh-repo <owner/repo> --gh-token <registration-token>"
  exit 1
fi

DEPLOY_USER="deploy"
APP_DIR="/opt/asas-backend"
RUNNER_DIR="/home/${DEPLOY_USER}/actions-runner"
RUNNER_VERSION="2.323.0"   # Pin — check https://github.com/actions/runner/releases

echo "=========================================="
echo "  ASAS Staging Bootstrap"
echo "  Repo  : $GH_REPO"
echo "  Server: $(hostname)"
echo "=========================================="

# ── 1. System packages ────────────────────────────────────────────────────────
echo "[1/5] Installing system packages…"
apt-get update -qq
apt-get install -yq \
  curl wget git ca-certificates gnupg lsb-release \
  jq unzip

# ── 2. Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "[2/5] Installing Docker…"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -qq
  apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  echo "[2/5] Docker already installed — skipping."
fi

# ── 3. deploy user ────────────────────────────────────────────────────────────
echo "[3/5] Creating '${DEPLOY_USER}' user…"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi
# Allow deploy user to run Docker without sudo
usermod -aG docker "$DEPLOY_USER"

# ── 4. App directory ──────────────────────────────────────────────────────────
echo "[4/5] Setting up app directory at ${APP_DIR}…"
mkdir -p "$APP_DIR"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "$APP_DIR"
chmod 750 "$APP_DIR"

# ── 5. GitHub Actions self-hosted runner ─────────────────────────────────────
echo "[5/5] Installing GitHub Actions runner v${RUNNER_VERSION}…"
ARCH=$(dpkg --print-architecture)
case "$ARCH" in
  amd64)  RUNNER_ARCH="x64"   ;;
  arm64)  RUNNER_ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

RUNNER_PKG="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"

sudo -u "$DEPLOY_USER" bash <<RUNNER_SETUP
  set -euo pipefail
  mkdir -p "${RUNNER_DIR}"
  cd "${RUNNER_DIR}"

  if [ ! -f "run.sh" ]; then
    echo "  Downloading runner package…"
    curl -fsSL \
      "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_PKG}" \
      -o runner.tar.gz
    tar xzf runner.tar.gz
    rm runner.tar.gz
  else
    echo "  Runner binaries already present — skipping download."
  fi

  if [ ! -f ".runner" ]; then
    echo "  Configuring runner…"
    ./config.sh \
      --url "https://github.com/${GH_REPO}" \
      --token "${GH_TOKEN}" \
      --name  "staging-runner" \
      --labels "self-hosted,staging" \
      --work  "_work" \
      --unattended \
      --replace
  else
    echo "  Runner already configured — skipping."
  fi
RUNNER_SETUP

# Install as systemd service so it survives reboots
echo "  Installing runner as systemd service…"
pushd "$RUNNER_DIR" > /dev/null
./svc.sh install "$DEPLOY_USER"
./svc.sh start
popd > /dev/null

echo "  Runner service status:"
systemctl is-active "actions.runner.${GH_REPO//\//.}.staging-runner" || true

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ Bootstrap complete!"
echo ""
echo "  Next steps:"
echo "  1. Verify runner is online on GitHub:"
echo "     https://github.com/${GH_REPO}/settings/actions/runners"
echo "  2. Add required Secrets (STAGING_*) in:"
echo "     https://github.com/${GH_REPO}/settings/secrets/actions"
echo "  3. Push a commit to the 'staging' branch to trigger the"
echo "     deploy-staging.yml workflow."
echo "  4. Visit: https://staging.api.asasgate.net/api/v1/health"
echo "══════════════════════════════════════════════"
