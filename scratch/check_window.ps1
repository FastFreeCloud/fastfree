Add-Type @'
  using System;
  using System.Collections.Generic;
  using System.Runtime.InteropServices;
  using System.Text;

  public class Win32 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public struct RECT { public int Left, Top, Right, Bottom; }

    public static List<string> FindWindowsForPid(uint targetPid) {
      var list = new List<string>();
      EnumWindows((hWnd, lParam) => {
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        if (pid == targetPid) {
          bool vis = IsWindowVisible(hWnd);
          StringBuilder sb = new StringBuilder(256);
          GetWindowText(hWnd, sb, 256);
          RECT r;
          GetWindowRect(hWnd, out r);
          list.Add(string.Format("hWnd: 0x{0:X}, Visible: {1}, Title: '{2}', Rect: [{3},{4} - {5}x{6}]",
            hWnd.ToInt64(), vis, sb.ToString(), r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top));
        }
        return true;
      }, IntPtr.Zero);
      return list;
    }

    public static void BringToFront(uint targetPid) {
      EnumWindows((hWnd, lParam) => {
        uint pid;
        GetWindowThreadProcessId(hWnd, out pid);
        if (pid == targetPid) {
          ShowWindow(hWnd, 9); // SW_RESTORE
          SetForegroundWindow(hWnd);
        }
        return true;
      }, IntPtr.Zero);
    }
  }
'@

$proc = Get-Process -Name 'fastfree-installer' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc) {
    Write-Host "Found PID: $($proc.Id)"
    [Win32]::FindWindowsForPid($proc.Id) | ForEach-Object { Write-Host $_ }
    [Win32]::BringToFront($proc.Id)
    Write-Host "Brought window to front."
} else {
    Write-Host "Process fastfree-installer not found."
}
