# quser — backend (قرار + استخدام)

`quser` هو الباكند: نفس كود كشط HoloolHIS المجرب (ICU/CCU/NICU/NEO/Stroke)،
معاد تغليفه كـ CLI غير تفاعلي + API لاحقًا. الفرونت في `apps/fastfree_his`.

## البنية

```text
scripts/quser/
  pyproject.toml  uv.lock  .python-version  README.md
  .env.example    # انسخه إلى .env واملأ الأسرار (لا يُلتزم أبدًا)
  cli.py          # التشغيل: quser run --period morning|evening [--date ...]
  scraper/        # كود الكشط الأصلي كما هو (دون تعديل منطق)
  api/            # (قادم) FastAPI: POST /runs, GET /runs/:id
  systemd/        # (قادم) timers صباحي/مسائي
  tests/          # اختبارات دوال التاريخ النقية
```

## التشغيل (من جذر المونوريبو)

```bash
uv sync --locked --project scripts/quser
uv run --project scripts/quser cli.py --period morning
uv run --project scripts/quser cli.py --period evening --date 28/09/2026
```

الأسرار من البيئة (تغلب على `config.json`):
`HIS_URL` `HIS_HOSPITAL` `HIS_USERNAME` `HIS_PASSWORD`

## المتصفح (أول مرة على أي جهاز)

```bash
uv run --project scripts/quser -- playwright install chromium
```

## قواعد

- ممنوع `package.json` هنا (خارج pnpm عمدًا).
- ممنوع التزام `.env` أو `sites/*.json` أو `output/` أو `*.db` (انظر `.gitignore` الجذر).
- `uv.lock` يُلتزم دائمًا (CI يستخدم `--locked`).
