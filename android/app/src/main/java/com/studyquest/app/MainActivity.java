package com.studyquest.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private BroadcastReceiver screenStateReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        screenStateReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                    bridge.triggerWindowJSEvent("onNativeScreenOff");
                } else if (Intent.ACTION_SCREEN_ON.equals(action)) {
                    bridge.triggerWindowJSEvent("onNativeScreenOn");
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenStateReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(screenStateReceiver, filter);
        }
    }

    @Override
    public void onDestroy() {
        if (screenStateReceiver != null) {
            unregisterReceiver(screenStateReceiver);
            screenStateReceiver = null;
        }
        super.onDestroy();
    }
}
