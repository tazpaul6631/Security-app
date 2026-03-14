import { ref, computed } from 'vue';
import storage from '@/services/storage.service';
import { ImageService } from '@/services/image.service';
import PointReport from '@/api/PointReport';
import PatrolShiftView from '@/api/PatrolShiftView';
import store from '@/composables/useVuex';
import { toastController } from '@ionic/vue';

const pendingItems = ref<PendingItem[]>([]);
const isSyncing = ref(false);
let isInternalProcessing = false;

interface PendingItem {
  id: string | number;
  url: string;
  data: any;
  imageFiles: string[];
}

export function useOfflineManager() {
  const presentToast = async (message: string, color: string = 'warning') => {
    const toast = await toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  };

  const loadPendingItems = async (): Promise<void> => {
    const data = await storage.get('offline_api_queue');
    pendingItems.value = (data as PendingItem[]) || [];
  };

  const removeQueueItem = async (id: string | number) => {
    const currentQueue: PendingItem[] = (await storage.get('offline_api_queue')) || [];
    const updatedQueue = currentQueue.filter((q) => q.id !== id);
    await storage.set('offline_api_queue', updatedQueue);
    pendingItems.value = updatedQueue;
  };

  // Hàm dọn dẹp tập trung: Xóa ảnh vật lý + Xóa Mock Vuex + Xóa Queue SQLite
  const cleanUpItem = async (item: PendingItem) => {
    // 1. Xóa ảnh trong máy
    if (item.imageFiles?.length > 0) {
      for (const fileName of item.imageFiles) {
        await ImageService.deleteImage(fileName).catch(() => { });
      }
    }
    // 2. Xóa báo cáo ảo (Mock) khỏi RAM
    store.commit('REMOVE_OFFLINE_REPORT', item.id);
    // 3. Xóa khỏi hàng chờ SQLite
    await removeQueueItem(item.id);
  };

  const sendData = async (url: string, data: any, imagesBase64: string[] = []): Promise<void> => {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
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

    if (store.state.isOnline) {
      try {
        const result = await PointReport.createPointReport(newItem.data);
        const realReport = result?.data?.data || result?.data || result;

        // Thành công: Xóa ảnh vật lý ngay
        for (const f of imageFiles) await ImageService.deleteImage(f).catch(() => { });

        if (realReport) {
          store.commit('ADD_OFFLINE_REPORT', realReport);
        }
      } catch (error) {
        console.warn("Gửi trực tiếp thất bại, chuyển vào hàng chờ...");
        await addToQueue(newItem);
      }
    } else {
      await addToQueue(newItem);
    }
  };

  const addToQueue = async (item: PendingItem): Promise<void> => {
    const queue: PendingItem[] = (await storage.get('offline_api_queue')) || [];
    queue.push(item);
    await storage.set('offline_api_queue', queue);
    await loadPendingItems();

    const actualUser: any = store.state.dataUser;
    const userData = actualUser?.data ? actualUser.data : actualUser;

    const mockReport = {
      psId: item.data.psId,
      prId: item.id,
      routeId: item.data.routeId,
      rdId: item.data.rdId,
      cpId: item.data.cpId,
      cpName: item.data.cpName || 'Điểm quét (Offline)',
      createdName: userData?.fullName || 'Tôi (Offline)',
      createdAt: item.data.createdAt || new Date().toISOString(),
      prHasProblem: item.data.prHasProblem,
      prNote: item.data.prNote,
      isOfflineMock: true,
      reportImages: []
    };

    await presentToast('Đã lưu vào hàng chờ. Sẽ tự động gửi khi có mạng.');
    store.commit('ADD_OFFLINE_REPORT', mockReport);
  };

  const syncData = async (): Promise<void> => {
    if (isInternalProcessing || !store.state.isOnline) return;

    isInternalProcessing = true;
    isSyncing.value = true;
    console.log("--- [START] BẮT ĐẦU ĐỒNG BỘ ---");

    try {
      await loadPendingItems();
      const queue = [...pendingItems.value];

      if (queue.length === 0) return;

      for (const item of queue) {
        if (!store.state.isOnline) break;

        // --- BƯỚC 1: XÁC ĐỊNH THỜI ĐIỂM GỐC CỦA DỮ LIỆU ---
        // Tuyệt đối không dùng new Date() (giờ hiện tại) để tránh lệch ca trực
        const originalTime = new Date(item.data.createdAt);

        let isAlreadyOnServer = false;
        const actualUser: any = store.state.dataUser;
        const userData = actualUser?.data ? actualUser.data : actualUser;
        try {
          const checkInfo = {
            psDay: originalTime.getDate(),
            psMonth: originalTime.getMonth() + 1,
            psYear: originalTime.getFullYear(),
            psHour: originalTime.getHours(), // Dùng giờ lúc quét
            areaId: item.data.areaId || userData?.userAreaId,
            isComplete: false
          };

          const res: any = await PatrolShiftView.postPatrolShiftView(checkInfo);
          const routes = Array.isArray(res.data) ? res.data : (res.data?.data || []);

          // Kiểm tra xem trong ca trực đó, điểm này đã được tích Status = 1 chưa
          isAlreadyOnServer = routes.some((r: any) =>
            r.routeDetails?.some((rd: any) =>
              String(rd.cpId) === String(item.data.cpId) && rd.status === 1
            )
          );
        } catch (e) {
          console.warn("Không thể kiểm tra trạng thái Server, thử gửi trực tiếp.");
        }

        // --- BƯỚC 2: XỬ LÝ GỬI HOẶC XÓA ---
        if (isAlreadyOnServer) {
          console.log(`[Sync] Điểm ${item.data.cpId} ca ${originalTime.getHours()}h đã có trên Server. Dọn dẹp Mock.`);
          await cleanUpItem(item);
          continue;
        }

        try {
          const result = await PointReport.createPointReport(item.data);
          const realReport = result?.data?.data || result?.data || result;

          // Xóa Mock và Queue trước khi thêm Data thật vào Vuex
          await cleanUpItem(item);

          if (realReport) {
            store.commit('ADD_OFFLINE_REPORT', realReport);
          }
        } catch (error: any) {
          const statusCode = error.response?.status || error.status;
          // Nếu lỗi dữ liệu (400) hoặc đã tồn tại trên DB (409/422), xóa bỏ item lỗi
          if (statusCode === 400 || statusCode === 422 || statusCode === 409) {
            await cleanUpItem(item);
          } else {
            console.error("Lỗi mạng/Server, dừng tiến trình Sync.");
            break;
          }
        }
      }
    } catch (e) {
      console.error("Lỗi tổng quát Sync:", e);
    } finally {
      await loadPendingItems();
      isInternalProcessing = false;
      isSyncing.value = false;
      console.log("--- [END] KẾT THÚC ĐỒNG BỘ ---");
    }
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