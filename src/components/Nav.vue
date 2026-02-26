<template>
  <div class="ion-page" id="main-content">
    
    <ion-menu content-id="main-app-content">
      <ion-header>
        <ion-toolbar color="rose">
          <ion-title>Danh mục khu vực</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-accordion-group expand="inset">
          <ion-accordion v-for="([ parent, children ]) in datalistNav" :key="parent">
            <ion-item slot="header" color="rose">
              <ion-label><strong>{{ parent }}</strong></ion-label>
            </ion-item>
            <div slot="content">
              <ion-menu-toggle v-for="([value, id]) in children" :key="id">
                <ion-item :button="true" @click="handleNavLink(id)">
                  <ion-label>{{ value }}</ion-label>
                </ion-item>
              </ion-menu-toggle>
            </div>
          </ion-accordion>
        </ion-accordion-group>
      </ion-content>
    </ion-menu>

    <ion-page id="main-app-content">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-menu-button></ion-menu-button>
          </ion-buttons>
          <ion-label color="medium">SECURITY<ion-label color="danger">APP</ion-label></ion-label>
          
          <ion-badge slot="end" :color="isOnline ? 'success' : 'danger'" class="ion-margin-end">
            {{ isOnline ? 'Online' : 'Offline' }}
          </ion-badge>
          <ion-button class="ion-margin-end button_logout" slot="end" color="rose" @click="handleLogout">
            <ion-icon :icon="exitOutline"></ion-icon>
          </ion-button>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-router-outlet></ion-router-outlet>
      </ion-content>

      <ion-footer>
        <ion-toolbar>
          <ion-grid>
            <ion-row class="ion-justify-content-center">
              <ion-col size="auto">
                <ion-fab-button @click="startScanning()" color="rose">
                  <ion-icon :icon="qrCodeOutline"></ion-icon>
                </ion-fab-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-toolbar>
      </ion-footer>
    </ion-page>
  </div>
</template>

<script setup lang="ts">
import { 
  IonButtons, IonButton, IonContent, IonHeader, IonMenu, IonMenuToggle, 
  IonMenuButton, IonPage, IonToolbar, IonAccordion, IonAccordionGroup, 
  IonItem, IonLabel, IonRouterOutlet, IonFooter, IonIcon, IonFabButton,
  alertController, IonGrid, IonRow, IonCol, IonBadge, IonTitle, loadingController
} from '@ionic/vue';
import { reactive, ref, computed } from 'vue'; 
import { qrCodeOutline, exitOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import PointReport from '@/api/PointReport';
import CheckPointScanQr from '@/api/CheckPointScanQr';
import router from '@/router';
import { useStore } from 'vuex';
import storageService from '@/services/storage.service';

const store = useStore();
const isOnline = computed(() => store.state.isOnline);
const isLoading = ref(false);
const listScanQr = reactive({ cpwId: '', cpwCode: '' });

import { watch } from 'vue';

// 🚀 1. Lấy dữ liệu an toàn cho Menu
const datalistNav = computed(() => {
  const rawData = store.state.dataAreaBU;
  // Bóc tách an toàn: Nếu là mảng thì dùng luôn, nếu là Object thì chui vào lấy .data
  const areas = Array.isArray(rawData) ? rawData : (rawData?.data || []);
  
  const result: [string, [string, string][]][] = [];
  
  for (const item of areas) {
    if (item.checkPoints && item.checkPoints.length > 0) {
      result.push([
        item.areaCode, 
        item.checkPoints.map((cp: any) => [cp.cpCode, cp.cpId])
      ]);
    }
  }
  return result;
});

// 🚀 1. SỬA LẠI WATCH: Bỏ dòng lưu sai dữ liệu 'report_'
watch(() => store.state.dataAreaBU, async (newData) => {
  const actualData = Array.isArray(newData) ? newData : (newData?.data || []);

  if (actualData && actualData.length > 0) {
    const storagePromises = [];
    for (const area of actualData) {
      if (area.checkPoints) {
        for (const cp of area.checkPoints) {
          // Chỉ lưu checkpoint cho tính năng Quét QR
          storagePromises.push(storageService.set(`checkpoint_${cp.cpId}`, { data: cp }));
          // ❌ ĐÃ XÓA dòng lưu report bị sai logic ở đây
        }
      }
    }
    await Promise.all(storagePromises);
  }
}, { immediate: true });

// 1. Quét mã QR - flow Offline-first
const startScanning = async () => {
  const now = new Date();
  const currentTimeString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);
  
  const granted = await requestPermissions();
  if (!granted) return;

  const { barcodes } = await BarcodeScanner.scan();
  if (!barcodes || barcodes.length === 0) return;

  const urlString = barcodes[0].rawValue;
  if (urlString) {
    try {
      const url = new URL(urlString);
      const segments = url.pathname.split('/');
      listScanQr.cpwId = segments[3];
      listScanQr.cpwCode = segments[4];
    } catch (e) {
      presentAlert('Lỗi', 'Mã QR không hợp lệ');
      return;
    }
  }

  isLoading.value = true;
  try {
    let finalData = null;

    if (isOnline.value) {
      try {
        const res = await CheckPointScanQr.getCheckPointScanQr(listScanQr);
        if (res && res.data) {
          finalData = res.data; 
          await storageService.set(`checkpoint_${listScanQr.cpwId}`, res.data);
        }
      } catch (e) {
        console.warn("API lỗi, hệ thống tự chuyển sang lấy dữ liệu trong máy.");
      }
    }

    if (!finalData) {
      console.log('🔌 Trạng thái OFFLINE: Đang tìm Checkpoint trong kho tổng...');
      
      // 1. Lấy rương chứa FULL DATA
      let response = await storageService.get('checkpoints');
      
      // 2. Bóc tách lấy đúng cái mảng (Array)
      let allCheckpoints = [];
      if (Array.isArray(response)) {
        allCheckpoints = response;
      } else if (response && Array.isArray(response.data)) {
        allCheckpoints = response.data;
      }

      // 3. Mò tìm đúng ID trong cái mảng FULL DATA đó
      const foundItem = allCheckpoints.find(
        (item: any) => String(item.cpId) === String(listScanQr.cpwId)
      );

      // 4. Bọc lại cho đúng cấu trúc để đẩy sang màn hình Create
      if (foundItem) {
        finalData = { data: foundItem };
        console.log('✅ Đã lấy FULL DATA Offline thành công:', finalData);
      }
    }

    console.log(finalData);
    

    if (finalData) {
      const dataToCommit = finalData.data ? finalData.data : finalData;
      
      store.commit('SET_DATASCANQR', dataToCommit);
      await storageService.set('data_scanqr', dataToCommit);
      await storageService.set('currentTime', currentTimeString);
      
      router.replace('/checkpoint/create');
    } else {
      presentAlert('Thông báo', 'Điểm quét này chưa có dữ liệu trên máy. Hãy online một lần để tải danh mục.');
    }
  } catch (error) {
    console.error("Lỗi:", error);
    presentAlert('Lỗi', 'Có lỗi xảy ra khi xử lý dữ liệu.');
  } finally {
    isLoading.value = false;
  }
};

// 🚀 2. SỬA LẠI HANDLE NAV LINK: Tận dụng RAM tối đa và log chi tiết
const handleNavLink = async (id: string) => {
  console.log(`\n--- BẮT ĐẦU CLICK MENU CP_ID: ${id} ---`);
  
  const loading = await loadingController.create({
    message: 'Đang tải dữ liệu khu vực...',
    spinner: 'circles',
    duration: 10000, 
  });

  try {
    await loading.present();
    isLoading.value = true; 
    
    let reportData = null;
    
    // BƯỚC 1: Nếu có mạng -> Gọi API lấy mới nhất
    if (isOnline.value) {
      console.log('📡 Trạng thái: ONLINE. Đang gọi API lấy báo cáo...');
      try {
        const responseBU = await PointReport.postPointReport(id);
        
        // 🚀 BÓC TÁCH MẢNG THẬT SỰ TỪ API TRƯỚC KHI LƯU
        // Phòng hờ API trả về { data: [...] } hoặc { data: { data: [...] } }
        let actualArray = [];
        if (Array.isArray(responseBU?.data)) {
            actualArray = responseBU.data;
        } else if (Array.isArray(responseBU?.data?.data)) {
            actualArray = responseBU.data.data;
        }

        // Ép nó vào đúng khuôn khổ giống hệt luồng Offline
        reportData = { data: actualArray };     
        
        // Cất vào máy bản đã chuẩn hóa này
        await storageService.set(`report_${id}`, reportData);
        console.log('✅ Đã lấy từ API chuẩn hóa và lưu đệm thành công:', reportData);
        
      } catch (apiErr) {
        console.warn("⚠️ Không thể tải bản mới, tự động chuyển sang luồng Offline.");
      }
    }

    // BƯỚC 2: Nếu Offline -> Bóc tách từ Vuex RAM
    if (!reportData) {
      console.log('🔌 Trạng thái: OFFLINE. Bắt đầu bóc tách từ kho Vuex...');
      
      // Lấy danh sách TỔNG các report (Đã tải lúc Login)
      const rawCheckpointsId = store.state.dataCheckpointsId;
      const allReports = Array.isArray(rawCheckpointsId) ? rawCheckpointsId : (rawCheckpointsId?.data || []);
      
      // Lọc ra các report thuộc về cpId người dùng vừa click
      const filteredReports = allReports.filter((item: any) => 
        item.cpId === id || item.cpId === Number(id)
      );

      console.log('📦 Tổng số report trong RAM:', allReports.length);
      console.log(`🔎 Số report lọc được cho ID ${id}:`, filteredReports.length);

      // Đóng gói lại thành cấu trúc { data: [] } để trang CPIndex đọc được
      reportData = { data: filteredReports };
    }

    // BƯỚC 3: Đẩy vào Store và Chuyển trang
    console.log('🚀 Dữ liệu cuối cùng Commit vào SET_DATACP:', [reportData]);
    store.commit('SET_DATACP', [reportData]);
    
    await router.replace({ path: `/checkpoint/${id}` });

  } catch (e) {
    console.error("❌ Lỗi điều hướng Menu:", e);
    presentAlert('Lỗi', 'Đã có lỗi xảy ra khi mở khu vực này.');
  } finally {
    await loading.dismiss();
    isLoading.value = false;
  }
};

const handleLogout = async () => {
  if (storageService.remove) {
     await storageService.remove('user_token');
  }
  await storageService.clear();
  store.commit('CLEAR_ALL_DATA');
  window.location.hash = '/login';
  window.location.reload(); 
};

const requestPermissions = async () => {
  const { camera } = await BarcodeScanner.requestPermissions();
  return camera === 'granted' || camera === 'limited';
};

const presentAlert = async (h: string, m: string) => {
  const alert = await alertController.create({ header: h, message: m, buttons: ['OK'] });
  await alert.present();
};
</script>

<style>
/* CSS giữ nguyên theo thiết kế của bạn */
:root {
  --ion-color-rose: #d4fcc7;
  --ion-color-rose-rgb: 212, 252, 199;
  --ion-color-rose-contrast: #000000;
  --ion-color-rose-contrast-rgb: 0, 0, 0;
  --ion-color-rose-shade: #bbdeaf;
  --ion-color-rose-tint: #d8fcd0;
}

.ion-color-rose {
  --ion-color-base: var(--ion-color-rose);
  --ion-color-base-rgb: var(--ion-color-rose-rgb);
  --ion-color-contrast: var(--ion-color-rose-contrast);
  --ion-color-contrast-rgb: var(--ion-color-rose-contrast-rgb);
  --ion-color-shade: var(--ion-color-rose-shade);
  --ion-color-tint: var(--ion-color-rose-tint);
}

div[slot='content'] {
  background: rgba(var(--ion-color-rose-rgb), 0.25);
}

.icon-footer {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>