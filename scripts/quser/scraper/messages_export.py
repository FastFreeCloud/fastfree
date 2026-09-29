from __future__ import annotations

import html as _html_lib
from datetime import datetime
from pathlib import Path

from .models import PatientData, DEPARTMENTS

DOCTOR_FIELDS: list[tuple[str, str]] = [
    ("diagnosis", "<b>Diagnosis</b> — التشخيص"),
    ("complaints", "<b>Complaints</b> — الشكاوى"),
    ("procedures", "<b>Procedures</b> — الإجراءات الطبية"),
    ("medicine", "<b>Medications</b> — الأدوية"),
    ("apache", "<b>Apache Score</b> — تقييم أباتشي"),
    ("oxygen", "<b>Oxygen Chest Care</b> — جلسات الأكسجين"),
    ("feeding", "<b>Patient Feeding</b> — تغذية المريض"),
]

NURSE_FIELDS: list[tuple[str, str]] = [
    ("initial", "<b>Initial Assessment</b> — التقييم الأولي (مرة واحدة عند الدخول)"),
    ("daily", "<b>Daily Assessment</b> — التقييم اليومي"),
    ("vitals", "<b>Vital Signs</b> — العلامات الحيوية"),
    ("fluid", "<b>Fluid Balance</b> — ميزان السوائل"),
    ("turning", "<b>Patient Turning</b> — جدول تقليب المريض"),
    ("invasive", "<b>Invasive</b> — التنفس الصناعي / الخط الغزوي"),
]

_CSS = """
*{box-sizing:border-box;font-family:'Segoe UI',Tahoma,Arial,sans-serif}
body{margin:0;padding:10px;background:#f5f5f5}
.container{max-width:900px;margin:0 auto}
.header{background:linear-gradient(135deg,#003366,#4472C4);color:#fff;
  padding:20px;text-align:center;border-radius:10px;margin-bottom:15px}
.header h1{margin:0;font-size:clamp(18px,4vw,26px)}
.header p{margin:8px 0 0;opacity:.9}
.dept{background:#fff;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.08);
  margin-bottom:15px;overflow:hidden}
.dept-head{background:#003366;color:#fff;padding:12px 15px;font-size:18px;font-weight:700}
.msg{margin:12px;border:1px solid #ddd;border-radius:8px;overflow:hidden}
.msg-head{padding:10px 12px;font-weight:700;color:#fff;display:flex;
  justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.msg-doctors .msg-head{background:#1A5276}
.msg-nurses .msg-head{background:#117A65}
.copy-btn{border:none;border-radius:6px;padding:6px 14px;font-weight:700;
  cursor:pointer;background:#fff;color:#003366}
.msg-body{padding:12px 14px;line-height:2;white-space:pre-wrap}
.footer{text-align:center;color:#666;font-size:12px;padding:10px}
.stats{display:flex;justify-content:center;gap:20px;padding:15px;background:#fff;
  border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.08);margin-bottom:15px;flex-wrap:wrap}
.stat{text-align:center}
.stat-value{font-size:clamp(24px,5vw,32px);font-weight:700;color:#003366}
.stat-label{font-size:clamp(11px,2vw,14px);color:#666}
"""

_JS = """
function copyMsg(id, btn){
  const el = document.getElementById(id);
  const text = el.innerText;
  const done = () => { const o = btn.innerText; btn.innerText = 'تم النسخ'; setTimeout(()=>btn.innerText=o, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(()=>{ fallback(); });
  } else { fallback(); }
  function fallback(){
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta); done();
  }
}
"""


def _missing(rec: PatientData, fields: list[tuple[str, str]]) -> list[str]:
    return [label for attr, label in fields if not getattr(rec, attr, False)]


def _message_block(kind: str, title: str, intro: str, lines: list[str],
                    responsibility: str, msg_id: str, no_missing_text: str) -> str:
    if lines:
        body = intro + "\n" + "\n".join(lines)
    else:
        body = no_missing_text
    footer = f"\n{responsibility}"
    return (
        f'<div class="msg msg-{kind}"><div class="msg-head"><span>{title}</span>'
        f'<button class="copy-btn" onclick="copyMsg(\'{msg_id}\', this)">نسخ الرسالة</button></div>'
        f'<div class="msg-body" id="{msg_id}">{body}{footer}</div></div>'
    )


def _build_single_html(header_title: str, header_subtitle: str,
                        sections: list[str], css: str, js: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{header_title}</title>
<style>{css}</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>{header_title}</h1>
    <p>{header_subtitle}</p>
  </div>
  {"".join(sections)}
</div>
<script>{js}</script>
</body>
</html>"""


def generate_messages(records: list[PatientData], output_dir: Path, timestamp: str,
                      config: dict, departments: list[str] | None = None,
                      period: str = "صباحي") -> list[Path]:
    msg_cfg = config.get("messages", {})
    docs_cfg = msg_cfg.get("doctors", {})
    nurses_cfg = msg_cfg.get("nurses", {})
    header_cfg = msg_cfg.get("header", {})
    stats_cfg = msg_cfg.get("stats", {})
    sections_cfg = msg_cfg.get("sections", {})
    resp_cfg = msg_cfg.get("responsible", {})

    sep = sections_cfg.get("separator", "======≈=================")
    missing_label = sections_cfg.get("missing_label", "البيانات الغير مكتمله:")
    no_missing = sections_cfg.get("no_missing", "لا توجد بيانات غير مكتمله — جميع الحالات مستكملة.")
    docs_footer = docs_cfg.get("footer", "عدم الإدخال على مسؤولية الطبيب المعالج.")
    nurses_footer = nurses_cfg.get("footer", "عدم الإدخال على مسؤولية التمريض.")
    docs_intro = docs_cfg.get("intro", "برجاء من طاقم الأطباء إدخال الحالات الجديدة واستكمال الآتي لكل حالة:")
    nurses_intro = nurses_cfg.get("intro", "برجاء من طاقم التمريض استكمال الآتي لكل حالة:")
    docs_title = docs_cfg.get("title", "السادة الأطباء")
    nurses_title = nurses_cfg.get("title", "هيئة التمريض")
    header_title = header_cfg.get("title", "مستشفى منفلوط — رسائل استكمال البيانات")
    header_subtitle = header_cfg.get("subtitle", "تاريخ التحديث: ")
    stats_total_label = stats_cfg.get("total_label", "إجمالي الأسرّة المحجوزة")
    stats_missing_label = stats_cfg.get("missing_label", "أسرّة بها نواقص")

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%I:%M %p")
    full_datetime = f"{date_str} {time_str}"

    grouped: dict[str, list[PatientData]] = {}
    for rec in records:
        if rec.status != "Occupied":
            continue
        dept = rec.bed.split("_")[0]
        grouped.setdefault(dept, []).append(rec)

    dept_cfg = config.get("departments")
    if departments is None:
        if dept_cfg is None:
            departments = [d.name for d in DEPARTMENTS]
        else:
            departments = [d.name for d in DEPARTMENTS if dept_cfg.get(d.name, True)]

    total_occ = sum(len(v) for v in grouped.values())
    with_missing = sum(
        1 for beds in grouped.values() for b in beds
        if _missing(b, DOCTOR_FIELDS) or _missing(b, NURSE_FIELDS)
    )

    created_files: list[Path] = []
    combined_doc_parts: list[str] = []
    combined_nurse_parts: list[str] = []

    for dept in departments:
        beds = grouped.get(dept, [])
        doc_lines: list[str] = []
        nurse_lines: list[str] = []

        for b in beds:
            dm = _missing(b, DOCTOR_FIELDS)
            nm = _missing(b, NURSE_FIELDS)
            who = f"{_html_lib.escape(b.bed)} — {_html_lib.escape(b.name) if b.name else 'بدون اسم'}"
            if dm:
                doc_lines.append(f"{sep}\n<b>سرير {who}</b>\n{missing_label}")
                doc_lines.extend(f"{i}. {label}" for i, label in enumerate(dm, 1))
            if nm:
                nurse_lines.append(f"{sep}\n<b>سرير {who}</b>\n{missing_label}")
                nurse_lines.extend(f"{i}. {label}" for i, label in enumerate(nm, 1))

        dept_safe = _html_lib.escape(dept)

        # Per-department doctor file
        doc_block = _message_block(
            "doctors", docs_title, docs_intro,
            doc_lines, f"\n<b>{docs_footer}</b>", f"msg-doc-{dept}", no_missing,
        )
        doc_section = f'<div class="dept"><div class="dept-head">{dept_safe} ({len(beds)} beds)</div>{doc_block}</div>'
        doc_html = _build_single_html(
            f"{dept_safe} — رسائل الأطباء", f"{header_subtitle}{full_datetime}",
            [doc_section], _CSS, _JS,
        )
        doc_path = output_dir / f"{dept}_Doctors.html"
        doc_path.write_text(doc_html, encoding="utf-8")
        created_files.append(doc_path)

        # Per-department nurse file
        nurse_block = _message_block(
            "nurses", nurses_title, nurses_intro,
            nurse_lines, f"\n<b>{nurses_footer}</b>", f"msg-nurse-{dept}", no_missing,
        )
        nurse_section = f'<div class="dept"><div class="dept-head">{dept_safe} ({len(beds)} beds)</div>{nurse_block}</div>'
        nurse_html = _build_single_html(
            f"{dept_safe} — رسائل التمريض", f"{header_subtitle}{full_datetime}",
            [nurse_section], _CSS, _JS,
        )
        nurse_path = output_dir / f"{dept}_Nurses.html"
        nurse_path.write_text(nurse_html, encoding="utf-8")
        created_files.append(nurse_path)

        combined_doc_parts.append(doc_section)
        combined_nurse_parts.append(nurse_section)

    # Combined doctors file
    combined_doc_html = _build_single_html(
        "رسائل الأطباء — كل الأقسام", f"{header_subtitle}{full_datetime}",
        combined_doc_parts, _CSS, _JS,
    )
    combined_doc_path = output_dir / "FlowUp_Doctors.html"
    combined_doc_path.write_text(combined_doc_html, encoding="utf-8")
    created_files.insert(0, combined_doc_path)

    # Combined nurses file
    combined_nurse_html = _build_single_html(
        "رسائل التمريض — كل الأقسام", f"{header_subtitle}{full_datetime}",
        combined_nurse_parts, _CSS, _JS,
    )
    combined_nurse_path = output_dir / "FlowUp_Nurses.html"
    combined_nurse_path.write_text(combined_nurse_html, encoding="utf-8")
    created_files.insert(1, combined_nurse_path)

    return created_files
