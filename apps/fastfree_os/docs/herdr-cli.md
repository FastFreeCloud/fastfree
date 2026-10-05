# Herdr CLI Reference — نسخة داخل المشروع

> المصدر: https://herdr.dev/docs/cli-reference/
> النسخة المثبتة محلياً: `herdr 0.9.3` (stable, protocol 22)
> التثبيت المحلي: `nix profile install github:herdrdev/herdr`
> المسار: `/home/fastfree/.nix-profile/bin/herdr`
> السوكت: `/home/fastfree/.config/herdr/herdr.sock`
> التكامل في المشروع: `modules/herdr.nix` + `modules/shell.nix`

كل الأوامر تطبع JSON — مناسبة للأتمتة في سكريبتات.

## Launch + status

```bash
herdr                         # launch or attach default session
herdr --remote workbox        # attach عبر SSH
herdr --default-config        # طباعة الكونفيج الافتراضي
herdr update                  # تنزيل وتثبيت من القناة المضبوطة
herdr channel show
herdr channel set preview
herdr channel set stable
herdr --version
herdr status
herdr status server
herdr status client
herdr api schema
herdr api schema --json
herdr api schema --output herdr-api.schema.json
```

## zsh completions (مهم — مربوط بـ modules/shell.nix)

```bash
herdr completion zsh           # طباعة سكريبت الإكمال
source <(herdr completion zsh) # جلسة مؤقتة

# دائم:
mkdir -p ~/.zfunc
herdr completion zsh > ~/.zfunc/_herdr
# وفي .zshrc قبل compinit:
# fpath=(~/.zfunc $fpath)
# autoload -Uz compinit; compinit
```

موديول `shell.nix` يعمل هذا تلقائياً عند كل تشغيل zsh لو `herdr` على PATH.

## Sessions / Workspaces / Worktrees / Tabs

```bash
herdr session list [--json]
herdr session attach <name>
herdr session stop <name> [--json]
herdr session delete <name> [--json]

herdr workspace list
herdr workspace create [--cwd PATH] [--label TEXT] [--env KEY=VALUE] [--focus|--no-focus]
herdr workspace get <id>
herdr workspace focus <id>
herdr workspace rename <id> <label>
herdr workspace close <id> [--group]
herdr workspace create --cwd ~/project --label api --no-focus

herdr worktree list [--workspace ID|--cwd PATH]
herdr worktree create [--workspace ID|--cwd PATH] [--branch NAME] [--base REF] [--path PATH]
herdr worktree open [--workspace ID|--cwd PATH] (--path PATH|--branch NAME)
herdr worktree remove --workspace ID [--force]

herdr tab list [--workspace <id>]
herdr tab create [--workspace <id>] [--cwd PATH] [--label TEXT] [--focus|--no-focus]
herdr tab get <id> / focus / rename / close
```

## Panes (القراءة + الإرسال + الانتظار)

```bash
herdr pane list [--workspace <id>]
herdr pane get <id>
herdr pane read <id> [--source visible|recent|recent-unwrapped|detection] [--lines N] [--format text|ansi]
herdr pane send-text <id> <text>
herdr pane send-keys <id> <key> [key ...]   # enter, esc, ctrl+c, f1, ...
herdr pane run <id> <command>               # يفضل على send-text + Enter
herdr pane split [<id>] --direction right|down [--cwd PATH] [--focus|--no-focus]
herdr pane focus --direction left|right|up|down
herdr pane close <id>
herdr pane wait-output <id> (--match <text>|--regex <pattern>) [--timeout MS]
```

## Agents

```bash
herdr agent list
herdr agent get <name-or-pane>
herdr agent read <target> [--lines N]
herdr agent prompt <target> <text> [--wait] [--until STATUS] [--timeout MS]
herdr agent send-keys <target> <key> [key ...]
herdr agent wait <target> [--until STATUS] [--timeout MS]
herdr agent rename <target> <name>|--clear
herdr agent focus <target>
herdr agent attach <target> [--takeover]
herdr agent start <name> --kind KIND --pane ID [-- <agent-args...>]
# KINDS: pi, claude, codex, gemini, cursor, opencode, copilot, ...
herdr agent explain <target> [--json|--verbose]
```

## Server / Notifications / Machines

```bash
herdr server
herdr server stop
herdr server reload-config
herdr server agent-manifests [--json]

herdr notification show <title> [--body TEXT] [--position top-left|top-right|bottom-left|bottom-right]

herdr machine list [--json]
herdr machine add workbox [--label "Build machine"]
herdr machine status [<label-or-id>] [--json]
herdr --machine "Build machine" agent list
herdr --machine "Build machine" pane list
```

## Plugins / Integrations

```bash
herdr integration install opencode
herdr integration status [--outdated-only]
herdr plugin install <owner>/<repo>[/subdir] [--ref REF] [--yes]
herdr plugin list [--json]
herdr plugin action list / invoke
herdr plugin pane open --plugin ID --entrypoint ID
```

## Env vars

| متغير | الاستخدام |
|---|---|
| `HERDR_CONFIG_PATH` | override مسار الكونفيج |
| `HERDR_SESSION` | اختيار session للأوامر |
| `HERDR_SOCKET_PATH` | override مسار السوكت |
| `HERDR_PANE_ID` / `HERDR_TAB_ID` / `HERDR_WORKSPACE_ID` | داخل pane مُدار |
| `HERDR_ENV=1` | داخل عمليات Herdr |

## تحقق محلي سريع

```bash
herdr --version && herdr status
rg -n herdr modules/ docs/ | head
fd -H 'herdr|shell' . | head
ugrep -r -n 'herdr|programs.zsh' modules/ | head
```
