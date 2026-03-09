import { ref, computed } from 'vue';
import storage from '@/services/storage.service';
import { ImageService } from '@/services/image.service';
import PointReport from '@/api/PointReport';
import store from '@/composables/useVuex';
import { toastController } from '@ionic/vue';

// --- TRẠNG THÁI GLOBAL (Singleton) ---
// pendingItems và isSyncing dùng để hiển thị UI
const pendingItems = ref<PendingItem[]>([]);
const isSyncing = ref(false);

// BIẾN QUAN TRỌNG: Chặn vòng lặp logic (không gây re-render)
let isInternalProcessing = false;

const presentToast = async (message: string) => {
  const toast = await toastController.create({
    message: message,
    duration: 3000,
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

export function useOfflineManager() {

  const loadPendingItems = async (): Promise<void> => {
    const data = await storage.get('offline_api_queue');
    pendingItems.value = (data as PendingItem[]) || [];
  };

  const sendData = async (url: string, data: any, imagesBase64: string[] = []): Promise<void> => {
    const id = Date.now();
    const imageFiles: string[] = [];

    // Lưu ảnh vào bộ nhớ máy
    for (const base64 of imagesBase64) {
      try {
        const fileName = await ImageService.saveImage(base64);
        imageFiles.push(fileName);
      } catch (err) {
        console.error("Lỗi lưu ảnh vật lý:", err);
      }
    }

    const newItem: PendingItem = { id, url, data, imageFiles };

    // Kiểm tra mạng từ Vuex
    if (store.state.isOnline) {
      try {
        await uploadToServer(newItem);
        // Thành công: Xóa ảnh ngay
        for (const f of imageFiles) await ImageService.deleteImage(f);
      } catch (error) {
        console.warn("Gửi trực tiếp thất bại, chuyển vào hàng chờ...");
        await addToQueue(newItem);
      }
    } else {
      await addToQueue(newItem);
    }
  };

  const addToQueue = async (item: PendingItem): Promise<void> => {
    const queue: PendingItem[] = await storage.get('offline_api_queue') || [];
    queue.push(item);
    await storage.set('offline_api_queue', queue);
    await loadPendingItems();

    // Cập nhật UI ngay lập tức bằng báo cáo ảo
    const actualUser: any = store.state.dataUser;
    const userData = actualUser?.data ? actualUser.data : actualUser;
    const scanData: any = store.state.dataScanQr || {};

    const mockReport = {
      psId: item.data.psId,
      prId: item.id,
      routeId: item.data.routeId,
      rdId: item.data.rdId,
      cpId: item.data.cpId,
      cpName: scanData.cpName || item.data.cpCode || 'Khu vực (Đang Offline)',
      createdName: userData?.fullName || 'Tôi (Offline)',
      createdAt: item.data.createdAt || new Date().toISOString(),
      prHasProblem: item.data.prHasProblem,
      prNote: item.data.prNote,
      isOfflineMock: true,
      reportImages: item.data.images || []
    };

    await presentToast('Đã lưu vào hàng chờ. Sẽ tự động gửi khi có mạng.');
    store.commit('ADD_OFFLINE_REPORT', mockReport);
  };

  // --- TIẾN TRÌNH ĐỒNG BỘ CHÍNH ---
  const syncData = async (): Promise<void> => {
    // 1. CHẶN TRÙNG LẶP: Nếu đang chạy hoặc mất mạng thì thoát ngay
    if (isInternalProcessing || !store.state.isOnline) {
      return;
    }

    // 2. KHÓA TIẾN TRÌNH
    isInternalProcessing = true;
    isSyncing.value = true;
    console.log("--- [START] BẮT ĐẦU TIẾN TRÌNH ĐỒNG BỘ ---");

    try {
      await loadPendingItems();
      if (pendingItems.value.length === 0) {
        console.log("--- Hàng chờ trống, dừng Sync ---");
        return;
      }

      // Tạo bản sao queue để xử lý
      const queue = [...pendingItems.value];

      for (const item of queue) {
        // Kiểm tra mạng lại trong từng vòng lặp (đề phòng rớt mạng giữa chừng)
        if (!store.state.isOnline) break;

        try {
          await uploadToServer(item);

          // Thành công: Xóa ảnh vật lý
          if (item.imageFiles?.length > 0) {
            for (const fileName of item.imageFiles) {
              await ImageService.deleteImage(fileName).catch(() => { });
            }
          }

          // Xóa khỏi Vuex và Storage
          store.commit('REMOVE_OFFLINE_REPORT', item.id);
          const currentQueue: PendingItem[] = await storage.get('offline_api_queue') || [];
          const updatedQueue = currentQueue.filter(q => q.id !== item.id);
          await storage.set('offline_api_queue', updatedQueue);

          // Cập nhật state nội bộ để UI biết đã xử lý xong 1 item
          pendingItems.value = updatedQueue;

        } catch (error: any) {
          const statusCode = error.response?.status || error.status;

          if (statusCode === 400 || statusCode === 422) {
            console.error(`Dữ liệu sai (Lỗi ${statusCode}), xóa bỏ item:`, item.id);
            store.commit('REMOVE_OFFLINE_REPORT', item.id);

            const currentQueue: PendingItem[] = await storage.get('offline_api_queue') || [];
            const updatedQueue = currentQueue.filter(q => q.id !== item.id);
            await storage.set('offline_api_queue', updatedQueue);
            pendingItems.value = updatedQueue;
            continue;
          } else {
            // Lỗi hệ thống/mạng: Dừng vòng lặp để lần sau thử lại
            console.error(`Lỗi kết nối Server, tạm dừng Sync.`);
            break;
          }
        }
      }
    } catch (e) {
      console.error("Lỗi tổng quát Sync:", e);
    } finally {
      // 3. GIẢI PHÓNG KHÓA
      isInternalProcessing = false;
      isSyncing.value = false;
      await loadPendingItems();
      console.log("--- [END] KẾT THÚC TIẾN TRÌNH ĐỒNG BỘ ---");
    }
  };

  const uploadToServer = async (item: PendingItem): Promise<any> => {
    return await PointReport.createPointReport(item.data);
  };

  return {
    isOnline: computed(() => store.state.isOnline),
    isSyncing,
    pendingItems,
    sendData,
    loadPendingItems,
    syncData
  };
}