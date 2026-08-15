#!/usr/bin/env bash
#
# FastFree Workflow Manager — Build, push, and monitor GitHub Actions workflows.
# Automates the full lifecycle:
#   1. Validate YAML workflow files with actionlint
#   2. Delete failed GitHub Actions workflow runs
#   3. Stage, commit, and push changes to the remote repository
#   4. Trigger the build-os.yaml workflow
#   5. Monitor the workflow run until completion
#   6. Save a full transcript log
#
# Usage:
#   ./scripts/workflow-manager.sh              Run all phases
#   ./scripts/workflow-manager.sh -Menu        Interactive menu
#   ./scripts/workflow-manager.sh -SkipValidation -SkipPush
#
# Phase flags:
#   -h, --help           Show this help and exit
#   -v, --skip-validation    Skip YAML validation phase
#   -d, --skip-delete        Skip deleting failed runs
#   -p, --skip-push        Skip git commit and push
#   -r, --skip-run         Skip triggering and monitoring the workflow
#   -k, --keep-runs        Number of successful workflow runs to keep (default: 5)
#   -m, --menu           Show an interactive menu instead of running all phases
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKFLOWS_DIR="$REPO_ROOT/.github/workflows"
LOGS_DIR="$REPO_ROOT/logs/workflows"
SUMMARY_LOG="$REPO_ROOT/workflow-manager.log"
REPO="FastFreeCloud/fastfree"
SCRIPT_VERSION="2.0.0"
KEEP_RUNS=5

# Color helpers
C_RESET='\e[0m'
C_CYAN='\e[96m'
C_GREEN='\e[32m'
C_RED='\e[31m'
C_YELLOW='\e[33m'
C_WHITE='\e[97m'
C_DARKGRAY='\e[90m'

# ============================================================================
# Output Helpers
# ============================================================================

write_header() {
    local msg="$1"
    echo ""
    echo "======================================================================"
    echo "  $msg"
    echo "======================================================================"
    echo ""
}

write_step() {
    local msg="$1"
    echo ""
    echo "  >> $msg"
}

write_ok() {
    local msg="$1"
    echo -e "    [${C_GREEN}OK${C_RESET}] $msg"
}

write_fail() {
    local msg="$1"
    echo -e "    [${C_RED}FAIL${C_RESET}] $msg"
}

write_warn() {
    local msg="$1"
    echo -e "    [${C_YELLOW}WARN${C_RESET}] $msg"
}

write_info() {
    local msg="$1"
    echo -e "    [${C_WHITE}INFO${C_RESET}] $msg"
}

write_code() {
    local msg="$1"
    echo -e "    ${C_DARKGRAY}$msg${C_RESET}"
}

write_check() {
    local msg="$1"
    echo -e "    [${C_GREEN}x${C_RESET}] $msg"
}

write_cross() {
    local msg="$1"
    echo -e "    [${C_RED} ]${C_RESET} $msg"
}

write_timer() {
    local elapsed="$1"
    local m=$(( elapsed / 60 ))
    local s=$(( elapsed % 60 ))
    echo -e "    \r    ${C_DARKGRAY}Elapsed: ${m:02}:${s:02}${C_RESET}"
}

# ============================================================================
# Logging Helpers
# ============================================================================

write_summary_log() {
    local status="$1"
    local detail="${2:-}"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local branch="unknown"
    branch=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    local entry="[$timestamp] $status | branch=$branch | $detail"

    local summary_dir
    summary_dir=$(dirname "$SUMMARY_LOG")
    mkdir -p "$summary_dir" 2>/dev/null || true
    echo "$entry" >> "$SUMMARY_LOG"
}

show_log_tail() {
    if [[ -f "$SUMMARY_LOG" ]]; then
        echo ""
        echo "======================================================================"
        echo "  Last 20 lines of workflow-manager.log"
        echo "======================================================================"
        echo ""
        tail -n 20 "$SUMMARY_LOG" | while IFS= read -r line; do
            if [[ "$line" == *"[FAIL]"* ]]; then
                echo -e "  ${C_RED}$line${C_RESET}"
            elif [[ "$line" == *"[OK]"* ]]; then
                echo -e "  ${C_GREEN}$line${C_RESET}"
            else
                echo -e "  ${C_DARKGRAY}$line${C_RESET}"
            fi
        done
        echo ""
    else
        write_warn "No log file found at $SUMMARY_LOG"
    fi
}

# ============================================================================
# Git Branch Helper
# ============================================================================

get_git_branch() {
    local b
    b=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [[ -n "$b" ]]; then
        echo "$b"
    else
        echo "unknown"
    fi
}

# ============================================================================
# Retry Helper
# ============================================================================

invoke_with_retry() {
    local description="$1"
    local scriptblock="$2"
    local max_attempts="${3:-3}"
    local delay_seconds="${4:-5}"
    local attempt=1

    while (( attempt <= max_attempts )); do
        if eval "$scriptblock"; then
            return 0
        fi
        if (( attempt < max_attempts )); then
            write_warn "$description failed (attempt $attempt/$max_attempts): $?"
            write_info "Retrying in $delay_seconds seconds..."
            sleep "$delay_seconds"
        else
            write_fail "$description failed after $max_attempts attempts: $?"
            return 1
        fi
        attempt=$((attempt + 1))
    done
    return 1
}

# ============================================================================
# Parameter Parsing
# ============================================================================

parse_args() {
    local help_flag=0
    local skip_validation=0
    local skip_delete=0
    local skip_push=0
    local skip_run=0
    local menu_flag=0
    local keep_runs=5

    while (( "$#" )); do
        case "$1" in
            -h|--help)
                help_flag=1
                shift
                ;;
            -v|--skip-validation)
                skip_validation=1
                shift
                ;;
            -d|--skip-delete)
                skip_delete=1
                shift
                ;;
            -p|--skip-push)
                skip_push=1
                shift
                ;;
            -r|--skip-run)
                skip_run=1
                shift
                ;;
            -k|--keep-runs)
                keep_runs="${2:-5}"
                if ! [[ "$keep_runs" =~ ^[0-9]+$ ]] || (( keep_runs < 1 )); then
                    write_fail "Invalid --keep-runs value: $keep_runs (must be positive integer)"
                    exit 1
                fi
                shift 2
                ;;
            -m|--menu)
                menu_flag=1
                shift
                ;;
            --)
                shift
                break
                ;;
            *)
                write_fail "Invalid option: $1"
                exit 1
                ;;
        esac
    done

    # Export for use across functions
    export SKIP_VALIDATION=$skip_validation
    export SKIP_DELETE=$skip_delete
    export SKIP_PUSH=$skip_push
    export SKIP_RUN=$skip_run
    export MENU=$menu_flag
    export KEEP_RUNS=$keep_runs

    # Early help exit
    if (( help_flag )); then
        cat <<'EOF'
FastFree Workflow Manager v$SCRIPT_VERSION
Usage:
  ./scripts/workflow-manager.sh              Run all phases
  ./scripts/workflow-manager.sh -Menu        Interactive menu
  ./scripts/workflow-manager.sh -SkipValidation -SkipPush

Phase flags:
  -h, --help           Show this help and exit
  -v, --skip-validation    Skip YAML validation phase
  -d, --skip-delete        Skip deleting failed runs
  -p, --skip-push        Skip git commit and push
  -r, --skip-run         Skip workflow trigger and monitoring
  -k, --keep-runs        Number of successful runs to keep (default: 5)
  -m, --menu           Show an interactive menu instead of running all phases

EOF
        exit 0
    fi
}

# ============================================================================
# Interactive Menu
# ============================================================================

show_menu() {
    local branch
    branch=$(get_git_branch)

    write_header "FastFree Workflow Manager v$SCRIPT_VERSION"
    echo -e "  Git branch: ${C_WHITE}$branch${C_RESET}"
    write_header ""

    echo "  [1]  Run all phases (validate, delete, push, trigger, monitor)"
    echo "  [2]  Validate YAML only"
    echo "  [3]  Delete failed runs only"
    echo "  [4]  Push only"
    echo "  [5]  Trigger workflow only"
    echo "  [6]  View last 20 log entries"
    echo "  [7]  Show git status"
    echo "  [0]  Exit"
    echo ""
    read -rp "  Select option: " choice

    case "$choice" in
        1) return 0 ;;
        2)
            SKIP_DELETE=1 SKIP_PUSH=1 SKIP_RUN=1 return 0 ;;
        3)
            SKIP_VALIDATION=1 SKIP_PUSH=1 SKIP_RUN=1 return 0 ;;
        4)
            SKIP_VALIDATION=1 SKIP_DELETE=1 SKIP_RUN=1 return 0 ;;
        5)
            SKIP_VALIDATION=1 SKIP_DELETE=1 SKIP_PUSH=1 return 0 ;;
        6) show_log_tail; return 1 ;;
        7)
            write_header ""
            write_info "Current branch: $(get_git_branch)"
            local st
            st=$(git -C "$REPO_ROOT" status --short 2>&1)
            if [[ -z "$st" ]]; then
                write_ok "Working tree is clean"
            else
                write_info "Uncommitted changes:"
                write_code "$st"
            fi
            return 0 ;;
        0) return 1 ;;
        *) write_warn "Invalid option"; return 1 ;;
    esac
}

menu_loop() {
    local continue_loop=1
    while (( continue_loop )); do
        show_menu || continue_loop=0
    done
}

# ============================================================================
# Help Display
# ============================================================================

show_help() {
    cat <<'EOF'
FastFree Workflow Manager v$SCRIPT_VERSION
Usage:
  ./scripts/workflow-manager.sh              Run all phases
  ./scripts/workflow-manager.sh -Menu        Interactive menu
  ./scripts/workflow-manager.sh -SkipValidation -SkipPush

Phase flags:
  -h, --help           Show this help and exit
  -v, --skip-validation    Skip YAML validation phase
  -d, --skip-delete        Skip deleting failed runs
  -p, --skip-push        Skip git commit and push
  -r, --skip-run         Skip workflow trigger and monitoring
  -k, --keep-runs        Number of successful runs to keep (default: 5)
  -m, --menu           Show an interactive menu instead of running all phases
EOF
}

# ============================================================================
# Phase 1: Validate YAML Files
# ============================================================================

phase1_validate_yaml() {
    write_header "FastFree Workflow Manager v$SCRIPT_VERSION"

    # Check for actionlint
    local actionlint_path="$HOME/actionlint/actionlint"
    if [[ ! -x "$actionlint_path" ]]; then
        write_info "Downloading actionlint..."
        local actionlint_zip="$HOME/actionlint.zip"
        local actionlint_dir="$HOME/actionlint"
        local actionlint_url="https://github.com/rhysd/actionlint/releases/download/v1.7.7/actionlint_1.7.7_windows_amd64.zip"

        if invoke_with_retry "Download actionlint" \
            "curl -fsSL '$actionlint_url' -o '$actionlint_zip' && unzip -o '$actionlint_zip' -d '$actionlint_dir' && rm '$actionlint_zip'" \
            3 5; then
            # Find the extracted binary
            local found_bin
            found_bin=$(find "$actionlint_dir" -type f -name "actionlint*" -executable | head -1)
            if [[ -n "$found_bin" ]]; then
                # Move to standard location
                mkdir -p "$HOME/actionlint"
                cp "$found_bin" "$actionlint_path"
                chmod +x "$actionlint_path"
            else
                write_fail "Could not find actionlint binary after extraction"
                exit 1
            fi
        else
            write_fail "Failed to download actionlint"
            exit 1
        fi
    fi

    # Collect YAML files
    local yaml_files=()
    if [[ -d "$WORKFLOWS_DIR" ]]; then
        while IFS= read -r -d '' file; do
            yaml_files+=("$file")
        done < <(find "$WORKFLOWS_DIR" -maxdepth 1 \( -name "*.yaml" -o -name "*.yml" \) -print0 2>/dev/null | sort -z)
    fi

    if (( ${#yaml_files[@]} == 0 )); then
        write_warn "No YAML files found in $WORKFLOWS_DIR"
    fi

    local yaml_failed=0
    for file in "${yaml_files[@]}"; do
        write_info "Checking: $(basename "$file")"

        local result
        result=$("$actionlint_path" -color "$file" 2>&1) || {
            write_fail "$(basename "$file") has errors:"
            while IFS= read -r line; do
                write_code "  $line"
            done <<< "$result"
            yaml_failed=1
        } || {
            write_ok "$(basename "$file") is valid"
        }
    done

    if (( yaml_failed )); then
        write_fail "YAML validation failed. Fix errors before continuing."
        write_summary_log "[FAIL]" "YAML validation failed"
        exit 1
    fi

    write_ok "All YAML files valid"
}

# ============================================================================
# Phase 2: Delete Failed Runs and Cleanup
# ============================================================================

phase2_delete_runs_and_cleanup() {
    write_step "PHASE 2: Deleting failed workflow runs and cleanup..."

    # Fetch all workflow runs with pagination
    local all_runs=()
    local page=1
    local per_page=100

    while true; do
        local runs_json
        runs_json=$(gh api "repos/$REPO/actions/runs?per_page=$per_page&page=$page" --jq '
            [.workflow_runs[] | {
                id: .id,
                number: (.run_number // .number),
                conclusion: .conclusion,
                status: .status,
                event: .event,
                created_at: .created_at
            }]' 2>/dev/null) || {
            write_warn "Could not fetch runs (page $page)"
            break
        }

        local page_count
        page_count=$(echo "$runs_json" | jq 'length' 2>/dev/null || echo 0)

        if (( page_count == 0 )); then
            break
        fi

        local run
        for run in $(echo "$runs_json" | jq -c '.[]'); do
            all_runs+=("$run")
        done

        if (( page_count < per_page )); then
            break
        fi
        page=$((page + 1))
    done

    write_info "Found ${#all_runs[@]} total runs"

    # Identify failed conclusions
    local failed_conclusions='failure startup_failure cancelled timed_out'
    local to_delete=()
    local successful_runs=()

    for run in "${all_runs[@]}"; do
        local conclusion
        conclusion=$(echo "$run" | jq -r '.conclusion // empty')
        if echo "$failed_conclusions" | grep -qw "$conclusion"; then
            to_delete+=("$run")
        else
            successful_runs+=("$run")
        fi
    done

    write_info "Failed runs to delete: ${#to_delete[@]}"
    write_info "Successful runs: ${#successful_runs[@]}"

    # Keep the last $KEEP_RUNS successful runs (informational only; not deleted)
    local runs_to_keep=()
    if (( ${#successful_runs[@]} > KEEP_RUNS )); then
        runs_to_keep=("${successful_runs[@]:0:$KEEP_RUNS}")
    else
        runs_to_keep=("${successful_runs[@]}")
    fi

    # Delete failed runs
    local deleted=0
    local failed_del=0

    for run in "${to_delete[@]}"; do
        local run_id
        run_id=$(echo "$run" | jq -r '.id')
        local run_number
        run_number=$(echo "$run" | jq -r '.number')

        write_info "Deleting #$run_number (id: $run_id)..."

        local del_err
        if del_err=$(gh api -X DELETE "repos/$REPO/actions/runs/$run_id" 2>&1); then
            write_ok "Deleted #$run_number"
            deleted=$((deleted + 1))
        else
            write_fail "Failed to delete #$run_number: $del_err"
            failed_del=$((failed_del + 1))
        fi
        sleep 0.3
    done

    write_ok "Deleted: $deleted | Failed: $failed_del"

    # Cleanup artifacts older than 30 days (keep last 20 per workflow)
    write_info "Cleaning up old GitHub Actions artifacts..."

    local artifacts_json
    artifacts_json=$(gh api "repos/$REPO/actions/artifacts?per_page=100" --jq '
        .artifacts[] | {
            id: .id,
            name: .name,
            created_at: .created_at,
            workflow_id: .workflow_id
        }' 2>/dev/null) || {
        write_warn "Could not fetch artifacts"
    }

    local artifacts=()
    local artifact_count=0
    if [[ -n "$artifacts_json" ]]; then
        artifact_count=$(echo "$artifacts_json" | jq 'length' 2>/dev/null || echo 0)
        for i in $(seq 0 $((artifact_count - 1))); do
            artifacts+=($(echo "$artifacts_json" | jq -c ".[$i]"))
        done
    fi

    write_info "Found $artifact_count total artifacts"

    local artifacts_to_delete=()
    for artifact in "${artifacts[@]}"; do
        local created_at
        created_at=$(echo "$artifact" | jq -r '.created_at // empty')
        if [[ -n "$created_at" ]]; then
            # Parse date and check if older than 30 days
            local artifact_epoch
            artifact_epoch=$(date -d "$created_at" +%s 2>/dev/null || echo 0)
            local thirty_days_ago
            thirty_days_ago=$(( $(date +%s) - 30 * 24 * 60 * 60 ))
            if (( artifact_epoch < thirty_days_ago )); then
                artifacts_to_delete+=("$artifact")
            fi
        fi
    done

    write_info "Artifacts older than 30 days: ${#artifacts_to_delete[@]}"

    local kept_artifacts=($(printf '%s\n' "${artifacts[@]}" | jq -sc '
        sort_by(-(.created_at | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601)) | .[0:20]'))

    local deleted_artifacts=0
    for artifact in "${artifacts_to_delete[@]}"; do
        local artifact_id
        artifact_id=$(echo "$artifact" | jq -r '.id')
        write_info "Deleting artifact #$artifact_id..."

        if gh api -X DELETE "repos/$REPO/actions/artifacts/$artifact_id" >/dev/null 2>&1; then
            write_ok "Deleted artifact #$artifact_id"
            deleted_artifacts=$((deleted_artifacts + 1))
        else
            write_warn "Failed to delete artifact #$artifact_id"
        fi
        sleep 0.2
    done

    write_ok "Deleted: $deleted_artifacts artifacts older than 30 days"

    # Clean up old local log files (keep last 10)
    write_info "Cleaning up old workflow logs..."
    local log_files=()
    if [[ -d "$LOGS_DIR" ]]; then
        while IFS= read -r -d '' file; do
            log_files+=("$file")
        done < <(find "$LOGS_DIR" -name "*.log" -print0 2>/dev/null | sort -z -k1,1r)

        local logs_to_delete=()
        for log_file in "${log_files[@]}"; do
            if [[ "$log_file" -nt "$LOGS_DIR/.marker" ]] || true; then
                # Simple approach: check age
                local file_age
                file_age=$(( $(date +%s) - $(stat -c %Y "$log_file" 2>/dev/null || echo 0) ))
                if (( file_age > 90 * 24 * 60 * 60 )); then
                    logs_to_delete+=("$log_file")
                fi
            fi
        done

        local logs_deleted=0
        for log_file in "${logs_to_delete[@]}"; do
            write_info "Deleting log $log_file..."
            if rm -f "$log_file" 2>/dev/null; then
                write_ok "Deleted log $log_file"
                logs_deleted=$((logs_deleted + 1))
            else
                write_fail "Failed to delete log $log_file"
            fi
        done

        write_ok "Cleaned up: $logs_deleted old log files"
    fi
}

# ============================================================================
# Phase 3: Git Push
# ============================================================================

phase3_git_push() {
    write_step "PHASE 3: Pushing project..."

    cd "$REPO_ROOT" || {
        write_fail "Could not change to repo root $REPO_ROOT"
        return 1
    }

    # Check git status
    local git_status
    git_status=$(git status --short 2>&1) || {
        write_fail "Could not check git status"
        return 1
    }

    if [[ -z "$git_status" ]]; then
        write_info "No uncommitted changes"
        return 0
    fi

    write_info "Changes detected:"
    write_code "$git_status"

    # Stage files
    write_info "Staging files..."
    if ! git add . 2>&1; then
        write_fail "git add failed"
        return 1
    fi
    write_ok "Staged changes"

    # Commit
    local commit_msg="Automated workflow: fix + push at $(date '+%Y-%m-%d %H:%M')"
    write_info "Committing..."
    if ! git commit -m "$commit_msg" 2>&1; then
        write_fail "git commit failed"
        # Reset staging if commit fails
        git reset HEAD -- . 2>/dev/null || true
        return 1
    fi
    write_ok "Committed changes"

    # Check for unpushed commits
    local unpushed
    unpushed=$(git log origin/"$(get_git_branch)"..HEAD --oneline 2>&1) || true

    if [[ -n "$unpushed" ]]; then
        write_info "Unpushed commits detected:"
        write_code "$unpushed"
        write_info "Pushing to $(get_git_branch)..."
        local push_output
        push_output=$(git push origin "$(get_git_branch)" 2>&1) || {
            write_fail "git push failed: $push_output"
            return 1
        }
        write_ok "Pushed to $(get_git_branch)"
    else
        write_info "No unpushed commits"
    fi

    cd "$SCRIPT_DIR" || return 1
}

# ============================================================================
# Phase 4: Trigger Workflow
# ============================================================================

phase4_trigger_workflow() {
    write_step "PHASE 4: Triggering workflow..."

    write_info "Running build-os.yaml workflow..."

    local run_result
    run_result=$(invoke_with_retry "Trigger workflow" \
        "gh workflow run build-os.yaml --repo '$REPO' --ref '$(get_git_branch)' 2>&1" \
        3 10) || {
        write_fail "Could not trigger workflow"
        write_summary_log "[FAIL]" "Workflow trigger failed"
        exit 1
    }

    write_ok "Workflow triggered successfully"
    write_info "$run_result"
}

# ============================================================================
# Phase 5: Monitor Workflow Run
# ============================================================================

phase5_monitor_workflow() {
    write_step "PHASE 5: Monitoring workflow run..."

    sleep 10

    # Find the most recent in-progress run
    local runs
    runs=$(gh api "repos/$REPO/actions/runs?per_page=1&page=1&status=in_progress" --jq '
        .workflow_runs[:1] | .[] | .id' 2>/dev/null) || {
        write_fail "Monitoring failed: could not fetch runs"
        write_summary_log "[FAIL]" "Monitoring failed"
        exit 1
    }

    local run_id
    run_id=$(echo "$runs" | xargs || echo "")

    if [[ -n "$run_id" && "$run_id" != "null" && "$run_id" != "[]" ]]; then
        write_info "Active run ID: $run_id"

        local monitor_start
        monitor_start=$(date +%s)
        write_info "Watching workflow (Ctrl+C to skip)..."
        echo ""

        # Watch the run - capture exit code before piping
        local watch_output
        local watch_exit=0
        watch_output=$(gh run watch "$run_id" --repo "$REPO" --exit-status 2>&1) || watch_exit=$?

        local elapsed
        elapsed=$(( $(date +%s) - monitor_start ))
        write_header ""

        if (( watch_exit == 0 )); then
            write_ok "Workflow completed successfully!"
            write_summary_log "[OK]" "Workflow run $run_id succeeded in ${elapsed}s"
        else
            write_fail "Workflow failed with exit code: $watch_exit"
            write_summary_log "[FAIL]" "Workflow run $run_id failed with exit code $watch_exit"
            exit 1
        fi

        # Fetch and display per-job summary
        local jobs
        jobs=$(gh api "repos/$REPO/actions/runs/$run_id/jobs" --jq '
            .jobs[] | {name: .name, conclusion: .conclusion}' 2>/dev/null) || true

        if [[ -n "$jobs" && "$jobs" != "null" ]] && (( $? == 0 )); then
            echo ""
            write_info "Job summary:"
            local job_list
            job_list=$(echo "$jobs" | jq -c '.[]')

            local job
            for job in $(echo "$job_list"); do
                local job_name
                local job_conclusion
                job_name=$(echo "$job" | jq -r '.name // empty')
                job_conclusion=$(echo "$job" | jq -r '.conclusion // empty')

                if [[ "$job_conclusion" == "success" ]]; then
                    write_check "$job_name"
                else
                    write_cross "$job_name - $job_conclusion"
                fi
            done
        fi
    else
        write_info "No active runs found - checking recent runs..."
        local recent
        recent=$(gh run list --repo "$REPO" --limit 1 --json databaseId,status,conclusion,number 2>/dev/null)
        write_code "$recent"
    fi
}

# ============================================================================
# Dependency Management (jq + gh)
# ============================================================================

cmd_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install a package via winget. Falls back gracefully if winget is missing.
install_with_winget() {
    local pkg_id="$1"
    local name="$2"

    if cmd_exists winget; then
        write_info "Installing $name via winget ($pkg_id)..."
        if winget install --accept-package-agreements --accept-source-agreements "$pkg_id" >/dev/null 2>&1; then
            write_ok "$name installed via winget"
            return 0
        else
            write_warn "winget install of $name failed"
            return 1
        fi
    else
        write_warn "winget not found - cannot auto-install $name"
        return 1
    fi
}

ensure_dependency() {
    local cmd="$1"
    local pkg_id="$2"
    local name="$3"

    if cmd_exists "$cmd"; then
        return 0
    fi

    write_warn "$name ($cmd) is not installed."

    # Try winget first
    if install_with_winget "$pkg_id" "$name"; then
        return 0
    fi

    # Fallback: download jq directly (Windows)
    if [[ "$cmd" == "jq" ]]; then
        local jq_target="/c/Windows/System32/jq.exe"
        write_info "Downloading jq directly..."
        if curl -fsSL "https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-windows-amd64.exe" -o "$jq_target" 2>/dev/null; then
            write_ok "jq downloaded to $jq_target"
            return 0
        fi
    fi

    write_fail "$name is required but could not be installed automatically."
    write_info "Install it manually: winget install $pkg_id"
    return 1
}

ensure_dependencies() {
    local ok=1
    ensure_dependency jq jqlang.jq "jq" || ok=0
    ensure_dependency gh GitHub.cli "GitHub CLI (gh)" || ok=0
    if [[ "$ok" != "1" ]]; then
        write_fail "Missing required dependencies. Aborting."
        exit 1
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    local phase_start
    phase_start=$(date +%s)

    # Ensure jq and gh are available (install via winget if missing)
    ensure_dependencies

    # Create logs directory
    mkdir -p "$LOGS_DIR"

    local log_file="$LOGS_DIR/workflow-run-$(date '+%Y-%m-%d_%H-%M-%S').log"
    # Simple transcript: redirect all output to log file and stdout
    exec > >(tee -a "$log_file") 2>&1

    local branch
    branch=$(get_git_branch)

    write_header "FastFree Workflow Manager v$SCRIPT_VERSION"
    write_info "Repository: $REPO"
    write_info "Root: $REPO_ROOT"
    write_info "Branch: $branch"
    write_info "Logs dir: $LOGS_DIR"
    write_info "Log file: $log_file"

    # Phase 1: Validate YAML files
    if [[ "$SKIP_VALIDATION" != "1" ]]; then
        write_step "PHASE 1: Validating YAML files..."
        phase1_validate_yaml
    else
        write_step "PHASE 1: Skipped (user requested)"
    fi

    # Phase 2: Delete failed runs and cleanup
    if [[ "$SKIP_DELETE" != "1" ]]; then
        write_step "PHASE 2: Deleting failed workflow runs and cleanup..."
        phase2_delete_runs_and_cleanup
    else
        write_step "PHASE 2: Skipped (user requested)"
    fi

    # Phase 3: Git push
    if [[ "$SKIP_PUSH" != "1" ]]; then
        write_step "PHASE 3: Pushing project..."
        phase3_git_push || write_warn "Git push phase had errors"
    else
        write_step "PHASE 3: Skipped (user requested)"
    fi

    # Phase 4: Trigger workflow
    if [[ "$SKIP_RUN" != "1" ]]; then
        write_step "PHASE 4: Triggering workflow..."
        phase4_trigger_workflow
    else
        write_step "PHASE 4: Skipped (user requested)"
    fi

    # Phase 5: Monitor workflow run
    if [[ "$SKIP_RUN" != "1" ]]; then
        write_step "PHASE 5: Monitoring workflow run..."
        phase5_monitor_workflow
    else
        write_step "PHASE 5: Skipped (user requested)"
    fi

    # Phase 6: Summary
    local total_elapsed
    total_elapsed=$(( $(date +%s) - phase_start ))

    write_header "PHASE 6: Summary"

    local s1="Complete"
    local s2="Complete"
    local s3="Complete"
    local s4="Complete"
    local s5="Complete"

    [[ "$SKIP_VALIDATION" == "1" ]] && s1="Skipped"
    [[ "$SKIP_DELETE" == "1" ]] && s2="Skipped"
    [[ "$SKIP_PUSH" == "1" ]] && s3="Skipped"
    [[ "$SKIP_RUN" == "1" ]] && s4="Skipped" && s5="Skipped"

    write_header ""
    echo -e "  ${C_CYAN}Pipeline Summary:${C_RESET}" -foreground Cyan
    echo -e "  ${C_DARKGRAY}------------------${C_RESET}"
    echo -e "  1. YAML Validation:    ${s1}"
    echo -e "  2. Delete Failed Runs: ${s2}"
    echo -e "  3. Git Push:           ${s3}"
    echo -e "  4. Trigger Workflow:   ${s4}"
    echo -e "  5. Monitor:            ${s5}"
    echo ""
    echo -e "  ${C_WHITE}Branch: ${branch}${C_RESET}"
    echo -e "  ${C_WHITE}Total time: ${total_elapsed}s${C_RESET}"
    echo -e "  ${C_DARKGRAY}Transcript: $log_file${C_RESET}"
    echo -e "  ${C_DARKGRAY}Summary log: $SUMMARY_LOG${C_RESET}"
    echo ""

    write_summary_log "[OK]" "Pipeline completed in ${total_elapsed}s"

    write_header "Complete!"
}

# ============================================================================
# Run Main
# ============================================================================

parse_args "$@"

# Handle menu flag
if [[ "$MENU" == "1" ]]; then
    menu_loop
    exit $?
fi

# Execute main pipeline
main "$@"