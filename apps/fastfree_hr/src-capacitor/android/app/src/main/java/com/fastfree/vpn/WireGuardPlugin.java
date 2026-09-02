package com.fastfree.vpn;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WireGuard")
public class WireGuardPlugin extends Plugin {
    private static final String TAG = "WireGuardPlugin";
    private WireGuardService vpnService;

    @Override
    public void load() {
        vpnService = new WireGuardService(getContext());
        Log.d(TAG, "WireGuard Plugin loaded");
    }

    @PluginMethod
    public void generateKeys(PluginCall call) {
        try {
            JSObject keys = vpnService.generateKeys();
            call.resolve(keys);
        } catch (Exception e) {
            call.reject("Failed to generate keys", e);
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String privateKey = call.getString("privateKey");
        String publicKey = call.getString("publicKey");
        String address = call.getString("address");
        String endpoint = call.getString("endpoint");
        String dns = call.getString("dns");
        String allowedIPs = call.getString("allowedIPs", "0.0.0.0/0");

        if (privateKey == null || endpoint == null) {
            call.reject("Missing required parameters");
            return;
        }

        try {
            vpnService.connect(privateKey, publicKey, address, endpoint, dns, allowedIPs);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to connect", e);
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        try {
            vpnService.disconnect();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to disconnect", e);
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        try {
            JSObject status = vpnService.getStatus();
            call.resolve(status);
        } catch (Exception e) {
            call.reject("Failed to get status", e);
        }
    }
}
