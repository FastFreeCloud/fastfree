Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinStationTest {
    [DllImport("user32.dll")]
    public static extern IntPtr GetProcessWindowStation();

    [DllImport("user32.dll")]
    public static extern IntPtr GetThreadDesktop(uint dwThreadId);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool GetUserObjectInformation(IntPtr hObj, int nIndex, StringBuilder pvInfo, int nLength, out int lpnLengthNeeded);

    public static void Check() {
        IntPtr hWinsta = GetProcessWindowStation();
        StringBuilder sb = new StringBuilder(256);
        int needed;
        GetUserObjectInformation(hWinsta, 2, sb, 256, out needed);
        Console.WriteLine("Window Station: " + sb.ToString());

        IntPtr hDesk = GetThreadDesktop(GetCurrentThreadId());
        sb.Clear();
        GetUserObjectInformation(hDesk, 2, sb, 256, out needed);
        Console.WriteLine("Desktop: " + sb.ToString());
    }
}
'@

[WinStationTest]::Check()
