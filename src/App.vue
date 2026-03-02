<template>
  <ion-app>
    <div v-if="!isAppReady" class="app-loading">
      <ion-spinner name="crescent"></ion-spinner>
      <p>Đang chuẩn bị dữ liệu an ninh...</p>
    </div>

    <ion-router-outlet v-else />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonSpinner } from '@ionic/vue';
import { onMounted, ref, onUnmounted } from 'vue';
import { useSQLite } from '@/composables/useSQLite';
import store from '@/composables/useVuex';
import { Network } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';
import { useOfflineManager } from '@/composables/useOfflineManager';

const { syncData } = useOfflineManager();
const { initDatabase } = useSQLite();
const isAppReady = ref(false);
let networkHandler: PluginListenerHandle | null = null;

onMounted(async () => {
  // 1. Khởi tạo Database trước tiên
  try {
    await initDatabase();

    // 2. Phục hồi phiên làm việc (Token) từ SQLite lên RAM
    await store.dispatch('restoreToken');
    await store.dispatch('restoreUser');

    // 3. Nếu đã login, nạp sẵn dữ liệu nền (Area, Checkpoints...)
    if (store.state.token) {
      // Nạp dữ liệu từ máy lên RAM ngay để vào Home là có data luôn
      await store.dispatch('initApp');

      // Thử đẩy báo cáo kẹt (nếu đang có mạng)
      const status = await Network.getStatus();
      if (status.connected) {
        syncData();
      }
    }
  } catch (e) {
    console.error('Lỗi khởi tạo hệ thống:', e);
  } finally {
    isAppReady.value = true;
  }

  // 4. Lắng nghe thay đổi mạng
  networkHandler = await Network.addListener('networkStatusChange', status => {
    store.commit('SET_NETWORK_STATUS', status.connected);
    if (status.connected && store.state.token) {
      setTimeout(() => {
        syncData();
      }, 2000);
    }
  });
});

onUnmounted(async () => {
  if (networkHandler) await networkHandler.remove();
});
</script>