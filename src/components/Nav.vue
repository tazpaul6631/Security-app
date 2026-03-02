<template>
  <ion-page id="main-content">

    <!-- <ion-menu content-id="main-app-content">
      <ion-header>
        <ion-toolbar color="rose">
          <ion-title>Danh mục khu vực</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-accordion-group expand="inset">
          <ion-accordion v-for="([parent, children]) in datalistNav" :key="parent">
            <ion-item slot="header" color="rose">
              <ion-label>
                <strong>{{ parent }}</strong>
              </ion-label>
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
    </ion-menu> -->

    <div class="ion-page" id="main-app-content">
      <ion-header>
        <ion-toolbar>
          <!-- <ion-buttons slot="start">
            <ion-menu-button></ion-menu-button>
          </ion-buttons> -->
          <ion-button fill="clear" @click="goBackAndClearHistory" color="medium">
            <strong>
              Internal
              <ion-text color="danger" style="margin-left: 1px;">Patrol</ion-text>
            </strong>
          </ion-button>
          <div slot="end" v-if="isSyncing" class="sync-container pulse-animation">
            <ion-spinner name="crescent" color="primary" class="small-spinner"></ion-spinner>
            <ion-text color="primary" class="sync-text">
              Đang gửi ({{ pendingItems.length }})
            </ion-text>
          </div>
          <ion-badge slot="end" :color="isOnline ? 'success' : 'danger'" class="ion-margin-end">
            {{ isOnline ? 'Online' : 'Offline' }}
          </ion-badge>
          <ion-icon class="ion-margin-end button_logout" :icon="exitOutline" slot="end"
            @click="handleLogout"></ion-icon>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-router-outlet></ion-router-outlet>
      </ion-content>

      <!-- <ion-footer>
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
      </ion-footer> -->
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButtons, IonButton, IonContent, IonHeader, IonMenu, IonMenuToggle,
  IonMenuButton, IonPage, IonToolbar, IonAccordion, IonAccordionGroup,
  IonItem, IonLabel, IonRouterOutlet, IonFooter, IonIcon, IonFabButton,
  alertController, IonGrid, IonRow, IonCol, IonBadge, IonTitle, useIonRouter,
  loadingController, IonText
} from '@ionic/vue';
import { reactive, ref, computed, watch } from 'vue';
import { qrCodeOutline, exitOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import PointReport from '@/api/PointReport';
import CheckPointScanQr from '@/api/CheckPointScanQr';
import router from '@/router';
import { useStore } from 'vuex';
import storageService from '@/services/storage.service';
import { useSQLite } from '@/composables/useSQLite';
import { useOfflineManager } from '@/composables/useOfflineManager';

const { logout } = useSQLite();
const store = useStore();
// const isLoading = ref(false);
// const listScanQr = reactive({ cpwId: '', cpwCode: '' });

// // 1. Lấy dữ liệu an toàn cho Menu
// const datalistNav = computed(() => {
//   const rawData = store.state.dataAreaBU;
//   // Bóc tách an toàn: Nếu là mảng thì dùng luôn, nếu là Object thì chui vào lấy .data
//   const areas = Array.isArray(rawData) ? rawData : (rawData?.data || []);

//   const result: [string, [string, string][]][] = [];

//   for (const item of areas) {
//     if (item.checkPoints && item.checkPoints.length > 0) {
//       result.push([
//         item.areaCode,
//         item.checkPoints.map((cp: any) => [cp.cpCode, cp.cpId])
//       ]);
//     }
//   }
//   return result;
// });

// watch(() => store.state.dataAreaBU, async (newData) => {
//   const actualData = Array.isArray(newData) ? newData : (newData?.data || []);

//   if (actualData && actualData.length > 0) {
//     const storagePromises = [];
//     for (const area of actualData) {
//       if (area.checkPoints) {
//         for (const cp of area.checkPoints) {
//           // Chỉ lưu checkpoint cho tính năng Quét QR
//           storagePromises.push(storageService.set(`checkpoint_${cp.cpId}`, { data: cp }));
//         }
//       }
//     }
//     await Promise.all(storagePromises);
//   }
// }, { immediate: true });

///////////////////////////////
// Khởi tạo router riêng của Ionic
const ionRouter = useIonRouter();
const goBackAndClearHistory = () => {
  ionRouter.navigate('/home', 'root', 'replace');
};
//////////////////////////////

// 1. Quét mã QR - flow Offline-first
// const startScanning = async () => {
//   const now = new Date();
//   const currentTimeString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);

//   const granted = await requestPermissions();
//   if (!granted) return;

//   const { barcodes } = await BarcodeScanner.scan();
//   if (!barcodes || barcodes.length === 0) return;

//   const urlString = barcodes[0].rawValue;
//   if (urlString) {
//     try {
//       const url = new URL(urlString);
//       const segments = url.pathname.split('/');
//       listScanQr.cpwId = segments[3];
//       listScanQr.cpwCode = segments[4];
//     } catch (e) {
//       presentAlert('Lỗi', 'Mã QR không hợp lệ');
//       return;
//     }
//   }

//   isLoading.value = true;
//   try {
//     // Biến này bây giờ sẽ CHỈ CHỨA CÁI LÕI (Object chứa cpName, areaName...)
//     let finalData = null;

//     // BƯỚC 1: NẾU ONLINE -> Lấy từ API và bóc tách lấy cái lõi
//     if (isOnline.value) {
//       try {
//         const res = await CheckPointScanQr.getCheckPointScanQr(listScanQr);

//         let actualData = res?.data?.data || res?.data;
//         if (Array.isArray(actualData)) {
//           actualData = actualData[0];
//         }

//         if (actualData) {
//           finalData = actualData; // 🚀 Gán thẳng cái lõi, không bọc gì thêm!
//           await storageService.set(`checkpoint_${listScanQr.cpwId}`, actualData);
//         }
//       } catch (e) {
//         console.warn("API lỗi, hệ thống tự chuyển sang lấy dữ liệu trong máy.");
//       }
//     }

//     // BƯỚC 2: NẾU OFFLINE -> Tìm trong máy
//     if (!finalData) {
//       console.log('🔌 Trạng thái OFFLINE: Đang tìm Checkpoint trong kho tổng...');

//       let response = await storageService.get('checkpoints');
//       let allCheckpoints = [];

//       if (Array.isArray(response)) {
//         allCheckpoints = response;
//       } else if (response && Array.isArray(response.data)) {
//         allCheckpoints = response.data;
//       }

//       const foundItem = allCheckpoints.find(
//         (item: any) => String(item.cpId) === String(listScanQr.cpwId)
//       );

//       if (foundItem) {
//         finalData = foundItem; // 🚀 BỎ LUÔN VỤ BỌC { data: foundItem }. Gán thẳng cái lõi!
//         console.log('✅ Đã lấy FULL DATA Offline thành công:', finalData);
//       }
//     }

//     console.log("📦 Dữ liệu sạch sẽ chuẩn bị đưa vào Vuex:", finalData);

//     // BƯỚC 3: ĐẨY VÀO VUEX & ĐI CHUYỂN TRANG
//     if (finalData) {
//       // 🚀 Không cần hàm if/else check data lằng nhằng nữa, cứ thế mà đẩy vào!
//       store.commit('SET_DATASCANQR', finalData);

//       await storageService.set('data_scanqr', finalData);
//       await storageService.set('currentTime_scanqr', currentTimeString);

//       router.replace('/checkpoint/create');
//     } else {
//       presentAlert('Thông báo', 'Điểm quét này chưa có dữ liệu trên máy. Hãy online một lần để tải danh mục.');
//     }
//   } catch (error) {
//     console.error("Lỗi:", error);
//     presentAlert('Lỗi', 'Có lỗi xảy ra khi xử lý dữ liệu.');
//   } finally {
//     isLoading.value = false;
//   }
// };

// 2. HANDLE NAV LINK: Tận dụng RAM tối đa và log chi tiết
// const handleNavLink = async (id: string) => {
//   console.log(`\n--- BẮT ĐẦU CLICK MENU CP_ID: ${id} ---`);

//   const loading = await loadingController.create({
//     message: 'Đang tải dữ liệu khu vực...',
//     spinner: 'circles',
//     duration: 10000,
//   });

//   try {
//     await loading.present();
//     isLoading.value = true;

//     let reportData = null;

//     // BƯỚC 1: Nếu có mạng -> Gọi API lấy mới nhất
//     if (isOnline.value) {
//       console.log('📡 Trạng thái: ONLINE. Đang gọi API lấy báo cáo...');
//       try {
//         const responseBU = await PointReport.postPointReport(id);

//         // 🚀 BÓC TÁCH MẢNG THẬT SỰ TỪ API TRƯỚC KHI LƯU
//         // Phòng hờ API trả về { data: [...] } hoặc { data: { data: [...] } }
//         let actualArray = [];
//         if (Array.isArray(responseBU?.data)) {
//           actualArray = responseBU.data;
//         } else if (Array.isArray(responseBU?.data?.data)) {
//           actualArray = responseBU.data.data;
//         }

//         // Ép nó vào đúng khuôn khổ giống hệt luồng Offline
//         reportData = { data: actualArray };

//         // Cất vào máy bản đã chuẩn hóa này
//         await storageService.set(`report_${id}`, reportData);
//         console.log('✅ Đã lấy từ API chuẩn hóa và lưu đệm thành công:', reportData);

//       } catch (apiErr) {
//         console.warn("⚠️ Không thể tải bản mới, tự động chuyển sang luồng Offline.");
//       }
//     }

//     // BƯỚC 2: Nếu Offline -> Bóc tách từ Vuex RAM
//     if (!reportData) {
//       console.log('🔌 Trạng thái: OFFLINE. Bắt đầu bóc tách từ kho Vuex...');

//       // Lấy danh sách TỔNG các report (Đã tải lúc Login)
//       const rawCheckpointsId = store.state.dataCheckpointsId;
//       const allReports = Array.isArray(rawCheckpointsId) ? rawCheckpointsId : (rawCheckpointsId?.data || []);

//       // Lọc ra các report thuộc về cpId người dùng vừa click
//       const filteredReports = allReports.filter((item: any) =>
//         item.cpId === id || item.cpId === Number(id)
//       );

//       console.log('📦 Tổng số report trong RAM:', allReports.length);
//       console.log(`🔎 Số report lọc được cho ID ${id}:`, filteredReports.length);

//       // Đóng gói lại thành cấu trúc { data: [] } để trang CPIndex đọc được
//       reportData = { data: filteredReports };
//     }

//     // BƯỚC 3: Đẩy vào Store và Chuyển trang
//     console.log('🚀 Dữ liệu cuối cùng Commit vào SET_DATACP:', [reportData]);
//     store.commit('SET_DATACP', [reportData]);

//     await router.replace({ path: `/checkpoint/${id}` });

//   } catch (e) {
//     console.error("❌ Lỗi điều hướng Menu:", e);
//     presentAlert('Lỗi', 'Đã có lỗi xảy ra khi mở khu vực này.');
//   } finally {
//     await loading.dismiss();
//     isLoading.value = false;
//   }
// };

//////////////////////////////////////////
const { pendingItems, loadPendingItems, isSyncing, isOnline } = useOfflineManager();

const handleLogout = async () => {
  console.log('Bắt đầu kiểm tra trước khi đăng xuất...');

  // 1. CHẶN ĐĂNG XUẤT: Kiểm tra xem còn báo cáo nào đang kẹt ở máy không
  await loadPendingItems(); // Lấy danh sách mới nhất từ Storage

  if (pendingItems.value.length > 0) {
    // Nếu mảng > 0, ném ra câu cảnh báo và kết thúc hàm ngay lập tức
    const alert = await alertController.create({
      header: 'Cảnh báo mất dữ liệu!',
      message: `Bạn đang có ${pendingItems.value.length} báo cáo chưa được đồng bộ lên máy chủ. Vui lòng kết nối mạng và đồng bộ dữ liệu trước khi đăng xuất để tránh mất công sức!`,
      buttons: [
        {
          text: 'Đã hiểu',
          role: 'cancel',
        }
      ]
    });
    await alert.present();
    return; // Dừng lại, KHÔNG chạy xuống các lệnh xóa bên dưới
  }

  // Nếu qua được ải kiểm tra, tiến hành đăng xuất bình thường
  console.log('Hàng chờ trống, tiến hành đăng xuất an toàn...');

  // 2. Dọn dẹp bộ nhớ RAM (Vuex)
  store.commit('CLEAR_ALL_DATA');

  // 3. Gọi hàm logout an toàn từ SQLite (chỉ xóa user hiện tại, giữ lại danh bạ offline)
  await logout();

  // 4. Xóa token riêng rẽ nếu cần (phòng hờ)
  if (storageService.remove) {
    await storageService.remove('user_token');
  }

  // 5. Chuyển hướng về trang Login mượt mà thay vì dùng window.location.reload()
  router.replace('/login');
};
////////////////////////////////////////////

// scan
// const requestPermissions = async () => {
//   const { camera } = await BarcodeScanner.requestPermissions();
//   return camera === 'granted' || camera === 'limited';
// };

// const presentAlert = async (h: string, m: string) => {
//   const alert = await alertController.create({ header: h, message: m, buttons: ['OK'] });
//   await alert.present();
// };
//////////////////////////
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

.button_logout {
  font-size: 25px;
}

.sync-container {
  display: flex;
  align-items: center;
  margin-right: 12px;
  padding: 4px 8px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-radius: 16px;
}

.small-spinner {
  width: 16px;
  height: 16px;
  margin-right: 6px;
}

.sync-text {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

/* Hiệu ứng nhấp nháy nhẹ nhàng */
.pulse-animation {
  animation: pulse-red 2s infinite;
}

@keyframes pulse-red {
  0% {
    transform: scale(0.98);
    opacity: 0.8;
  }

  50% {
    transform: scale(1.02);
    opacity: 1;
  }

  100% {
    transform: scale(0.98);
    opacity: 0.8;
  }
}
</style>