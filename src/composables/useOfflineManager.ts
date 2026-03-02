import { ref, computed } from 'vue';
// 1. Bỏ import Network đi vì ta sẽ lấy mạng từ Vuex
import storage from '@/services/storage.service';
import { ImageService } from '@/services/image.service';
import PointReport from '@/api/PointReport';
import store from '@/composables/useVuex'; // 2. Import Vuex Store vào đây
import { toastController } from '@ionic/vue';

const presentToast = async (message: string) => {
  const toast = await toastController.create({
    message: message,
    duration: 5000,
    position: 'top',
    color: 'warning'
  });
  await toast.present();
};

interface PendingItem {
  id: number;
  url: string;
  data: any;
  imageFiles: string[];
}

// 3. CHỈ CÒN LẠI 2 BIẾN NÀY LÀ GLOBAL (Bỏ hẳn isOnline và networkListener đi)
const pendingItems = ref<PendingItem[]>([]);
const isSyncing = ref(false);

export function useOfflineManager() {

  // --- Tải danh sách chờ từ Storage ---
  const loadPendingItems = async (): Promise<void> => {
    const data = await storage.get('offline_api_queue');
    pendingItems.value = (data as PendingItem[]) || [];
  };

  // --- Hàm gửi dữ liệu ---
  const sendData = async (url: string, data: any, imagesBase64: string[] = []): Promise<void> => {
    const id = Date.now();

    const imageFiles: string[] = [];
    for (const base64 of imagesBase64) {
      try {
        const fileName = await ImageService.saveImage(base64);
        imageFiles.push(fileName);
      } catch (err) {
        console.error("Lỗi lưu ảnh vật lý:", err);
      }
    }

    const newItem: PendingItem = { id, url, data, imageFiles };

    // 4. ĐIỂM ĂN TIỀN: LẤY TRẠNG THÁI MẠNG TRỰC TIẾP TỪ VUEX STORE
    if (store.state.isOnline) {
      try {
        await uploadToServer(newItem);
        for (const f of imageFiles) await ImageService.deleteImage(f);
      } catch (error) {
        console.warn("Gửi trực tiếp thất bại, chuyển vào hàng chờ...");
        await addToQueue(newItem);
      }
    } else {
      console.log("Đang offline, đã lưu vào hàng chờ.");
      await addToQueue(newItem);
    }
  };

  const addToQueue = async (item: PendingItem): Promise<void> => {
    const queue: PendingItem[] = await storage.get('offline_api_queue') || [];
    queue.push(item);
    await storage.set('offline_api_queue', queue);
    await loadPendingItems();

    // Bóc tách user an toàn
    const actualUser: any = store.state.dataUser;
    const userData = actualUser?.data ? actualUser.data : actualUser;

    // Lấy thêm thông tin từ QR để trang Detail hiển thị đầy đủ tiêu đề
    const scanData: any = store.state.dataScanQr || {};

    // TẠO MOCK REPORT CHUẨN XÁC
    const mockReport = {
      // 1. Lấy luôn item.id (chính là Date.now() dạng số nguyên) làm prId ảo
      prId: item.data.prId || item.id,
      cpId: item.data.cpId,
      cpName: scanData.cpName || item.data.cpCode || 'Khu vực (Đang Offline)',
      areaName: scanData.areaName || '',
      cpDescription: scanData.cpDescription || '',

      createdName: userData?.fullName || userData?.userName || 'Tôi (Đang Offline)',
      createdAt: item.data.createdAt || item.data.scanAt || new Date().toISOString(),
      prHasProblem: item.data.prHasProblem,
      prNote: item.data.prNote,
      isOfflineMock: true,

      // 2. Truyền nguyên mảng ảnh vào để trang AreaDetail đọc được ngay lập tức
      reportImages: item.data.images || []
    };

    await presentToast('Đã lưu vào hàng chờ. Sẽ tự động gửi khi có mạng.');

    store.commit('ADD_OFFLINE_REPORT', mockReport);
  };

  // --- Cơ chế đồng bộ ---
  const syncData = async (): Promise<void> => {
    // 5. CHECK MẠNG TỪ VUEX STORE
    if (isSyncing.value || !store.state.isOnline) {
      console.log("--- Bỏ qua lượt Sync: Hệ thống đang bận hoặc Offline ---");
      return;
    }

    isSyncing.value = true;
    console.log("--- BẮT ĐẦU TIẾN TRÌNH ĐỒNG BỘ ---");

    try {
      await loadPendingItems();

      if (pendingItems.value.length === 0) {
        return; // Sẽ nhảy xuống finally để reset isSyncing
      }

      const queue = [...pendingItems.value];

      for (const item of queue) {
        if (!store.state.isOnline) break;

        try {
          await uploadToServer(item);

          if (item.imageFiles && item.imageFiles.length > 0) {
            for (const fileName of item.imageFiles) {
              try {
                await ImageService.deleteImage(fileName);
              } catch (imgError) { }
            }
          }

          store.commit('REMOVE_OFFLINE_REPORT', item.id);

          const currentQueue: PendingItem[] = await storage.get('offline_api_queue') || [];
          const updatedQueue = currentQueue.filter(q => q.id !== item.id);
          await storage.set('offline_api_queue', updatedQueue);
          pendingItems.value = updatedQueue;

        } catch (error: any) {
          // 1. Lấy mã lỗi CHUẨN XÁC (Dành cho Axios hoặc Fetch)
          const statusCode = error.response?.status || error.status;

          if (statusCode === 400 || statusCode === 422) {
            // LỖI DO DATA SAI: Xóa hoàn toàn để không chặn đường các item khác
            console.error(`Dữ liệu sai (Lỗi ${statusCode}), loại bỏ vĩnh viễn item này.`);

            // A. Xóa báo cáo ảo trên Vuex
            store.commit('REMOVE_OFFLINE_REPORT', item.id);

            // B. Xóa ảnh vật lý (tránh rác bộ nhớ máy)
            if (item.imageFiles && item.imageFiles.length > 0) {
              for (const fileName of item.imageFiles) {
                try {
                  await ImageService.deleteImage(fileName);
                } catch (imgError) { }
              }
            }

            // C. Cập nhật lại SQLite (Xóa hẳn khỏi hàng chờ)
            const currentQueue: PendingItem[] = await storage.get('offline_api_queue') || [];
            const updatedQueue = currentQueue.filter(q => q.id !== item.id);
            await storage.set('offline_api_queue', updatedQueue);
            pendingItems.value = updatedQueue;

            // Tiếp tục vòng lặp for để đồng bộ các báo cáo khác
            continue;
          }
          else {
            // LỖI DO SERVER CHẾT (500, 502, 503, Timeout, rớt mạng giữa chừng...)
            console.error(`Server sập hoặc mất kết nối mạng ngầm:`, error);

            // Dừng vòng lặp ngay lập tức! Giữ nguyên SQLite và Vuex để chờ lát có mạng gửi lại
            break;
          }
        }
      }
    } catch (e) {
      console.error("Lỗi tổng quát trong tiến trình đồng bộ:", e);
    } finally {
      isSyncing.value = false;
      await loadPendingItems();
    }
  };

  const uploadToServer = async (item: PendingItem): Promise<any> => {
    console.log(item.data);
    return await PointReport.createPointReport(item.data);
  };

  return {
    // Trả về biến isOnline lấy từ Vuex để giao diện (nếu cần) xài chung luôn
    isOnline: computed(() => store.state.isOnline),
    isSyncing,
    pendingItems,
    sendData,
    loadPendingItems,
    syncData
  };
}