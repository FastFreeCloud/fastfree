package com.fastfree.vpn;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class WireGuardVpnService extends VpnService {
    private static final String TAG = "WireGuardVpnService";
    private static final String CHANNEL_ID = "fastfree_vpn_channel";
    private static final int NOTIFICATION_ID = 1;

    private ParcelFileDescriptor vpnInterface;
    private boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopVpn();
            return START_NOT_STICKY;
        }

        startVpn();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopVpn();
        super.onDestroy();
    }

    private void startVpn() {
        if (isRunning) {
            return;
        }

        try {
            Builder builder = new Builder();
            builder.setSession("FastFree VPN");
            builder.addAddress("10.100.0.2", 32);
            builder.addRoute("0.0.0.0", 0);
            builder.addDnsServer("1.1.1.1");
            builder.setMtu(1280);

            vpnInterface = builder.establish();
            if (vpnInterface == null) {
                Log.e(TAG, "Failed to establish VPN interface");
                return;
            }

            startForeground(NOTIFICATION_ID, createNotification());
            isRunning = true;
            Log.d(TAG, "VPN started");

        } catch (Exception e) {
            Log.e(TAG, "Failed to start VPN", e);
        }
    }

    private void stopVpn() {
        if (!isRunning) {
            return;
        }

        try {
            if (vpnInterface != null) {
                vpnInterface.close();
                vpnInterface = null;
            }

            stopForeground(true);
            stopSelf();
            isRunning = false;
            Log.d(TAG, "VPN stopped");

        } catch (Exception e) {
            Log.e(TAG, "Failed to stop VPN", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "FastFree VPN",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("FastFree VPN Connection");

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, WireGuardVpnService.class);
        stopIntent.setAction("STOP");
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FastFree VPN")
            .setContentText("VPN is connected")
            .setSmallIcon(R.drawable.ic_vpn_key)
            .setContentIntent(pendingIntent)
            .addAction(R.drawable.ic_vpn_key, "Disconnect", stopPendingIntent)
            .setOngoing(true)
            .build();
    }
}
