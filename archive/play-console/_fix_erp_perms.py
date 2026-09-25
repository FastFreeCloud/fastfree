from pathlib import Path
from playwright.sync_api import sync_playwright

SA_URL = (
    "https://play.google.com/console/u/0/developers/"
    "7269125617638997236/users-and-permissions/"
    "fastfree-play-publisher%40fastfree-508417.iam.gserviceaccount.com"
)
SHOT = Path(".auth/play-console/fix-admin5.png")

pw = sync_playwright().start()
browser = pw.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=25000)
ctx = browser.contexts[0]
page = ctx.pages[0]

page.goto(SA_URL, wait_until="domcontentloaded", timeout=60000)
page.wait_for_timeout(5000)

page.get_by_role("tab", name="Account permissions").first.click()
page.wait_for_timeout(3000)

JS_GET_ADMIN_COORDS = """() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let adminEl = null;
    while (walker.nextNode()) {
        const el = walker.currentNode;
        for (const child of el.childNodes) {
            if (child.nodeType === 3 && child.textContent.includes('Admin (all permissions)')) {
                adminEl = el;
                break;
            }
        }
        if (adminEl) break;
    }
    if (!adminEl) return null;
    const matCb = adminEl.closest('material-checkbox') || adminEl.parentElement;
    if (!matCb) return null;
    const input = matCb.querySelector('input[role="checkbox"]');
    if (input) {
        const r = input.getBoundingClientRect();
        return { x: r.x + r.width/2, y: r.y + r.height/2 };
    }
    const r = matCb.getBoundingClientRect();
    return { x: r.x + 20, y: r.y + r.height/2 };
}"""

coords = page.evaluate(JS_GET_ADMIN_COORDS)
print(f"Admin coords: {coords}")

if coords:
    page.mouse.click(coords["x"], coords["y"])
    page.wait_for_timeout(2000)
    print("Clicked Admin checkbox")

    JS_CHECK_STATE = """() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let adminEl = null;
        while (walker.nextNode()) {
            const el = walker.currentNode;
            for (const child of el.childNodes) {
                if (child.nodeType === 3 && child.textContent.includes('Admin (all permissions)')) {
                    adminEl = el;
                    break;
                }
            }
            if (adminEl) break;
        }
        if (!adminEl) return null;
        const matCb = adminEl.closest('material-checkbox') || adminEl.parentElement;
        const inp = matCb ? matCb.querySelector('input[role="checkbox"]') : null;
        if (inp) return { checked: inp.checked, aria: inp.getAttribute('aria-checked') };
        return null;
    }"""
    state = page.evaluate(JS_CHECK_STATE)
    print(f"State after click: {state}")

    page.screenshot(path=str(SHOT).replace(".png", "-after.png"), full_page=False)

    save = page.get_by_role("button", name="Save changes")
    if save.count() > 0 and save.first.is_enabled():
        save.first.click()
        page.wait_for_timeout(3000)

        yes = page.get_by_role("button", name="Yes")
        if yes.count() > 0 and yes.first.is_visible():
            yes.first.click()
            page.wait_for_timeout(5000)
            print("Confirmed!")
        else:
            print("No confirmation dialog")

        page.screenshot(path=str(SHOT).replace(".png", "-saved.png"), full_page=False)
        print("Saved!")
    else:
        en = save.first.is_enabled() if save.count() > 0 else "N/A"
        print(f"Save disabled or not found: enabled={en}")
else:
    print("Could not find Admin checkbox coords")

pw.stop()
