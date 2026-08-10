#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  FastFree CLI — System Management Tool                                      ║
# ║  https://fastfree.cloud                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -euo pipefail
IFS=$'\n\t'

## ═══════════════════════════════════════════════════════════════════════════════
##  METADATA & CONSTANTS
## ═══════════════════════════════════════════════════════════════════════════════

readonly VERSION="1.0.0"
readonly SCRIPT_NAME="fastfree"
readonly BOX_WIDTH=58

## ═══════════════════════════════════════════════════════════════════════════════
##  COLOR SYSTEM — TTY-aware + NO_COLOR standard (https://no-color.org)
## ═══════════════════════════════════════════════════════════════════════════════

if [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[0;33m'
    readonly BLUE='\033[0;34m'
    readonly MAGENTA='\033[0;35m'
    readonly CYAN='\033[0;36m'
    readonly BRIGHT_RED='\033[1;31m'
    readonly BRIGHT_GREEN='\033[1;32m'
    readonly BRIGHT_YELLOW='\033[1;33m'
    readonly BRIGHT_BLUE='\033[1;34m'
    readonly BRIGHT_CYAN='\033[1;36m'
    readonly BOLD='\033[1m'
    readonly DIM='\033[2m'
    readonly UNDERLINE='\033[4m'
    readonly NC='\033[0m'
else
    readonly RED='' GREEN='' YELLOW='' BLUE='' MAGENTA='' CYAN=''
    readonly BRIGHT_RED='' BRIGHT_GREEN='' BRIGHT_YELLOW='' BRIGHT_BLUE='' BRIGHT_CYAN=''
    readonly BOLD='' DIM='' UNDERLINE='' NC=''
fi

## ═══════════════════════════════════════════════════════════════════════════════
##  SYMBOLS & STATUS INDICATORS
## ═══════════════════════════════════════════════════════════════════════════════

readonly SYM_OK="${GREEN}✓${NC}"
readonly SYM_FAIL="${RED}✗${NC}"
readonly SYM_WARN="${YELLOW}⚠${NC}"
readonly SYM_INFO="${BLUE}ℹ${NC}"
readonly SYM_ARROW="${CYAN}→${NC}"
readonly SYM_BULLET="${DIM}•${NC}"

## ═══════════════════════════════════════════════════════════════════════════════
##  HELPER FUNCTIONS
## ═══════════════════════════════════════════════════════════════════════════════

get_flake_cfg() {
    cat /etc/fastfree/flake-config 2>/dev/null || hostname
}

# Detect project path — checks /etc/fastfree first, then common WSL mount paths
get_flake_path() {
    if [ -f /etc/fastfree/flake.nix ]; then
        echo "/etc/fastfree"
    elif [ -f "/mnt/d/2026/fastfree/dev/fastfree_os/flake.nix" ]; then
        echo "/mnt/d/2026/fastfree/dev/fastfree_os"
    elif [ -f "/mnt/c/2026/fastfree/dev/fastfree_os/flake.nix" ]; then
        echo "/mnt/c/2026/fastfree/dev/fastfree_os"
    else
        # Search /mnt/* for the project
        for drive in /mnt/*; do
            if [ -f "$drive/2026/fastfree/dev/fastfree_os/flake.nix" ]; then
                echo "$drive/2026/fastfree/dev/fastfree_os"
                return
            fi
        done
        echo ""
    fi
}

separator() {
    printf '%*s' "$BOX_WIDTH" '' | tr ' ' '─'
}

header() {
    echo ""
    echo -e "${BOLD}${BLUE}╔$(printf '═%.0s' $(seq 1 $((BOX_WIDTH - 2))))╗${NC}"
    printf "${BOLD}${BLUE}║${NC}  ${BOLD}${CYAN}FastFree${NC} ${DIM}fastfree.cloud${NC}"
    printf '%*s' $((BOX_WIDTH - 32)) ''
    echo -e "${BOLD}${BLUE}║${NC}"
    echo -e "${BOLD}${BLUE}╚$(printf '═%.0s' $(seq 1 $((BOX_WIDTH - 2))))╝${NC}"
    echo ""
}

check_service() {
    local svc="$1"
    local state
    state=$(systemctl is-active "$svc" 2>/dev/null || echo "inactive")
    [[ "$state" == "active" ]]
}

check_container() {
    local name="$1"
    local state
    state=$(podman inspect --format='{{.State.Status}}' "$name" 2>/dev/null || echo "not found")
    [[ "$state" == "running" ]]
}

## ═══════════════════════════════════════════════════════════════════════════════
##  BOX DRAWING HELPERS — Unicode box-drawing characters
## ═══════════════════════════════════════════════════════════════════════════════

box_top() {
    echo -e "${BOLD}${BLUE}╔$(printf '═%.0s' $(seq 1 $((BOX_WIDTH - 2))))╗${NC}"
}

box_bottom() {
    echo -e "${BOLD}${BLUE}╚$(printf '═%.0s' $(seq 1 $((BOX_WIDTH - 2))))╝${NC}"
}

box_sep() {
    echo -e "${BOLD}${BLUE}╠$(printf '═%.0s' $(seq 1 $((BOX_WIDTH - 2))))╣${NC}"
}

box_line() {
    local label="$1" value="$2"
    local content_width=$((BOX_WIDTH - 4))
    local label_len=${#label}
    local value_len
    value_len=$(echo -e "$value" | sed 's/\x1b\[[0-9;]*m//g' | wc -c)
    value_len=$((value_len - 1))
    local gap=$((content_width - label_len - value_len - 2))
    (( gap < 0 )) && gap=0
    printf "${BOLD}${BLUE}║${NC}  ${BOLD}%-12s${NC} %s%*s${BOLD}${BLUE}║${NC}\n" "$label" "$value" "$gap" ''
}

box_line_status() {
    local status="$1" name="$2"
    local content_width=$((BOX_WIDTH - 4))
    local name_len=${#name}
    local indicator
    if [[ "$status" == "up" ]]; then
        indicator="${GREEN}${SYM_OK}${NC}"
    else
        indicator="${DIM}●${NC}"
    fi
    local visible_len=$((name_len + 1))
    local gap=$((content_width - visible_len))
    (( gap < 0 )) && gap=0
    printf "${BOLD}${BLUE}║${NC}  %s %s%*s${BOLD}${BLUE}║${NC}\n" "$indicator" "$name" "$gap" ''
}

center_text() {
    local text="$1"
    local width="$2"
    local stripped
    stripped=$(echo -e "$text" | sed 's/\x1b\[[0-9;]*m//g')
    local len=${#stripped}
    local pad_left=$(( (width - len) / 2 ))
    local pad_right=$(( width - len - pad_left ))
    printf "%*s%s%*s" "$pad_left" '' "$text" "$pad_right" ''
}

## ═══════════════════════════════════════════════════════════════════════════════
##  PROGRESS BAR — Color-coded ████░░░░░░ style
## ═══════════════════════════════════════════════════════════════════════════════

progress_bar() {
    local percent="${1:-0}" width="${2:-20}"
    local filled=$((percent * width / 100))
    local empty=$((width - filled))
    (( filled < 0 )) && filled=0
    (( empty < 0 )) && empty=0

    local color="${GREEN}"
    (( percent > 75 )) && color="${YELLOW}"
    (( percent > 90 )) && color="${RED}"

    printf "${color}"
    printf '█%.0s' $(seq 1 "$filled" 2>/dev/null) || true
    printf "${DIM}"
    printf '░%.0s' $(seq 1 "$empty" 2>/dev/null) || true
    printf "${NC}"
}

## ═══════════════════════════════════════════════════════════════════════════════
##  SYSTEM INFO COLLECTION — Gathers data for display functions
## ═══════════════════════════════════════════════════════════════════════════════

collect_system_info() {
    HOSTNAME_STR=$(hostname 2>/dev/null || echo "unknown")
    IP_STR=$(ip -4 addr show scope global 2>/dev/null | grep -oP '(?<=inet\s)\d+\.\d+\.\d+\.\d+' | head -1 || echo "N/A")

    if [[ -f /etc/os-release ]]; then
        # shellcheck disable=SC1091
        source /etc/os-release 2>/dev/null
        OS_STR="${PRETTY_NAME:-$ID $VERSION_ID}"
    else
        OS_STR=$(uname -srm 2>/dev/null || echo "unknown")
    fi

    KERNEL_STR=$(uname -r 2>/dev/null || echo "unknown")
    UPTIME_STR=$(uptime -p 2>/dev/null | sed 's/^up //' || echo "N/A")
    LOAD_STR=$(awk '{print $1, $2, $3}' /proc/loadavg 2>/dev/null || echo "? ? ?")

    if command -v free &>/dev/null; then
        MEM_TOTAL=$(free -h | awk '/Mem:/ {print $2}')
        MEM_USED=$(free -h | awk '/Mem:/ {print $3}')
        MEM_PCT=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
    else
        MEM_TOTAL="N/A"
        MEM_USED="N/A"
        MEM_PCT=0
    fi

    DISK_USED=$(df -h / 2>/dev/null | awk 'NR==2 {print $3}' || echo "?")
    DISK_TOTAL=$(df -h / 2>/dev/null | awk 'NR==2 {print $2}' || echo "?")
    DISK_PCT=$(df / 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}' || echo "0")

    NIXOS_VER=$(nixos-version 2>/dev/null || echo "unknown")
}

# ─────────────────────────────────────────────────────────────────────────────
#  print_banner()  —  Professional MOTD (runs at CLI startup)
# ─────────────────────────────────────────────────────────────────────────────
print_banner() {
    collect_system_info
    local flake_host
    flake_host=$(get_flake_cfg 2>/dev/null || echo "unknown")

    local content_width=$((BOX_WIDTH - 4))

    box_top
    printf "│ %-*s │\n" "$content_width" ""
    printf "│ %-*s │\n" "$content_width" "${BOLD}${CYAN}FastFree${NC}"
    printf "│ %-*s │\n" "$content_width" "${DIM}fastfree.cloud${NC}"
    printf "│ %-*s │\n" "$content_width" ""
    box_sep

    printf "│  %-12s${BOLD}${GREEN}%s${NC}\n" "Host" "$flake_host"
    printf "│  %-12s%s\n" "OS" "$OS_STR"
    printf "│  %-12s%s\n" "Kernel" "$KERNEL_STR"
    printf "│  %-12s%s\n" "IP" "$IP_STR"
    printf "│  %-12s%s\n" "Uptime" "$UPTIME_STR"
    printf "│  %-12s%s\n" "Load" "$LOAD_STR"
    box_sep

    local mem_bar
    mem_bar=$(progress_bar "$MEM_PCT" 20)
    printf "│  %-12s%s  %s / %s ${DIM}(%s)${NC}\n" \
        "Memory" "$mem_bar" "$MEM_USED" "$MEM_TOTAL" "${MEM_PCT}%"

    local disk_bar
    disk_bar=$(progress_bar "$DISK_PCT" 20)
    printf "│  %-12s%s  %s / %s ${DIM}(%s)${NC}\n" \
        "Disk" "$disk_bar" "$DISK_USED" "$DISK_TOTAL" "${DISK_PCT}%"
    box_sep

    printf "│  ${BOLD}Services${NC}\n"
    printf "│    "
    check_service "podman" >/dev/null 2>&1 && printf "${GREEN}${SYM_OK}${NC} %-9s" "podman" || printf "${RED}${SYM_FAIL}${NC} %-9s" "podman"
    check_service "mysql" >/dev/null 2>&1 && printf "${GREEN}${SYM_OK}${NC} %-9s" "mysql" || printf "${RED}${SYM_FAIL}${NC} %-9s" "mysql"
    check_service "sshd" >/dev/null 2>&1 && printf "${GREEN}${SYM_OK}${NC} %-9s" "sshd" || printf "${DIM}●${NC} %-9s" "sshd"
    check_service "wireguard-wg0" >/dev/null 2>&1 && printf "${GREEN}${SYM_OK}${NC} %-9s" "wg0" || printf "${DIM}●${NC} %-9s" "wg0"
    check_service "avahi-daemon" >/dev/null 2>&1 && printf "${GREEN}${SYM_OK}${NC} %-9s" "avahi" || printf "${DIM}●${NC} %-9s" "avahi"
    printf "\n"
    box_sep

    printf "│  ${DIM}Authorized users only. All activities monitored.${NC}\n"
    box_bottom
}

# ─────────────────────────────────────────────────────────────────────────────
#  show_status()  —  System Status (fastfree status)
# ─────────────────────────────────────────────────────────────────────────────
show_status() {
    header

    collect_system_info

    local svc_status svc_label
    local -a services=("podman" "mysql" "sshd" "wireguard-wg0" "avahi-daemon")
    local -a svc_labels=("podman" "mysql" "sshd" "wg0" "avahi")
    local -a containers=("fastfree-app" "fastfree-frontend" "fastfree-redis-cache" "fastfree-redis-queue" "fastfree-short-worker" "fastfree-long-worker" "fastfree-scheduler")
    local ct_status ct_label

    # ── NixOS Services ───────────────────────────────────────────────────
    box_top
    printf "│  ${BOLD}NixOS Services${NC}\n"
    box_sep
    for i in "${!services[@]}"; do
        if check_service "${services[$i]}" >/dev/null 2>&1; then
            svc_status="${GREEN}${SYM_OK} active${NC}"
        else
            svc_status="${RED}${SYM_FAIL} inactive${NC}"
        fi
        printf "│  ${svc_status}  %-20s\n" "${svc_labels[$i]}"
    done
    box_sep

    # ── Podman Containers ────────────────────────────────────────────────
    printf "│  ${BOLD}Podman Containers${NC}\n"
    box_sep
    for ct in "${containers[@]}"; do
        if check_container "$ct" >/dev/null 2>&1; then
            ct_status="${GREEN}${SYM_OK} running${NC}"
        else
            ct_status="${RED}${SYM_FAIL} stopped${NC}"
        fi
        printf "│  ${ct_status}  %-28s\n" "$ct"
    done
    box_sep

    # ── Resources ────────────────────────────────────────────────────────
    printf "│  ${BOLD}Resources${NC}\n"
    box_sep
    printf "│  Memory   %s  %s / %s  ${DIM}(%s)${NC}\n" \
        "$(progress_bar "$MEM_PCT" 16)" "$MEM_USED" "$MEM_TOTAL" "${MEM_PCT}%"
    printf "│  Disk     %s  %s / %s  ${DIM}(%s)${NC}\n" \
        "$(progress_bar "$DISK_PCT" 16)" "$DISK_USED" "$DISK_TOTAL" "${DISK_PCT}%"
    box_sep

    # ── Uptime ───────────────────────────────────────────────────────────
    printf "│  Uptime   ${CYAN}%s${NC}\n" "$UPTIME_STR"
    box_bottom
}

# ─────────────────────────────────────────────────────────────────────────────
#  show_services()  —  Detailed Services (fastfree services)
# ─────────────────────────────────────────────────────────────────────────────
show_services() {
    header

    local -a services=("podman" "mysql" "sshd" "wireguard-wg0" "avahi-daemon")
    local -a svc_labels=("podman" "mysql" "sshd" "wireguard-wg0" "avahi-daemon")
    local status_str enabled_str

    box_top
    printf "│  ${BOLD}Service Details${NC}\n"
    box_sep
    printf "│  ${DIM}%-24s %-10s %-10s${NC}\n" "Service" "Status" "Enabled"
    box_sep

    for i in "${!services[@]}"; do
        if systemctl is-active --quiet "${services[$i]}" 2>/dev/null; then
            status_str="${GREEN}active${NC}"
        else
            status_str="${RED}inactive${NC}"
        fi

        if systemctl is-enabled --quiet "${services[$i]}" 2>/dev/null; then
            enabled_str="${GREEN}enabled${NC}"
        else
            enabled_str="${YELLOW}disabled${NC}"
        fi

        printf "│  %-24s ${status_str}   ${enabled_str}\n" "${svc_labels[$i]}"
    done
    box_bottom
}

# ─────────────────────────────────────────────────────────────────────────────
#  show_docker()  —  Podman Containers (fastfree podman)
# ─────────────────────────────────────────────────────────────────────────────
show_docker() {
    header

    box_top
    printf "│  ${BOLD}Containers${NC}\n"
    box_sep

    if command -v podman >/dev/null 2>&1; then
        local ps_output
        ps_output=$(podman ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null)
        if [[ -n "$ps_output" ]]; then
            while IFS= read -r line; do
                printf "│  %s\n" "$line"
            done <<< "$ps_output"
        else
            printf "│  ${DIM}No containers found.${NC}\n"
        fi
    else
        printf "│  ${RED}${SYM_FAIL} podman not installed${NC}\n"
    fi
    box_sep

    printf "│  ${BOLD}Images${NC}\n"
    box_sep

    if command -v podman >/dev/null 2>&1; then
        local img_output
        img_output=$(podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" 2>/dev/null)
        if [[ -n "$img_output" ]]; then
            while IFS= read -r line; do
                printf "│  %s\n" "$line"
            done <<< "$img_output"
        else
            printf "│  ${DIM}No images found.${NC}\n"
        fi
    else
        printf "│  ${RED}${SYM_FAIL} podman not installed${NC}\n"
    fi
    box_bottom
}

# ─────────────────────────────────────────────────────────────────────────────
#  show_resources()  —  System Resources (fastfree resources)
# ─────────────────────────────────────────────────────────────────────────────
show_resources() {
    header

    collect_system_info

    box_top
    printf "│  ${BOLD}System Resources${NC}\n"
    box_sep

    # ── Memory ───────────────────────────────────────────────────────────
    printf "│  ${BOLD}Memory${NC}\n"
    printf "│    Total:     %s\n" "$MEM_TOTAL"
    printf "│    Used:      %s  ${DIM}(%s)${NC}\n" "$MEM_USED" "${MEM_PCT}%"
    printf "│    %s\n" "$(progress_bar "$MEM_PCT" 40)"
    box_sep

    # ── Disk ─────────────────────────────────────────────────────────────
    printf "│  ${BOLD}Disk${NC}\n"
    printf "│    Total:     %s\n" "$DISK_TOTAL"
    printf "│    Used:      %s  ${DIM}(%s)${NC}\n" "$DISK_USED" "${DISK_PCT}%"
    printf "│    %s\n" "$(progress_bar "$DISK_PCT" 40)"
    box_sep

    # ── CPU Load ─────────────────────────────────────────────────────────
    printf "│  ${BOLD}CPU Load${NC}\n"
    printf "│    1min:  %s\n" "$(echo "$LOAD_STR" | awk '{print $1}')"
    printf "│    5min:  %s\n" "$(echo "$LOAD_STR" | awk '{print $2}')"
    printf "│   15min:  %s\n" "$(echo "$LOAD_STR" | awk '{print $3}')"
    box_sep

    # ── Podman Disk ──────────────────────────────────────────────────────
    printf "│  ${BOLD}Podman Disk${NC}\n"
    if command -v podman >/dev/null 2>&1; then
        local podman_usage
        podman_usage=$(podman system info --format '{{.Store.GraphRoot}}' 2>/dev/null)
        if [[ -n "$podman_usage" ]] && [[ -d "$podman_usage" ]]; then
            local podman_size
            podman_size=$(du -sh "$podman_usage" 2>/dev/null | awk '{print $1}')
            printf "│    GraphRoot: %s\n" "$podman_usage"
            printf "│    Size:      %s\n" "${podman_size:-unknown}"
        else
            printf "│    ${DIM}Unable to determine podman disk usage.${NC}\n"
        fi
    else
        printf "│    ${DIM}podman not installed.${NC}\n"
    fi
    box_bottom
}

# ─────────────────────────────────────────────────────────────────────────────
#  show_network()  —  Network Info (fastfree network)
# ─────────────────────────────────────────────────────────────────────────────
show_network() {
    header

    box_top
    printf "│  ${BOLD}Network Information${NC}\n"
    box_sep

    # ── Interfaces ───────────────────────────────────────────────────────
    printf "│  ${BOLD}Interfaces${NC}\n"
    if command -v ip >/dev/null 2>&1; then
        local ifaces
        ifaces=$(ip -br addr show 2>/dev/null | grep -v "lo")
        if [[ -n "$ifaces" ]]; then
            while IFS= read -r line; do
                printf "│    %s\n" "$line"
            done <<< "$ifaces"
        else
            printf "│    ${DIM}No interfaces found.${NC}\n"
        fi
    else
        printf "│    ${DIM}ip command not available.${NC}\n"
    fi
    box_sep

    # ── Default Gateway ──────────────────────────────────────────────────
    printf "│  ${BOLD}Default Gateway${NC}\n"
    if command -v ip >/dev/null 2>&1; then
        local gw
        gw=$(ip route show default 2>/dev/null | awk '{print $3}')
        printf "│    %s\n" "${gw:-none}"
    else
        printf "│    ${DIM}ip command not available.${NC}\n"
    fi
    box_sep

    # ── DNS Servers ──────────────────────────────────────────────────────
    printf "│  ${BOLD}DNS Servers${NC}\n"
    if [[ -f /etc/resolv.conf ]]; then
        local dns_lines
        dns_lines=$(grep "^nameserver" /etc/resolv.conf 2>/dev/null | awk '{print $2}')
        if [[ -n "$dns_lines" ]]; then
            while IFS= read -r line; do
                printf "│    %s\n" "$line"
            done <<< "$dns_lines"
        else
            printf "│    ${DIM}No DNS servers configured.${NC}\n"
        fi
    else
        printf "│    ${DIM}/etc/resolv.conf not found.${NC}\n"
    fi
    box_sep

    # ── Listening Ports ──────────────────────────────────────────────────
    printf "│  ${BOLD}Listening Ports${NC}\n"
    if command -v ss >/dev/null 2>&1; then
        local ports
        ports=$(ss -tlnp 2>/dev/null | tail -n +2 | awk '{print $4, $6}' | head -20)
        if [[ -n "$ports" ]]; then
            while IFS= read -r line; do
                printf "│    %s\n" "$line"
            done <<< "$ports"
        else
            printf "│    ${DIM}No listening ports.${NC}\n"
        fi
    else
        printf "│    ${DIM}ss command not available.${NC}\n"
    fi
    box_sep

    # ── mDNS (.local via avahi-browse) ──────────────────────────────────
    printf "│  ${BOLD}mDNS Services${NC}\n"
    if command -v avahi-browse >/dev/null 2>&1; then
        local mdns
        mdns=$(avahi-browse -art 2>/dev/null | grep -E "^\+" | head -20)
        if [[ -n "$mdns" ]]; then
            while IFS= read -r line; do
                printf "│    %s\n" "$line"
            done <<< "$mdns"
        else
            printf "│    ${DIM}No mDNS services discovered.${NC}\n"
        fi
    else
        printf "│    ${DIM}avahi-browse not available.${NC}\n"
    fi
    box_bottom
}

# ─────────────────────────────────────────────────────────────────────────────
#  show_disk()  —  Disk Usage (fastfree disk)
# ─────────────────────────────────────────────────────────────────────────────
show_disk() {
    header

    box_top
    printf "│  ${BOLD}Filesystems${NC}\n"
    box_sep

    if command -v df >/dev/null 2>&1; then
        local fs_output
        fs_output=$(df -h --output=source,size,used,avail,pcent,target 2>/dev/null \
            | grep -E "^(/dev/|tmpfs|overlay)" | head -20)
        if [[ -n "$fs_output" ]]; then
            while IFS= read -r line; do
                printf "│  %s\n" "$line"
            done <<< "$fs_output"
        else
            printf "│  ${DIM}No filesystems found.${NC}\n"
        fi
    else
        printf "│  ${RED}${SYM_FAIL} df command not available${NC}\n"
    fi
    box_sep

    # ── Nix Store Size ───────────────────────────────────────────────────
    printf "│  ${BOLD}Nix Store${NC}\n"
    if [[ -d /nix/store ]]; then
        local nix_size
        nix_size=$(du -sh /nix/store 2>/dev/null | awk '{print $1}')
        printf "│    Size: %s\n" "${nix_size:-unknown}"
    else
        printf "│    ${DIM}/nix/store not found.${NC}\n"
    fi
    box_sep

    # ── Podman Disk ──────────────────────────────────────────────────────
    printf "│  ${BOLD}Podman Storage${NC}\n"
    if command -v podman >/dev/null 2>&1; then
        local podman_root
        podman_root=$(podman system info --format '{{.Store.GraphRoot}}' 2>/dev/null)
        if [[ -n "$podman_root" ]] && [[ -d "$podman_root" ]]; then
            local podman_size
            podman_size=$(du -sh "$podman_root" 2>/dev/null | awk '{print $1}')
            printf "│    GraphRoot: %s\n" "$podman_root"
            printf "│    Size:      %s\n" "${podman_size:-unknown}"
        else
            printf "│    ${DIM}Unable to determine podman storage.${NC}\n"
        fi
    else
        printf "│    ${DIM}podman not installed.${NC}\n"
    fi
    box_bottom
}

# ─────────────────────────────────────────────────────────────────────────────
#  show_info()  —  System Information (fastfree info)
# ─────────────────────────────────────────────────────────────────────────────
show_info() {
    header

    collect_system_info

    local flake_host shell_str user_str svc_count active_count
    flake_host=$(get_flake_cfg 2>/dev/null || echo "unknown")
    shell_str=$(basename "${SHELL:-/bin/sh}")
    user_str=$(whoami)
    svc_count=0
    active_count=0

    local -a services=("podman" "mysql" "sshd" "wireguard-wg0" "avahi-daemon")
    for svc in "${services[@]}"; do
        ((svc_count++)) || true
        if check_service "$svc" >/dev/null 2>&1; then
            ((active_count++)) || true
        fi
    done

    box_top
    printf "│  ${BOLD}System Information${NC}\n"
    box_sep

    printf "│  %-16s ${CYAN}%s${NC}\n" "Hostname:" "$HOSTNAME_STR"
    printf "│  %-16s %s\n" "Flake Host:" "$flake_host"
    printf "│  %-16s %s\n" "IP Address:" "$IP_STR"
    printf "│  %-16s %s\n" "NixOS Version:" "$NIXOS_VER"
    printf "│  %-16s %s\n" "OS:" "$OS_STR"
    printf "│  %-16s %s\n" "Kernel:" "$KERNEL_STR"
    printf "│  %-16s %s\n" "Uptime:" "$UPTIME_STR"
    printf "│  %-16s %s\n" "Shell:" "$shell_str"
    printf "│  %-16s %s\n" "User:" "$user_str"
    box_sep

    printf "│  ${BOLD}Services${NC}  ${GREEN}%d${NC}/${DIM}%d${NC} active\n" "$active_count" "$svc_count"
    box_bottom
}

# ─────────────────────────────────────────────────────────────────────────────
#  show_wireguard()  —  WireGuard Status (fastfree wireguard)
# ─────────────────────────────────────────────────────────────────────────────
show_wireguard() {
    header

    box_top
    printf "│  ${BOLD}WireGuard Status — wg0${NC}\n"
    box_sep

    if ! check_service "wireguard-wg0" >/dev/null 2>&1; then
        printf "│  ${YELLOW}${SYM_WARN} wireguard-wg0 is not active${NC}\n"
        box_bottom
        return 1
    fi

    if command -v wg >/dev/null 2>&1; then
        local wg_output
        wg_output=$(wg show wg0 2>/dev/null)
        if [[ -n "$wg_output" ]]; then
            while IFS= read -r line; do
                printf "│  %s\n" "$line"
            done <<< "$wg_output"
        else
            printf "│  ${DIM}No WireGuard data available.${NC}\n"
        fi
    else
        printf "│  ${RED}${SYM_FAIL} wg command not available${NC}\n"
    fi
    box_bottom
}

# ─────────────────────────────────────────────────────────────────────────────
#  show_help()  —  Help Text (fastfree help)
# ─────────────────────────────────────────────────────────────────────────────
show_help() {
    header

    local cw=$((BOX_WIDTH - 4))

    box_top
    printf "│  ${BOLD}FastFree CLI — System Management Tool${NC}\n"
    box_sep

    printf "│  ${BOLD}USAGE:${NC}\n"
    printf "│    fastfree ${CYAN}<command>${NC}\n"
    box_sep

    printf "│  ${BOLD}COMMANDS:${NC}\n"
    printf "│    ${GREEN}status${NC}        Show system overview\n"
    printf "│    ${GREEN}services${NC}      Detailed service status\n"
    printf "│    ${GREEN}podman${NC}        Podman containers and images\n"
    printf "│    ${GREEN}resources${NC}     CPU, memory, and disk usage\n"
    printf "│    ${GREEN}network${NC}       Network interfaces and ports\n"
    printf "│    ${GREEN}disk${NC}          Disk usage details\n"
    printf "│    ${GREEN}info${NC}          Full system information\n"
    printf "│    ${GREEN}wireguard${NC}     WireGuard tunnel status\n"
    printf "│    ${GREEN}help${NC}          Show this help message\n"
    box_sep

    printf "│  ${BOLD}SERVICES:${NC}\n"
    printf "│    ${DIM}podman, mysql, sshd, wireguard-wg0, avahi-daemon${NC}\n"
    printf "│    ${DIM}fastfree-app, fastfree-frontend${NC}\n"
    box_sep

    printf "│  ${BOLD}EXAMPLES:${NC}\n"
    printf "│    ${DIM}fastfree status${NC}\n"
    printf "│    ${DIM}fastfree services${NC}\n"
    printf "│    ${DIM}fastfree podman${NC}\n"
    printf "│    ${DIM}fastfree wireguard${NC}\n"
    box_sep

    printf "│  ${DIM}For more information visit:${NC}\n"
    printf "│  ${DIM}https://fastfree.cloud${NC}\n"
    box_bottom
}

## ═════════════════════════════════════════════════════════════════════════════
##  COMMANDS — Actions that modify system state
## ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  clean_logs()  —  Clean old journal logs (keeps 7 days)
# ─────────────────────────────────────────────────────────────────────────────
clean_logs() {
    header
    echo -e "${BOLD}${BLUE}═══ Clean Logs ═══${NC}"
    echo ""
    echo -e "  ${YELLOW}Cleaning old logs (keeping 7 days)...${NC}"
    journalctl --vacuum-time=7d
    echo ""
    echo -e "  ${GREEN}✓ Logs cleaned${NC}"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
#  cmd_update()  —  Pull from git + nixos-rebuild switch
# ─────────────────────────────────────────────────────────────────────────────
cmd_update() {
    echo -e "${YELLOW}Updating FastFree...${NC}"
    echo ""
    FLAKE_PATH=$(get_flake_path)
    if [ -z "$FLAKE_PATH" ]; then
        echo -e "${RED}Error: Cannot find project path (looking for flake.nix)${NC}"
        echo -e "${DIM}Searched: /etc/fastfree, /mnt/d/2026/fastfree/dev/fastfree_os${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Project found: ${FLAKE_PATH}${NC}"
    echo ""
    echo -e "${YELLOW}Rebuilding NixOS...${NC}"
    cd "$FLAKE_PATH"
    nixos-rebuild switch --flake "${FLAKE_PATH}#$(get_flake_cfg)" 2>&1 | tee -a /var/log/fastfree-update.log
    echo ""
    echo -e "${GREEN}✓ Update completed!${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
#  cmd_check_update()  —  Dry-run rebuild (no changes applied)
# ─────────────────────────────────────────────────────────────────────────────
cmd_check_update() {
    echo -e "${BLUE}Checking for updates (dry run)...${NC}"
    FLAKE_PATH=$(get_flake_path)
    if [ -z "$FLAKE_PATH" ]; then
        echo -e "${RED}Error: Cannot find project path${NC}"
        exit 1
    fi
    nixos-rebuild switch --flake "${FLAKE_PATH}#$(get_flake_cfg)" --dry-run 2>&1 | head -20
    echo ""
    echo -e "${GREEN}Done. If there are changes, run: fastfree update${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
#  SERVICE MANAGEMENT — restart / stop / start helpers
# ─────────────────────────────────────────────────────────────────────────────
MANAGED_SERVICES="podman mysql sshd wireguard-wg0 avahi-daemon"

list_services() {
    echo -e "${BOLD}Available services:${NC}"
    for svc in $MANAGED_SERVICES; do
        local state
        state=$(systemctl is-active "$svc" 2>/dev/null || echo "inactive")
        if [[ "$state" == "active" ]]; then
            echo -e "  ${SYM_OK}  ${BOLD}${svc}${NC}  ${GREEN}active${NC}"
        else
            echo -e "  ${SYM_FAIL}  ${DIM}${svc}${NC}  ${RED}${state}${NC}"
        fi
    done
}

validate_service() {
    local svc="$1"
    for s in $MANAGED_SERVICES; do
        [[ "$s" == "$svc" ]] && return 0
    done
    return 1
}

# ─────────────────────────────────────────────────────────────────────────────
#  cmd_restart()  —  Restart a service (or "all")
# ─────────────────────────────────────────────────────────────────────────────
cmd_restart() {
    local svc="${1:-}"
    if [[ -z "$svc" ]]; then
        header
        echo -e "${BOLD}${BLUE}═══ Restart Service ═══${NC}"
        echo ""
        echo -e "  ${YELLOW}Usage: fastfree restart <service>${NC}"
        echo -e "  ${DIM}Tip: Use 'fastfree restart all' to restart everything${NC}"
        echo ""
        list_services
        echo ""
        return 1
    fi

    header
    echo -e "${BOLD}${BLUE}═══ Restart Service ═══${NC}"
    echo ""

    if [[ "$svc" == "all" ]]; then
        for s in $MANAGED_SERVICES; do
            echo -e "  ${YELLOW}Restarting ${s}...${NC}"
            systemctl restart "$s" 2>&1 \
                && echo -e "  ${GREEN}✓ ${s} restarted${NC}" \
                || echo -e "  ${RED}✗ ${s} failed${NC}"
        done
    elif validate_service "$svc"; then
        echo -e "  ${YELLOW}Restarting ${svc}...${NC}"
        systemctl restart "$svc" 2>&1 \
            && echo -e "  ${GREEN}✓ ${svc} restarted${NC}" \
            || echo -e "  ${RED}✗ ${svc} failed${NC}"
    else
        echo -e "  ${RED}Unknown service: ${svc}${NC}"
        echo ""
        list_services
    fi
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
#  cmd_stop()  —  Stop a service
# ─────────────────────────────────────────────────────────────────────────────
cmd_stop() {
    local svc="${1:-}"
    if [[ -z "$svc" ]]; then
        header
        echo -e "${BOLD}${BLUE}═══ Stop Service ═══${NC}"
        echo ""
        echo -e "  ${YELLOW}Usage: fastfree stop <service>${NC}"
        echo ""
        list_services
        echo ""
        return 1
    fi

    header
    echo -e "${BOLD}${BLUE}═══ Stop Service ═══${NC}"
    echo ""

    if validate_service "$svc"; then
        echo -e "  ${YELLOW}Stopping ${svc}...${NC}"
        systemctl stop "$svc" 2>&1 \
            && echo -e "  ${GREEN}✓ ${svc} stopped${NC}" \
            || echo -e "  ${RED}✗ ${svc} failed${NC}"
    else
        echo -e "  ${RED}Unknown service: ${svc}${NC}"
        echo ""
        list_services
    fi
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
#  cmd_start()  —  Start a service
# ─────────────────────────────────────────────────────────────────────────────
cmd_start() {
    local svc="${1:-}"
    if [[ -z "$svc" ]]; then
        header
        echo -e "${BOLD}${BLUE}═══ Start Service ═══${NC}"
        echo ""
        echo -e "  ${YELLOW}Usage: fastfree start <service>${NC}"
        echo ""
        list_services
        echo ""
        return 1
    fi

    header
    echo -e "${BOLD}${BLUE}═══ Start Service ═══${NC}"
    echo ""

    if validate_service "$svc"; then
        echo -e "  ${YELLOW}Starting ${svc}...${NC}"
        systemctl start "$svc" 2>&1 \
            && echo -e "  ${GREEN}✓ ${svc} started${NC}" \
            || echo -e "  ${RED}✗ ${svc} failed${NC}"
    else
        echo -e "  ${RED}Unknown service: ${svc}${NC}"
        echo ""
        list_services
    fi
    echo ""
}

## ═════════════════════════════════════════════════════════════════════════════
##  INTERACTIVE MENU  (when invoked with no arguments)
## ═════════════════════════════════════════════════════════════════════════════

show_menu() {
    clear 2>/dev/null || true
    header
    echo ""
    echo -e "  ${BOLD}${BRIGHT_CYAN}Status:${NC}"
    echo -e "    ${BOLD}${GREEN}1)${NC}  System Status        ${DIM}fastfree status${NC}"
    echo -e "    ${BOLD}${GREEN}2)${NC}  Services Status      ${DIM}fastfree services${NC}"
    echo -e "    ${BOLD}${GREEN}3)${NC}  Podman Status        ${DIM}fastfree podman${NC}"
    echo -e "    ${BOLD}${GREEN}4)${NC}  Resources            ${DIM}fastfree resources${NC}"
    echo ""
    echo -e "  ${BOLD}${BRIGHT_CYAN}Update:${NC}"
    echo -e "    ${BOLD}${YELLOW}5)${NC}  Check for Updates    ${DIM}fastfree check-update${NC}"
    echo -e "    ${BOLD}${YELLOW}6)${NC}  Apply Update         ${DIM}fastfree update${NC}"
    echo ""
    echo -e "  ${BOLD}${BRIGHT_CYAN}Management:${NC}"
    echo -e "    ${BOLD}${BLUE}7)${NC}  Restart Service      ${DIM}fastfree restart <service>${NC}"
    echo -e "    ${BOLD}${BLUE}8)${NC}  Stop Service         ${DIM}fastfree stop <service>${NC}"
    echo -e "    ${BOLD}${BLUE}9)${NC}  Start Service        ${DIM}fastfree start <service>${NC}"
    echo -e "    ${BOLD}${BLUE}10)${NC} Clean Logs           ${DIM}fastfree clean-logs${NC}"
    echo ""
    echo -e "  ${BOLD}${BRIGHT_CYAN}Info:${NC}"
    echo -e "    ${BOLD}${MAGENTA}11)${NC} System Info          ${DIM}fastfree info${NC}"
    echo -e "    ${BOLD}${MAGENTA}12)${NC} Network Info         ${DIM}fastfree network${NC}"
    echo -e "    ${BOLD}${MAGENTA}13)${NC} Disk Usage           ${DIM}fastfree disk${NC}"
    echo -e "    ${BOLD}${MAGENTA}14)${NC} WireGuard VPN        ${DIM}fastfree wireguard${NC}"
    echo ""
    echo -e "  ${DIM}──────────────────────────────────────────────────────${NC}"
    echo -e "    ${BOLD}${RED}0)${NC}  Exit"
    echo ""
}

## ═════════════════════════════════════════════════════════════════════════════
##  MAIN DISPATCH  — CLI entry point
## ═════════════════════════════════════════════════════════════════════════════

case "${1:-}" in
    # ── Status ──────────────────────────────────────────────────────────────
    status)         show_status ;;
    services)       show_services ;;
    podman)         show_docker ;;
    resources)      show_resources ;;

    # ── Info ─────────────────────────────────────────────────────────────────
    network|net)    show_network ;;
    disk)           show_disk ;;
    info)           show_info ;;
    wireguard|wg)   show_wireguard ;;

    # ── Management ──────────────────────────────────────────────────────────
    clean-logs)     clean_logs ;;
    update)         cmd_update ;;
    check-update)   cmd_check_update ;;

    # ── Service control ─────────────────────────────────────────────────────
    restart)        cmd_restart "${2:-}" ;;
    stop)           cmd_stop "${2:-}" ;;
    start)          cmd_start "${2:-}" ;;

    # ── Metadata ────────────────────────────────────────────────────────────
    version|-v|--version)
        echo -e "${BOLD}FastFree CLI${NC} v${VERSION}" ;;
    help|--help|-h)
        show_help ;;

    # ── Interactive menu (no args) ──────────────────────────────────────────
    "")
        while true; do
            show_menu
            read -rp "Choose [0-14]: " choice
            echo ""
            case "$choice" in
                1)  show_status ;;
                2)  show_services ;;
                3)  show_docker ;;
                4)  show_resources ;;
                5)  cmd_check_update ;;
                6)  cmd_update ;;
                7)
                    read -rp "  Service name: " svc
                    cmd_restart "$svc"
                    ;;
                8)
                    read -rp "  Service name: " svc
                    cmd_stop "$svc"
                    ;;
                9)
                    read -rp "  Service name: " svc
                    cmd_start "$svc"
                    ;;
                10) clean_logs ;;
                11) show_info ;;
                12) show_network ;;
                13) show_disk ;;
                14) show_wireguard ;;
                0)
                    echo -e "${GREEN}Goodbye!${NC}"
                    break
                    ;;
                *)
                    echo -e "${RED}Invalid choice. Try again.${NC}"
                    ;;
            esac
            echo ""
            read -rp "Press Enter to continue..." _
        done
        ;;

    # ── Unknown ─────────────────────────────────────────────────────────────
    *)
        echo -e "${RED}Unknown command: ${1}${NC}"
        echo -e "Run ${BOLD}fastfree help${NC} for available commands."
        exit 1
        ;;
esac
