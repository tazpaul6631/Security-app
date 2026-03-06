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

// Biến để lưu vết trạng thái mạng trước đó, tránh gọi sync trùng lặp
let lastNetworkStatus: boolean | null = null;
let networkHandler: PluginListenerHandle | null = null;

onMounted(async () => {
  try {
    // 1. Khởi tạo Database cơ sở
    await initDatabase();

    // 2. Phục hồi session người dùng
    await Promise.all([
      store.dispatch('restoreToken'),
      store.dispatch('restoreUser')
    ]);

    // 3. Thiết lập trạng thái mạng ban đầu
    const status = await Network.getStatus();
    lastNetworkStatus = status.connected;
    store.commit('SET_NETWORK_STATUS', status.connected);

    // 4. Nếu đã đăng nhập, chuẩn bị dữ liệu và đồng bộ ngay
    if (store.state.token) {
      await store.dispatch('initApp');

      if (status.connected) {
        console.log('[App] Khởi tạo: Đang có mạng, thử đồng bộ hàng chờ...');
        syncData();
      }
    }
  } catch (e) {
    console.error('[App] Lỗi khởi tạo hệ thống:', e);
  } finally {
    isAppReady.value = true;
  }

  // 5. Lắng nghe thay đổi mạng (Chống dội - Debounce logic)
  networkHandler = await Network.addListener('networkStatusChange', status => {
    const isOnline = status.connected;

    // Chỉ xử lý nếu trạng thái thực sự thay đổi (ví dụ từ False -> True)
    if (isOnline !== lastNetworkStatus) {
      console.log(`[App] Mạng thay đổi: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

      store.commit('SET_NETWORK_STATUS', isOnline);
      lastNetworkStatus = isOnline;

      // Chỉ kích hoạt sync khi chuyển từ mất mạng sang có mạng
      if (isOnline && store.state.token) {
        // Gọi syncData ngay, biến isInternalProcessing trong hook sẽ lo việc chặn trùng lặp
        syncData();
      }
    }
  });
});

onUnmounted(async () => {
  if (networkHandler) {
    await networkHandler.remove();
  }
});
</script>

<style scoped>
.app-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f4f4f4;
}

.app-loading p {
  margin-top: 15px;
  color: #666;
  font-weight: 500;
}
</style>