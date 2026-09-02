package com.fastfree.vpn;

import android.content.Context;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import com.getcapacitor.JSObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

public class WireGuardService {
    private static final String TAG = "WireGuardService";
    private final Context context;
    private ParcelFileDescriptor vpnInterface;
    private boolean isConnected = false;
    private String currentInterface = "";
    private long bytesIn = 0;
    private long bytesOut = 0;

    public WireGuardService(Context context) {
        this.context = context;
    }

    public JSObject generateKeys() throws NoSuchAlgorithmException {
        KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("Curve25519");
        KeyPair keyPair = keyPairGenerator.generateKeyPair();

        String privateKey = Base64.getEncoder().encodeToString(keyPair.getPrivate().getEncoded());
        String publicKey = Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded());

        JSObject keys = new JSObject();
        keys.put("privateKey", privateKey);
        keys.put("publicKey", publicKey);
        return keys;
    }

    public void connect(String privateKey, String publicKey, String address, String endpoint, String dns, String allowedIPs) throws IOException {
        if (isConnected) {
            Log.w(TAG, "Already connected");
            return;
        }

        // Write config file
        String config = String.format(
            "[Interface]\nPrivateKey = %s\nAddress = %s\nDNS = %s\n\n[Peer]\nPublicKey = %s\nEndpoint = %s\nAllowedIPs = %s",
            privateKey, address, dns, publicKey, endpoint, allowedIPs
        );

        File configFile = new File(context.getFilesDir(), "wg0.conf");
        try (FileOutputStream fos = new FileOutputStream(configFile)) {
            fos.write(config.getBytes());
        }

        // Start WireGuard tunnel
        // This is a simplified implementation
        // In production, use com.wireguard.android:tunnel library
        startVpnTunnel(configFile.getAbsolutePath());

        isConnected = true;
        currentInterface = "wg0";
        Log.d(TAG, "Connected to WireGuard");
    }

    public void disconnect() throws IOException {
        if (!isConnected) {
            Log.w(TAG, "Not connected");
            return;
        }

        stopVpnTunnel();

        isConnected = false;
        currentInterface = "";
        bytesIn = 0;
        bytesOut = 0;
        Log.d(TAG, "Disconnected from WireGuard");
    }

    public JSObject getStatus() {
        JSObject status = new JSObject();
        status.put("connected", isConnected);
        status.put("interface", currentInterface);
        status.put("bytesIn", bytesIn);
        status.put("bytesOut", bytesOut);
        status.put("lastHandshake", "");
        status.put("serverPublicKey", "");
        status.put("serverEndpoint", "");
        return status;
    }

    private void startVpnTunnel(String configPath) throws IOException {
        // This is where you would use the WireGuard library
        // For now, we'll create a basic VPN interface
        VpnService.Builder builder = new VpnService.Builder();
        builder.setSession("FastFree VPN");
        builder.addAddress("10.100.0.2", 32);
        builder.addRoute("0.0.0.0", 0);
        builder.addDnsServer("1.1.1.1");

        vpnInterface = builder.establish();
        if (vpnInterface == null) {
            throw new IOException("Failed to establish VPN interface");
        }

        // Start the WireGuard tunnel process
        // This would typically involve calling wg-quick or similar
        Process process = Runtime.getRuntime().exec(
            new String[]{"wg", "set", "wg0", "private-key", configPath}
        );

        try {
            process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("VPN setup interrupted", e);
        }
    }

    private void stopVpnTunnel() throws IOException {
        if (vpnInterface != null) {
            vpnInterface.close();
            vpnInterface = null;
        }

        Process process = Runtime.getRuntime().exec(
            new String[]{"wg", "del", "wg0"}
        );

        try {
            process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
