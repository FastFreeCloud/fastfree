Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.IO;

public class DesktopLauncher {
    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public uint dwProcessId;
        public uint dwThreadId;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
        public uint cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public uint dwX;
        public uint dwY;
        public uint dwXSize;
        public uint dwYSize;
        public uint dwXCountChars;
        public uint dwYCountChars;
        public uint dwFillAttribute;
        public uint dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation);

    [DllImport("kernel32.dll")]
    public static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    [DllImport("kernel32.dll")]
    public static extern bool GetExitCodeProcess(IntPtr hProcess, out uint lpExitCode);

    public static void LaunchAndMonitor(string exePath, string workDir) {
        STARTUPINFO si = new STARTUPINFO();
        si.cb = (uint)Marshal.SizeOf(si);
        si.lpDesktop = "WinSta0\\Default";

        PROCESS_INFORMATION pi = new PROCESS_INFORMATION();

        bool success = CreateProcess(
            exePath,
            null,
            IntPtr.Zero,
            IntPtr.Zero,
            false,
            0x00000010, // CREATE_NEW_CONSOLE
            IntPtr.Zero,
            workDir,
            ref si,
            out pi);

        if (!success) {
            int err = Marshal.GetLastWin32Error();
            Console.WriteLine("CreateProcess failed with error: " + err);
            return;
        }

        Console.WriteLine("Started PID: " + pi.dwProcessId);
        uint waitRes = WaitForSingleObject(pi.hProcess, 5000);
        if (waitRes == 0) { // Signaled = Exited
            uint exitCode;
            GetExitCodeProcess(pi.hProcess, out exitCode);
            Console.WriteLine("Process exited within 5s with code: " + exitCode);
        } else {
            Console.WriteLine("Process is still running happily after 5s!");
        }
    }
}
'@

$exe = "C:\Users\FastFree\Desktop\fastfree\apps\fastfree_installer\src-tauri\target\debug\fastfree-installer.exe"
$dir = "C:\Users\FastFree\Desktop\fastfree\apps\fastfree_installer"

[DesktopLauncher]::LaunchAndMonitor($exe, $dir)
