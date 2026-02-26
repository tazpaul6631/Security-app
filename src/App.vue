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
  // 1. Cập nhật mạng & Lắng nghe thay đổi
  const status = await Network.getStatus();
  store.commit('SET_NETWORK_STATUS', status.connected);

  networkHandler = await Network.addListener('networkStatusChange', status => {
    store.commit('SET_NETWORK_STATUS', status.connected);
    
    // NẾU MẠNG QUAY LẠI -> GỌI ĐỒNG BỘ NGAY
    if (status.connected && store.state.token) {
      syncData(); 
    }
  });
  
  try {
    // 2. Chỉ khởi tạo kết nối DB (KHÔNG gọi initApp ở đây nữa)
    await initDatabase();
    
    // 3. SAU KHI DB SẴN SÀNG -> THỬ ĐỒNG BỘ LẦN ĐẦU (nếu có hàng chờ cũ)
    if (store.state.token) {
      await syncData(); 
    }

    console.log('--- Hệ thống Database (App.vue) đã thông suốt ---');
  } catch (e) {
    console.error('Lỗi khởi tạo App.vue:', e);
  } finally {
    // 4. Mở khóa giao diện
    isAppReady.value = true;
  }
});

onUnmounted(async () => {
  if (networkHandler) await networkHandler.remove();
});
</script>