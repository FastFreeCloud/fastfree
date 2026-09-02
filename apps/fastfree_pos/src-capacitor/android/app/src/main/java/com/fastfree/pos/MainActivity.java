package com.fastfree.pos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.fastfree.vpn.WireGuardPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WireGuardPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
