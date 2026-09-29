from __future__ import annotations

import html as _html_lib
from datetime import datetime

from .models import PatientData, TRACKING_COLUMNS, DEPARTMENTS

_CSS = """
*{box-sizing:border-box;font-family:'Segoe UI',Tahoma,Arial,sans-serif}
body{margin:0;padding:10px;background:#f5f5f5}
.container{max-width:100%;margin:0 auto;background:#fff;border-radius:10px;
  box-shadow:0 2px 15px rgba(0,0,0,.08);overflow:hidden}
.header{background:linear-gradient(135deg,#003366,#4472C4);color:#fff;
  padding:20px;text-align:center}
.header h1{margin:0;font-size:clamp(18px,4vw,28px)}
.header p{margin:8px 0 0;opacity:.9;font-size:clamp(12px,2vw,16px)}
.stats{display:flex;justify-content:center;gap:20px;padding:15px;background:#f8f9fa;flex-wrap:wrap}
.stat{text-align:center}
.stat-value{font-size:clamp(24px,5vw,32px);font-weight:700;color:#003366}
.stat-label{font-size:clamp(11px,2vw,14px);color:#666}
.content{padding:15px;overflow-x:auto}
.dept-section{margin-bottom:30px}
.dept-section h2{color:#333;border-bottom:3px solid #003366;
  padding-bottom:8px;margin-bottom:15px;font-size:clamp(14px,3vw,18px)}
.table-wrapper{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{width:100%;border-collapse:collapse;margin-bottom:15px;min-width:800px}
th,td{padding:8px 6px;text-align:center;border:1px solid #ddd;font-size:clamp(10px,1.8vw,13px);white-space:nowrap}
th{background:#003366;color:#fff;font-weight:600;position:sticky;top:0;z-index:1}
tr:nth-child(even){background:#f9f9f9}
tr:hover{background:#f0f0f0}
.true-cell{color:#27AE60;font-weight:600;background:#D5F5E3}
.empty-cell{color:#999}
.empty-note{color:#7f8c8d;background:#fef9e7;font-weight:600;padding:12px}
.footer{text-align:center;padding:15px;background:#f8f9fa;color:#666;font-size:clamp(10px,1.8vw,13px)}
@media(max-width:768px){body{padding:5px}th,td{padding:6px 4px}}
@media(max-width:480px){.stats{flex-direction:column;gap:5px}
  .stat{display:flex;align-items:center;justify-content:center;gap:8px}}
"""


def _dept_table(dept, beds, responsible):
    cols = "".join(f"<th>{c}</th>" for c in TRACKING_COLUMNS)
    rows = ""
    for b in beds:
        cells = "".join(
            f'<td class="{"true-cell" if v else "empty-cell"}">{"TRUE" if v else ""}</td>'
            for v in b.to_values()
        )
        bed_escaped = _html_lib.escape(b.bed)
        name_escaped = _html_lib.escape(b.name) if b.name else ""
        responsible_escaped = _html_lib.escape(responsible) if responsible else ""
        rows += f"<tr><td>{bed_escaped}</td><td>{name_escaped}</td>{cells}<td>{responsible_escaped}</td></tr>\n"
    return (
        f'<div class="dept-section"><h2>{_html_lib.escape(dept)} ({len(beds)} beds)</h2>'
        f'<div class="table-wrapper"><table><thead><tr>'
        f"<th>BED</th><th>NAME</th>{cols}<th>المسؤول</th></tr></thead>"
        f"<tbody>{rows}</tbody></table></div></div>"
    )


FALLBACK_DEPTS = [d.name for d in DEPARTMENTS]


def _dept_empty_section(dept, responsible):
    note = "لا توجد بيانات — تعذر تحميل القسم أو لا يوجد أسرّة"
    if responsible:
        note += f" — المسؤول: {responsible}"
    return (
        f'<div class="dept-section"><h2>{_html_lib.escape(dept)} (0 beds)</h2>'
        f'<div class="table-wrapper"><table><thead><tr>'
        f"<th>BED</th><th>NAME</th>"
        + "".join(f"<th>{c}</th>" for c in TRACKING_COLUMNS) +
        f'<th>المسؤول</th></tr></thead><tbody><tr>'
        f'<td colspan="16" class="empty-note">{_html_lib.escape(note)}</td></tr>'
        f"</tbody></table></div></div>"
    )


def generate_html(records, output_dir, timestamp, config, departments=None, period="صباحي"):
    grouped = {}
    for rec in records:
        dept = rec.bed.split("_")[0]
        grouped.setdefault(dept, []).append(rec)

    responsible_map = config.get("responsible", {})
    dept_cfg = config.get("departments")
    if departments is None:
        if dept_cfg is None:
            departments = list(FALLBACK_DEPTS)
        else:
            departments = [d for d in FALLBACK_DEPTS if dept_cfg.get(d, True)]
    tables = ""
    for d in departments:
        beds = grouped.get(d, [])
        if beds:
            tables += _dept_table(d, beds, responsible_map.get(d, ""))
        else:
            tables += _dept_empty_section(d, responsible_map.get(d, ""))

    now = datetime.now()
    active = sum(1 for r in records if r.status == "Occupied" and any(r.to_values()))

    html = f"""\
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FlowUp {period} - {now.strftime('%Y-%m-%d')}</title>
<style>{_CSS}</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>FlowUp {period}</h1>
    <p>مستشفى منفلوط - {now.strftime('%Y-%m-%d')}</p>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-value">{len(records)}</div>
      <div class="stat-label">إجمالي الأسرّة</div></div>
    <div class="stat"><div class="stat-value">{active}</div>
      <div class="stat-label">لديهم متابعة</div></div>
  </div>
  <div class="content">{tables}</div>
  <div class="footer"><p>تم التحديث: {now.strftime('%Y-%m-%d %H:%M')}</p></div>
</div>
</body>
</html>"""

    path = output_dir / "FlowUp.html"
    path.write_text(html, encoding="utf-8")
    return path
