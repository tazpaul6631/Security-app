<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ dataPR.cpCode }}</ion-title>
      </ion-toolbar>

      <ion-toolbar>
        <ion-searchbar :debounce="500" :search-icon="searchCircle" placeholder="Tìm tên nhân viên hoặc vị trí..."
          @ionInput="handleSearch($event)">
        </ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="filteredDetails.length === 0" class="ion-padding ion-text-center">
        <ion-label color="medium">Không tìm thấy báo cáo nào</ion-label>
      </div>

      <ion-list v-else>
        <ion-item v-for="(item) in filteredDetails" :button="true" @click="handleLink(Number(item.prId))"
          :key="item.prId" :class="item.prHasProblem ? 'custom-item-false' : 'custom-item-true'">

          <ion-grid>
            <ion-row class="ion-align-items-center">
              <ion-col size="auto">
                <ion-icon :icon="documentOutline" :color="item.prHasProblem ? 'danger' : 'success'">
                </ion-icon>
              </ion-col>
              <ion-col>
                <ion-label>
                  <strong>{{ item.cpName }}</strong>
                </ion-label>
              </ion-col>
              <ion-col class="ion-text-end">
                <ion-label class="labelItem">
                  {{ item.createdName }}
                  <ion-text color="warning" v-if="item.isOfflineMock" style="font-size: 0.8em; display: block;">
                    (Đang chờ đồng bộ <ion-icon :icon="warningOutline"></ion-icon>)
                  </ion-text>
                </ion-label>
                <ion-note class="labelItem">{{ item.createdAt.replace('T', ' ').slice(0, 16) }}</ion-note>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-item>
      </ion-list>

      <ion-infinite-scroll @ionInfinite="ionInfinite">
        <ion-infinite-scroll-content loading-text="Đang tải thêm..."></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { documentOutline, searchCircle, warningOutline } from "ionicons/icons";
import {
  IonSearchbar, IonInfiniteScroll, IonInfiniteScrollContent, IonList,
  IonItem, IonLabel, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle, IonPage, IonContent, IonGrid, IonRow, IonCol, IonIcon, IonNote,
  loadingController, alertController, toastController
} from '@ionic/vue';
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router'; // Nhập useRoute
import storageService from "@/services/storage.service";
import PointReport from "@/api/PointReport";

const store = useStore();
const route = useRoute(); // Dùng để lấy ID từ thanh địa chỉ
const router = useRouter();
const searchQuery = ref('');
const isOnline = computed(() => store.state.isOnline);

// === 1. COMPUTED: Đọc dữ liệu từ Vuex (Giữ nguyên cực chuẩn của bạn) ===
const dataPR = computed(() => {
  const dataStore = store.state.dataListCP;

  let listDetails = Array.isArray(dataStore) ? (dataStore[0]?.data || dataStore) : (dataStore?.data || []);
  if (!Array.isArray(listDetails) || listDetails.length === 0) return { cpCode: 'Chưa có CheckPoints', details: [] };

  return {
    cpCode: listDetails[0]?.cpCode || 'Danh sách báo cáo',
    details: listDetails.map((item: any) => ({
      prId: item.prId,
      cpName: item.cpName || item.cpCode,
      createdName: item.createdName,
      createdAt: item.createdAt || '',
      prHasProblem: item.prHasProblem,
      prNote: item.prNote,
      isOfflineMock: item.isOfflineMock || false // Thêm dòng này để đọc được cờ
    }))
  };
});

const filteredDetails = computed(() => {
  if (!searchQuery.value) return dataPR.value.details;
  const query = searchQuery.value.toLowerCase();
  return dataPR.value.details.filter((item: any) =>
    item.createdName.toLowerCase().includes(query) ||
    item.cpName.toLowerCase().includes(query)
  );
});

const handleSearch = (event: any) => searchQuery.value = event.target.value;

// === 2. HÀM CỐT LÕI: Tải dữ liệu cho 1 khu vực ===
const loadCheckpointData = async (id: string, isBackgroundSync = false) => {
  if (!isBackgroundSync) {
    store.commit('SET_DATACP', []);
  }

  let loading;
  if (!isBackgroundSync) {
    loading = await loadingController.create({ message: 'Đang tải khu vực...', spinner: 'circles', duration: 10000 });
    await loading.present();
  }

  try {
    let reportData = null;

    // 1. ONLINE -> Gọi API kéo bản mới nhất
    if (isOnline.value) {
      try {
        const responseBU = await PointReport.postPointReport(id);
        let actualArray = [];
        if (Array.isArray(responseBU)) actualArray = responseBU;
        else if (Array.isArray(responseBU?.data)) actualArray = responseBU.data;
        else if (Array.isArray(responseBU?.data?.data)) actualArray = responseBU.data.data;

        if (actualArray.length > 0) {
          reportData = { data: actualArray };
          // Lưu bản mới nhất vào két sắt SQLite để dành lúc rớt mạng
          await storageService.set(`report_${id}`, reportData);
        }
      } catch (err) { console.warn("Lỗi API, chuyển sang Offline."); }
    }

    // 2. OFFLINE -> Gộp data MỚI (Mock) và CŨ (Cache) lại với nhau
    if (!reportData) {
      console.log("🔌 Đang load Offline: Gộp báo cáo giả và báo cáo cũ...");

      // A. Mở két sắt lấy danh sách Báo Cáo Cũ (Historical Data)
      let cachedReports = [];
      const cachedData = await storageService.get(`report_${id}`);
      if (cachedData) {
        cachedReports = Array.isArray(cachedData) ? cachedData : (cachedData.data || []);
      }

      // B. Lấy Báo Cáo Giả (Mock Data) vừa mới tạo đang chờ gửi
      const rawCheckpointsId = store.state.dataCheckpointsId;
      const allReportsInRAM = Array.isArray(rawCheckpointsId) ? rawCheckpointsId : (rawCheckpointsId?.data || []);
      const mockReports = allReportsInRAM.filter((item: any) =>
        (String(item.cpId) === String(id)) && item.isOfflineMock
      );

      // C. Gộp 2 mảng lại (Báo cáo giả nằm trên, Báo cáo cũ nằm dưới)
      const mergedReports = [...mockReports, ...cachedReports];

      // D. Loại bỏ trùng lặp (đảm bảo không bị lặp ID do đồng bộ)
      const uniqueReports = Array.from(new Map(mergedReports.map(item => [item.prId, item])).values());

      reportData = { data: uniqueReports };
    }

    // 3. ĐẨY VÀO STORE ĐỂ MÀN HÌNH TỰ HIỆN
    store.commit('SET_DATACP', [reportData]);

    if (isBackgroundSync && reportData.data.length > 0) {
      const toast = await toastController.create({ message: 'Đã cập nhật báo cáo mới nhất', duration: 2000, color: 'success', position: 'top' });
      await toast.present();
    }

  } catch (e) {
    if (!isBackgroundSync) presentAlert('Lỗi', 'Không thể tải dữ liệu.');
  } finally {
    if (loading) await loading.dismiss();
  }
};

// === 3. LIFECYCLE & WATCHERS (Linh hồn của Component) ===

// Chạy lần đầu tiên khi mở trang
onMounted(() => {
  const currentId = route.params.id as string;
  if (currentId) loadCheckpointData(currentId);
});

// Chạy khi người dùng bấm Menu chuyển sang khu vực KHÁC nhưng vẫn ở trang này
watch(() => route.params.id, (newId) => {
  if (newId) {
    // Xóa data cũ cho màn hình nháy nhẹ cái, tạo cảm giác chuyển trang
    store.commit('SET_DATACP', []);
    loadCheckpointData(newId as string);
  }
});

// Chạy tự động kéo dữ liệu thầm lặng khi CÓ MẠNG TRỞ LẠI
watch(isOnline, (newStatus, oldStatus) => {
  if (newStatus === true && oldStatus === false && route.params.id) {
    loadCheckpointData(route.params.id as string, true); // true = Background Sync (không hiện loading)
  }
});

// === 4. CÁC HÀM TIỆN ÍCH ===
const handleLink = async (prId: number) => {
  const loading = await loadingController.create({
    message: 'Đang tải chi tiết báo cáo...',
    spinner: 'crescent',
    backdropDismiss: false,
  });

  try {
    await loading.present();

    let selectedItem = null;

    if (isOnline.value) {
      try {
        const responseBU = await PointReport.getPointReportId(prId);
        if (responseBU && responseBU.data) {
          selectedItem = responseBU.data;
          await storageService.set(`report_${prId}`, selectedItem.data || selectedItem);
        }
      } catch (apiErr) {
        console.warn("API lỗi hoặc timeout, chuyển sang tìm trong máy.");
      }
    }

    if (!selectedItem) {
      const cachedReport = await storageService.get(`report_${prId}`);
      if (cachedReport) {
        selectedItem = { data: cachedReport };
      }
    }

    if (!selectedItem) {
      const rawCheckpointsId = store.state.dataCheckpointsId;
      const storeData = Array.isArray(rawCheckpointsId) ? rawCheckpointsId : (rawCheckpointsId?.data || []);

      const found = storeData.find((item: any) => item.prId === prId);
      if (found) {
        selectedItem = { data: found };
      }
    }

    if (!selectedItem || !selectedItem.data) {
      await loading.dismiss();
      const alert = await alertController.create({
        header: 'Thông báo',
        message: 'Không tìm thấy dữ liệu báo cáo này trên máy. Vui lòng kiểm tra kết nối mạng.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    store.commit('SET_CURRENT_CHECKPOINT', selectedItem);
    await storageService.set('last_selected_checkpoint', selectedItem);

    await loading.dismiss();
    router.push({ path: `/checkpoint/detail/${prId}` });

  } catch (error) {
    await loading.dismiss();
    console.error("Lỗi khi xử lý link checkpoint:", error);
    const alert = await alertController.create({
      header: 'Lỗi hệ thống',
      message: 'Có lỗi xảy ra trong quá trình tải dữ liệu.',
      buttons: ['Đóng']
    });
    await alert.present();
  }
};

const presentAlert = async (h: string, m: string) => {
  const alert = await alertController.create({ header: h, message: m, buttons: ['OK'] });
  await alert.present();
};
const ionInfinite = (event: any) => setTimeout(() => event.target.complete(), 500);
</script>